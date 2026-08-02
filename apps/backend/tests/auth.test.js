const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { resetDb, disconnect, prisma } = require('./helpers/db');
const {
  api,
  auth,
  createUniversity,
  createProgram,
  requestAndVerifyOtp,
  registerAdmin,
  registerStudent,
} = require('./helpers/factories');

beforeEach(resetDb);
after(disconnect);

describe('POST /api/auth/register/admin', () => {
  test('creates an admin and returns a token', async () => {
    const university = await createUniversity();
    const { res, user, token } = await registerAdmin(university.id);

    assert.equal(res.status, 201);
    assert.equal(user.role, 'ADMIN');
    assert.equal(user.universityId, university.id);
    assert.ok(token);
  });

  test('never returns the password hash', async () => {
    const university = await createUniversity();
    const { user } = await registerAdmin(university.id);

    assert.equal(user.passwordHash, undefined);
  });

  test('stores the password hashed, not in plain text', async () => {
    const university = await createUniversity();
    const { user } = await registerAdmin(university.id);

    const stored = await prisma.user.findUnique({ where: { id: user.id } });
    assert.notEqual(stored.passwordHash, 'secret123');
    assert.ok(stored.passwordHash.startsWith('$2'));
  });

  test('rejects missing fields with 400', async () => {
    const res = await api().post('/api/auth/register/admin').send({ email: 'a@b.com' });
    assert.equal(res.status, 400);
  });

  test('rejects a duplicate email with 409', async () => {
    const university = await createUniversity();
    const { user } = await registerAdmin(university.id);

    // Re-verifying the same email is allowed at the OTP layer — the conflict
    // only surfaces once registration itself hits the unique email constraint.
    const verificationToken = await requestAndVerifyOtp(user.email);
    const res = await api().post('/api/auth/register/admin').send({
      verificationToken,
      email: user.email,
      password: 'secret123',
      name: 'Someone Else',
    });

    assert.equal(res.status, 409);
  });

  test('rejects a missing verificationToken with 400', async () => {
    const res = await api().post('/api/auth/register/admin').send({
      email: 'nobody@test.edu',
      password: 'secret123',
      name: 'Nobody',
    });

    assert.equal(res.status, 400);
  });

  test('rejects a garbage verificationToken with 400', async () => {
    const res = await api().post('/api/auth/register/admin').send({
      verificationToken: 'not-a-real-token',
      email: 'nobody@test.edu',
      password: 'secret123',
      name: 'Nobody',
    });

    assert.equal(res.status, 400);
  });

  test('rejects a verificationToken issued for a different email with 400', async () => {
    const university = await createUniversity();
    const email = `owner-${Date.now()}@${university.domain}`;
    const verificationToken = await requestAndVerifyOtp(email);

    const res = await api().post('/api/auth/register/admin').send({
      verificationToken,
      email: `someone-else-${Date.now()}@${university.domain}`,
      password: 'secret123',
      name: 'Impersonator',
    });

    assert.equal(res.status, 400);
  });
});

describe('POST /api/auth/register/student', () => {
  test('creates the user and their profile together', async () => {
    const university = await createUniversity();
    const program = await createProgram();
    const { res, user } = await registerStudent(university.id, program.id, { cgpa: 7.25 });

    assert.equal(res.status, 201);
    assert.equal(user.role, 'STUDENT');

    const profile = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
    assert.ok(profile, 'student profile should exist');
    assert.equal(Number(profile.cgpa), 7.25);
    assert.equal(profile.placementLocked, false);
  });

  test('does not leave an orphan user when the profile fails', async () => {
    const university = await createUniversity();
    const email = `orphan-${Date.now()}@${university.domain}`;
    const verificationToken = await requestAndVerifyOtp(email);

    const res = await api().post('/api/auth/register/student').send({
      verificationToken,
      programId: '00000000-0000-0000-0000-000000000000',
      email,
      password: 'secret123',
      name: 'Orphan',
      cgpa: 8,
    });

    assert.equal(res.status, 400);

    // The whole registration runs in one transaction — a bad programId must
    // roll the user back too, otherwise the email is burned but unusable.
    const user = await prisma.user.findUnique({ where: { email } });
    assert.equal(user, null);
  });
});

describe('POST /api/auth/login', () => {
  test('returns a token for valid credentials', async () => {
    const university = await createUniversity();
    const { user } = await registerAdmin(university.id);

    const res = await api()
      .post('/api/auth/login')
      .send({ email: user.email, password: 'secret123' });

    assert.equal(res.status, 200);
    assert.ok(res.body.token);
  });

  test('rejects a wrong password with 401', async () => {
    const university = await createUniversity();
    const { user } = await registerAdmin(university.id);

    const res = await api().post('/api/auth/login').send({ email: user.email, password: 'nope' });

    assert.equal(res.status, 401);
  });

  test('gives the same error for unknown email as for wrong password', async () => {
    const university = await createUniversity();
    const { user } = await registerAdmin(university.id);

    const wrongPassword = await api()
      .post('/api/auth/login')
      .send({ email: user.email, password: 'nope' });
    const unknownEmail = await api()
      .post('/api/auth/login')
      .send({ email: 'ghost@test.edu', password: 'secret123' });

    // Identical responses, so the endpoint can't be used to enumerate accounts.
    assert.equal(unknownEmail.status, wrongPassword.status);
    assert.deepEqual(unknownEmail.body, wrongPassword.body);
  });
});

describe('GET /api/auth/me', () => {
  test('returns the caller with a valid token', async () => {
    const university = await createUniversity();
    const { token, user } = await registerAdmin(university.id);

    const res = await api().get('/api/auth/me').set(...auth(token));

    assert.equal(res.status, 200);
    assert.equal(res.body.id, user.id);
    assert.equal(res.body.passwordHash, undefined);
  });

  test('rejects a missing token with 401', async () => {
    const res = await api().get('/api/auth/me');
    assert.equal(res.status, 401);
  });

  test('rejects a malformed token with 401', async () => {
    const res = await api().get('/api/auth/me').set('Authorization', 'Bearer garbage');
    assert.equal(res.status, 401);
  });

  test('rejects a token signed with the wrong secret with 401', async () => {
    const jwt = require('jsonwebtoken');
    const forged = jwt.sign({ sub: 'x', role: 'ADMIN' }, 'not-the-real-secret');

    const res = await api().get('/api/auth/me').set('Authorization', `Bearer ${forged}`);

    assert.equal(res.status, 401);
  });
});
