const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { resetDb, disconnect } = require('./helpers/db');
const {
  api,
  auth,
  createUniversity,
  createCompany,
  createDrive,
  registerAdmin,
  registerStudent,
  seedScenario,
} = require('./helpers/factories');

beforeEach(resetDb);
after(disconnect);

const applyTo = (driveId, token, body = { responses: { q: 'a' } }) =>
  api()
    .post(`/api/drives/${driveId}/applications`)
    .set(...auth(token))
    .send(body);

describe('applying to a drive', () => {
  test('a student can apply to an OPEN drive', async () => {
    const { student, drive } = await seedScenario();

    const res = await applyTo(drive.id, student.token, {
      responses: { why: 'interested' },
      resumeUrl: 'https://example.com/cv.pdf',
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.status, 'APPLIED');
    assert.equal(res.body.driveId, drive.id);
    assert.deepEqual(res.body.responses, { why: 'interested' });
  });

  test('applying twice returns 409', async () => {
    const { student, drive } = await seedScenario();

    await applyTo(drive.id, student.token);
    const second = await applyTo(drive.id, student.token);

    assert.equal(second.status, 409);
  });

  test('cannot apply to a DRAFT drive', async () => {
    const { student, drive } = await seedScenario({ drive: { status: 'DRAFT' } });

    const res = await applyTo(drive.id, student.token);

    assert.equal(res.status, 400);
  });

  test('cannot apply to a CLOSED drive', async () => {
    const { student, drive } = await seedScenario({ drive: { status: 'CLOSED' } });

    const res = await applyTo(drive.id, student.token);

    assert.equal(res.status, 400);
  });

  test('rejects a missing responses payload with 400', async () => {
    const { student, drive } = await seedScenario();

    const res = await applyTo(drive.id, student.token, {});

    assert.equal(res.status, 400);
  });

  test('an admin cannot apply', async () => {
    const { admin, drive } = await seedScenario();

    const res = await applyTo(drive.id, admin.token);

    assert.equal(res.status, 403);
  });

  test('cannot apply to another university drive', async () => {
    const { student } = await seedScenario();
    const other = await createUniversity();
    const otherCompany = await createCompany();
    const foreignDrive = await createDrive(other.id, otherCompany.id, { status: 'OPEN' });

    const res = await applyTo(foreignDrive.id, student.token);

    assert.equal(res.status, 404);
  });
});

describe('GET /api/drives/:id/applications (admin roster)', () => {
  test('returns applicants with their profile details', async () => {
    const { admin, student, drive } = await seedScenario();
    await applyTo(drive.id, student.token);

    const res = await api()
      .get(`/api/drives/${drive.id}/applications`)
      .set(...auth(admin.token));

    assert.equal(res.status, 200);
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].studentProfile.user.email, student.user.email);
    assert.ok(res.body[0].studentProfile.program);
  });

  test('does not expose applicant password hashes', async () => {
    const { admin, student, drive } = await seedScenario();
    await applyTo(drive.id, student.token);

    const res = await api()
      .get(`/api/drives/${drive.id}/applications`)
      .set(...auth(admin.token));

    assert.equal(res.body[0].studentProfile.user.passwordHash, undefined);
  });

  test('is forbidden to students', async () => {
    const { student, drive } = await seedScenario();

    const res = await api()
      .get(`/api/drives/${drive.id}/applications`)
      .set(...auth(student.token));

    assert.equal(res.status, 403);
  });
});

describe('GET /api/applications/me', () => {
  test('returns only the caller applications', async () => {
    const { university, program, student, drive } = await seedScenario();
    const other = await registerStudent(university.id, program.id);

    await applyTo(drive.id, student.token);
    await applyTo(drive.id, other.token);

    const res = await api()
      .get('/api/applications/me')
      .set(...auth(student.token));

    assert.equal(res.status, 200);
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].studentProfileId, student.user.id);
    assert.ok(res.body[0].drive.company, 'drive and company should be included');
  });

  test('is forbidden to admins', async () => {
    const { admin } = await seedScenario();

    const res = await api()
      .get('/api/applications/me')
      .set(...auth(admin.token));

    assert.equal(res.status, 403);
  });
});

describe('GET /api/applications/:id', () => {
  test('the owning student can read it', async () => {
    const { student, drive } = await seedScenario();
    const created = await applyTo(drive.id, student.token);

    const res = await api()
      .get(`/api/applications/${created.body.id}`)
      .set(...auth(student.token));

    assert.equal(res.status, 200);
  });

  test('an admin of the same university can read it', async () => {
    const { admin, student, drive } = await seedScenario();
    const created = await applyTo(drive.id, student.token);

    const res = await api()
      .get(`/api/applications/${created.body.id}`)
      .set(...auth(admin.token));

    assert.equal(res.status, 200);
  });

  test('another student in the same university cannot read it', async () => {
    const { university, program, student, drive } = await seedScenario();
    const nosy = await registerStudent(university.id, program.id);
    const created = await applyTo(drive.id, student.token);

    const res = await api()
      .get(`/api/applications/${created.body.id}`)
      .set(...auth(nosy.token));

    assert.equal(res.status, 403);
  });

  test('an admin from another university gets 404, not 403', async () => {
    const { student, drive } = await seedScenario();
    const created = await applyTo(drive.id, student.token);

    const other = await createUniversity();
    const foreignAdmin = await registerAdmin(other.id);

    const res = await api()
      .get(`/api/applications/${created.body.id}`)
      .set(...auth(foreignAdmin.token));

    // 404 rather than 403 so the response can't confirm the record exists.
    assert.equal(res.status, 404);
  });
});

describe('PATCH /api/applications/:id/status', () => {
  test('an admin can advance an application through the pipeline', async () => {
    const { admin, student, drive } = await seedScenario();
    const created = await applyTo(drive.id, student.token);

    const res = await api()
      .patch(`/api/applications/${created.body.id}/status`)
      .set(...auth(admin.token))
      .send({ status: 'SHORTLISTED' });

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'SHORTLISTED');
  });

  test('can set interview slot and venue in the same call', async () => {
    const { admin, student, drive } = await seedScenario();
    const created = await applyTo(drive.id, student.token);

    const res = await api()
      .patch(`/api/applications/${created.body.id}/status`)
      .set(...auth(admin.token))
      .send({
        status: 'INTERVIEW',
        interviewSlot: '2026-09-01T10:00:00.000Z',
        interviewVenue: 'Room 204',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.interviewVenue, 'Room 204');
    assert.equal(new Date(res.body.interviewSlot).toISOString(), '2026-09-01T10:00:00.000Z');
  });

  test('rejects an invalid status with 400', async () => {
    const { admin, student, drive } = await seedScenario();
    const created = await applyTo(drive.id, student.token);

    const res = await api()
      .patch(`/api/applications/${created.body.id}/status`)
      .set(...auth(admin.token))
      .send({ status: 'NOT_A_STATUS' });

    assert.equal(res.status, 400);
  });

  test('is forbidden to students', async () => {
    const { student, drive } = await seedScenario();
    const created = await applyTo(drive.id, student.token);

    const res = await api()
      .patch(`/api/applications/${created.body.id}/status`)
      .set(...auth(student.token))
      .send({ status: 'SELECTED' });

    assert.equal(res.status, 403);
  });
});
