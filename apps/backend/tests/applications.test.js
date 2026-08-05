const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { resetDb, disconnect, prisma } = require('./helpers/db');
const {
  api,
  auth,
  createUniversity,
  createProgram,
  createCompany,
  createDrive,
  createDriveRole,
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

describe('applying to a drive with roles', () => {
  test('requires rolePreferences when the drive has roles', async () => {
    const { student, drive } = await seedScenario();
    await createDriveRole(drive.id);

    const res = await applyTo(drive.id, student.token, { responses: {} });

    assert.equal(res.status, 400);
  });

  test('accepts a ranked list and stores it in order', async () => {
    const { student, drive } = await seedScenario();
    const first = await createDriveRole(drive.id, { title: 'First choice' });
    const second = await createDriveRole(drive.id, {
      title: 'Second choice',
      offerType: 'INTERNSHIP',
      ctcAmount: undefined,
      stipendAmount: 20000,
    });

    const res = await applyTo(drive.id, student.token, {
      responses: {},
      rolePreferences: [second.id, first.id],
    });

    assert.equal(res.status, 201);

    const preferences = await prisma.applicationRolePreference.findMany({
      where: { applicationId: res.body.id },
      orderBy: { rank: 'asc' },
    });
    assert.equal(preferences.length, 2);
    assert.equal(preferences[0].driveRoleId, second.id);
    assert.equal(preferences[0].rank, 1);
    assert.equal(preferences[1].driveRoleId, first.id);
    assert.equal(preferences[1].rank, 2);
  });

  test('rejects duplicate role ids in the preference list', async () => {
    const { student, drive } = await seedScenario();
    const role = await createDriveRole(drive.id);

    const res = await applyTo(drive.id, student.token, {
      responses: {},
      rolePreferences: [role.id, role.id],
    });

    assert.equal(res.status, 400);
  });

  test('rejects a role id that does not belong to the drive', async () => {
    const { student, drive, university, company } = await seedScenario();
    const otherDrive = await createDrive(university.id, company.id, { status: 'OPEN' });
    const foreignRole = await createDriveRole(otherDrive.id);

    const res = await applyTo(drive.id, student.token, {
      responses: {},
      rolePreferences: [foreignRole.id],
    });

    assert.equal(res.status, 400);
  });

  test('a drive with no roles does not require rolePreferences', async () => {
    const { student, drive } = await seedScenario();

    const res = await applyTo(drive.id, student.token, { responses: {} });

    assert.equal(res.status, 201);
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

  test('rejects an interview slot/venue when the status is not OA/Test or Interview', async () => {
    const { admin, student, drive } = await seedScenario();
    const created = await applyTo(drive.id, student.token);

    const res = await api()
      .patch(`/api/applications/${created.body.id}/status`)
      .set(...auth(admin.token))
      .send({
        status: 'SHORTLISTED',
        interviewSlot: '2026-09-01T10:00:00.000Z',
      });

    assert.equal(res.status, 400);
  });

  test('rejects moving to Interview with no slot ever set', async () => {
    const { admin, student, drive } = await seedScenario();
    const created = await applyTo(drive.id, student.token);

    const res = await api()
      .patch(`/api/applications/${created.body.id}/status`)
      .set(...auth(admin.token))
      .send({ status: 'INTERVIEW' });

    assert.equal(res.status, 400);
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

describe('PATCH /api/drives/:driveId/applications/interview-schedule (global apply toggle)', () => {
  const scheduleFor = (driveId, token, body) =>
    api()
      .patch(`/api/drives/${driveId}/applications/interview-schedule`)
      .set(...auth(token))
      .send(body);

  test('applies the same slot and venue to every listed application', async () => {
    const { university, program, admin, student, drive } = await seedScenario();
    const other = await registerStudent(university.id, program.id);
    const first = await applyTo(drive.id, student.token);
    const second = await applyTo(drive.id, other.token);

    const res = await scheduleFor(drive.id, admin.token, {
      applicationIds: [first.body.id, second.body.id],
      interviewSlot: '2026-09-01T10:00:00.000Z',
      interviewVenue: 'Room 204',
      status: 'OA_TEST',
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.length, 2);
    for (const application of res.body) {
      assert.equal(application.interviewVenue, 'Room 204');
      assert.equal(new Date(application.interviewSlot).toISOString(), '2026-09-01T10:00:00.000Z');
    }
  });

  test('does not change status when status is omitted', async () => {
    const { admin, student, drive } = await seedScenario();
    const created = await applyTo(drive.id, student.token);

    await scheduleFor(drive.id, admin.token, {
      applicationIds: [created.body.id],
      interviewSlot: '2026-09-01T10:00:00.000Z',
      status: 'OA_TEST',
    });

    const res = await scheduleFor(drive.id, admin.token, {
      applicationIds: [created.body.id],
      interviewVenue: 'Room 204',
    });

    assert.equal(res.status, 200);
    assert.equal(res.body[0].status, 'OA_TEST');
    assert.equal(res.body[0].interviewVenue, 'Room 204');
  });

  test('rejects setting interview slot/venue for a status outside OA/Test or Interview', async () => {
    const { admin, student, drive } = await seedScenario();
    const created = await applyTo(drive.id, student.token);

    const res = await scheduleFor(drive.id, admin.token, {
      applicationIds: [created.body.id],
      interviewVenue: 'Room 204',
    });

    assert.equal(res.status, 400);
  });

  test('rejects if any applicationId does not belong to this drive, applying nothing', async () => {
    const { university, admin, student, drive } = await seedScenario();
    const created = await applyTo(drive.id, student.token);

    const otherCompany = await createCompany();
    const otherDrive = await createDrive(university.id, otherCompany.id, { status: 'OPEN' });
    const otherProgram = await createProgram();
    const otherStudent = await registerStudent(university.id, otherProgram.id);
    const foreign = await applyTo(otherDrive.id, otherStudent.token);

    const res = await scheduleFor(drive.id, admin.token, {
      applicationIds: [created.body.id, foreign.body.id],
      interviewVenue: 'Room 204',
    });

    assert.equal(res.status, 400);

    const unchanged = await api()
      .get(`/api/applications/${created.body.id}`)
      .set(...auth(admin.token));
    assert.equal(unchanged.body.interviewVenue, null, 'the valid id must not have been updated either');
  });

  test('rejects an empty applicationIds array with 400', async () => {
    const { admin, drive } = await seedScenario();

    const res = await scheduleFor(drive.id, admin.token, { applicationIds: [] });

    assert.equal(res.status, 400);
  });

  test('rejects when neither interviewSlot nor interviewVenue is given', async () => {
    const { admin, student, drive } = await seedScenario();
    const created = await applyTo(drive.id, student.token);

    const res = await scheduleFor(drive.id, admin.token, { applicationIds: [created.body.id] });

    assert.equal(res.status, 400);
  });

  test('is forbidden to students', async () => {
    const { student, drive } = await seedScenario();
    const created = await applyTo(drive.id, student.token);

    const res = await scheduleFor(drive.id, student.token, {
      applicationIds: [created.body.id],
      interviewVenue: 'Room 204',
    });

    assert.equal(res.status, 403);
  });

  test('bulk-updates status for every listed application', async () => {
    const { university, program, admin, student, drive } = await seedScenario();
    const other = await registerStudent(university.id, program.id);
    const first = await applyTo(drive.id, student.token);
    const second = await applyTo(drive.id, other.token);

    const res = await scheduleFor(drive.id, admin.token, {
      applicationIds: [first.body.id, second.body.id],
      status: 'SHORTLISTED',
    });

    assert.equal(res.status, 200);
    for (const application of res.body) {
      assert.equal(application.status, 'SHORTLISTED');
    }
  });

  test('rejects bulk-selecting — SELECTED needs a per-applicant role choice', async () => {
    const { admin, student, drive } = await seedScenario();
    const created = await applyTo(drive.id, student.token);

    const res = await scheduleFor(drive.id, admin.token, {
      applicationIds: [created.body.id],
      status: 'SELECTED',
    });

    assert.equal(res.status, 400);
  });

  test('rejects a bulk status change touching an already-Selected applicant', async () => {
    const { admin, student, drive } = await seedScenario();
    const created = await applyTo(drive.id, student.token);
    await api()
      .patch(`/api/applications/${created.body.id}/status`)
      .set(...auth(admin.token))
      .send({ status: 'SELECTED' });

    const res = await scheduleFor(drive.id, admin.token, {
      applicationIds: [created.body.id],
      status: 'NOT_SELECTED',
    });

    assert.equal(res.status, 400);
  });

  test('rejects an invalid status value', async () => {
    const { admin, student, drive } = await seedScenario();
    const created = await applyTo(drive.id, student.token);

    const res = await scheduleFor(drive.id, admin.token, {
      applicationIds: [created.body.id],
      status: 'BOGUS',
    });

    assert.equal(res.status, 400);
  });
});
