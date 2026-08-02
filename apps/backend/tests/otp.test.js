// Email-domain-based OTP verification (plan §3): a code is only sendable for
// a domain that maps to a *verified* university, and registration derives
// universityId from the resulting token rather than trusting a client field.
const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { resetDb, disconnect, prisma } = require('./helpers/db');
const mailer = require('../src/lib/mailer');
const { api, createUniversity, requestAndVerifyOtp } = require('./helpers/factories');

beforeEach(resetDb);
after(disconnect);

const requestOtp = (email) => api().post('/api/auth/otp/request').send({ email });
const verifyOtp = (email, code) => api().post('/api/auth/otp/verify').send({ email, code });

const lastCode = () => mailer.getLastTestMessage().text.match(/\d{6}/)[0];

describe('POST /api/auth/otp/request', () => {
  test('sends a code for a verified university domain', async () => {
    const university = await createUniversity();

    const res = await requestOtp(`someone@${university.domain}`);

    assert.equal(res.status, 200);
    assert.match(mailer.getLastTestMessage().text, /\d{6}/);
  });

  test('rejects an email with no matching university domain', async () => {
    const res = await requestOtp('someone@nowhere.invalid');
    assert.equal(res.status, 400);
  });

  test('rejects a domain belonging to an unverified university', async () => {
    const university = await createUniversity({ verified: false });

    const res = await requestOtp(`someone@${university.domain}`);

    assert.equal(res.status, 403);
  });

  test('rejects a resend within the cooldown window', async () => {
    const university = await createUniversity();
    const email = `someone@${university.domain}`;

    await requestOtp(email);
    const res = await requestOtp(email);

    assert.equal(res.status, 400);
    assert.match(res.body.error, /wait/i);
  });

  test('rejects a missing email with 400', async () => {
    const res = await requestOtp();
    assert.equal(res.status, 400);
  });
});

describe('POST /api/auth/otp/verify', () => {
  test('returns a verificationToken for the correct code', async () => {
    const university = await createUniversity();
    const email = `someone@${university.domain}`;
    await requestOtp(email);

    const res = await verifyOtp(email, lastCode());

    assert.equal(res.status, 200);
    assert.ok(res.body.verificationToken);
  });

  test('rejects a wrong code with 400', async () => {
    const university = await createUniversity();
    const email = `someone@${university.domain}`;
    await requestOtp(email);

    const res = await verifyOtp(email, '000000');

    assert.equal(res.status, 400);
  });

  test('rejects verifying with no code ever requested', async () => {
    const university = await createUniversity();
    const res = await verifyOtp(`nobody@${university.domain}`, '123456');
    assert.equal(res.status, 400);
  });

  test('locks out after too many wrong attempts', async () => {
    const university = await createUniversity();
    const email = `someone@${university.domain}`;
    await requestOtp(email);

    for (let i = 0; i < 5; i += 1) {
      await verifyOtp(email, '000000');
    }
    // The correct code, submitted only after 5 wrong attempts, must still fail.
    const res = await verifyOtp(email, lastCode());

    assert.equal(res.status, 400);
    assert.match(res.body.error, /too many attempts/i);
  });

  test('rejects an already-consumed code', async () => {
    const university = await createUniversity();
    const email = `someone@${university.domain}`;
    await requestOtp(email);
    const code = lastCode();

    await verifyOtp(email, code);
    const res = await verifyOtp(email, code);

    assert.equal(res.status, 400);
  });

  test('rejects an expired code', async () => {
    const university = await createUniversity();
    const email = `someone@${university.domain}`;
    await requestOtp(email);
    const code = lastCode();

    await prisma.emailOtp.update({
      where: { email },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await verifyOtp(email, code);

    assert.equal(res.status, 400);
  });

  test('a fresh request after a consumed code is not blocked by the cooldown', async () => {
    const university = await createUniversity();
    const email = `someone@${university.domain}`;
    await requestOtp(email);
    await verifyOtp(email, lastCode());

    const res = await requestOtp(email);

    assert.equal(res.status, 200);
  });
});

describe('registration requires a valid, matching verificationToken', () => {
  test('a token issued for a different email is rejected', async () => {
    const university = await createUniversity();
    const ownerEmail = `owner@${university.domain}`;
    const verificationToken = await requestAndVerifyOtp(ownerEmail);

    const res = await api()
      .post('/api/auth/register/admin')
      .send({
        verificationToken,
        email: `attacker@${university.domain}`,
        password: 'secret123',
        name: 'Attacker',
      });

    assert.equal(res.status, 400);
  });

  test('an expired verificationToken is rejected', async () => {
    const university = await createUniversity();
    const email = `someone@${university.domain}`;
    const jwt = require('jsonwebtoken');
    const expiredToken = jwt.sign(
      { email, universityId: university.id, purpose: 'registration' },
      process.env.JWT_SECRET,
      { expiresIn: -10 }
    );

    const res = await api().post('/api/auth/register/admin').send({
      verificationToken: expiredToken,
      email,
      password: 'secret123',
      name: 'Someone',
    });

    assert.equal(res.status, 400);
  });

  test('registration trusts the universityId embedded in the token, not a fresh domain lookup', async () => {
    const university = await createUniversity();
    const otherUniversity = await createUniversity();
    const email = `someone@${university.domain}`;
    const jwt = require('jsonwebtoken');
    // Only the server ever signs this token (in otp.service.js verifyOtp) —
    // this test just pins down that resolveRegistration reads universityId
    // straight off the verified payload rather than re-deriving it from the
    // email's domain a second time at registration.
    const token = jwt.sign(
      { email, universityId: otherUniversity.id, purpose: 'registration' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const res = await api().post('/api/auth/register/admin').send({
      verificationToken: token,
      email,
      password: 'secret123',
      name: 'Someone',
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.user.universityId, otherUniversity.id);
  });
});
