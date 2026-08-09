const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { resetDb, disconnect, prisma } = require('./helpers/db');
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
const { autoCloseDueDrives } = require('../src/jobs/autoCloseDispatcher');

beforeEach(resetDb);
after(disconnect);

describe('GET /api/drives', () => {
  test('requires authentication', async () => {
    const res = await api().get('/api/drives');
    assert.equal(res.status, 401);
  });

  test('lists drives for the caller university', async () => {
    const { admin, drive } = await seedScenario();

    const res = await api().get('/api/drives').set(...auth(admin.token));

    assert.equal(res.status, 200);
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].id, drive.id);
    assert.ok(res.body[0].company, 'company should be included');
  });

  test('never leaks drives from another university', async () => {
    const mine = await seedScenario();

    // A second university with its own drive.
    const other = await createUniversity();
    const otherCompany = await createCompany();
    await createDrive(other.id, otherCompany.id, { status: 'OPEN' });

    const res = await api().get('/api/drives').set(...auth(mine.admin.token));

    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].universityId, mine.university.id);
  });

  test('scoping follows the token, not a client-supplied university', async () => {
    const mine = await seedScenario();
    const other = await createUniversity();
    const otherCompany = await createCompany();
    const foreignDrive = await createDrive(other.id, otherCompany.id, { status: 'OPEN' });

    // Asking for someone else's drive by id must 404, not 403 — a 403 would
    // confirm the record exists.
    const res = await api().get(`/api/drives/${foreignDrive.id}`).set(...auth(mine.admin.token));

    assert.equal(res.status, 404);
  });

  test('includes results in the list once declared, and omits them otherwise', async () => {
    const { admin, student, drive } = await seedScenario({ drive: { status: 'OPEN' } });
    const applied = await api()
      .post(`/api/drives/${drive.id}/applications`)
      .set(...auth(student.token))
      .send({ responses: {} });
    await api()
      .patch(`/api/applications/${applied.body.id}/status`)
      .set(...auth(admin.token))
      .send({ status: 'SELECTED' });
    await api()
      .patch(`/api/drives/${drive.id}/status`)
      .set(...auth(admin.token))
      .send({ status: 'CLOSED' });

    const beforeDeclare = await api().get('/api/drives').set(...auth(student.token));
    assert.equal(beforeDeclare.body[0].results, undefined);

    await api().patch(`/api/drives/${drive.id}/declare-results`).set(...auth(admin.token));

    const afterDeclare = await api().get('/api/drives').set(...auth(student.token));
    assert.equal(afterDeclare.body[0].results.length, 1);
    assert.equal(afterDeclare.body[0].results[0].name, 'Test Student');
  });

  test('hides DRAFT drives from a student, but an admin still sees them', async () => {
    const { admin, student, university, company } = await seedScenario();
    await createDrive(university.id, company.id, { status: 'DRAFT' });

    const studentRes = await api().get('/api/drives').set(...auth(student.token));
    assert.equal(studentRes.body.length, 1);
    assert.equal(studentRes.body[0].status, 'OPEN');

    const adminRes = await api().get('/api/drives').set(...auth(admin.token));
    assert.equal(adminRes.body.length, 2);
  });

  test('404s a student fetching a DRAFT drive directly by id', async () => {
    const { admin, student, university, company } = await seedScenario();
    const draft = await createDrive(university.id, company.id, { status: 'DRAFT' });

    const studentRes = await api().get(`/api/drives/${draft.id}`).set(...auth(student.token));
    assert.equal(studentRes.status, 404);

    const adminRes = await api().get(`/api/drives/${draft.id}`).set(...auth(admin.token));
    assert.equal(adminRes.status, 200);
  });
});

describe('POST /api/drives', () => {
  const oneRole = [
    { title: 'SDE Intern', offerType: 'INTERNSHIP', description: 'Build things', stipendAmount: 25000 },
  ];

  test('lets an admin create a drive, defaulting to DRAFT', async () => {
    const university = await createUniversity();
    const company = await createCompany();
    const admin = await registerAdmin(university.id);

    const res = await api()
      .post('/api/drives')
      .set(...auth(admin.token))
      .send({ companyId: company.id, title: 'SDE Intern', roles: oneRole });

    assert.equal(res.status, 201);
    assert.equal(res.body.status, 'DRAFT');
    assert.equal(res.body.universityId, university.id);
    assert.equal(res.body.roles.length, 1);
    assert.equal(res.body.roles[0].title, 'SDE Intern');
  });

  test('forbids a student from creating a drive', async () => {
    const { student, company } = await seedScenario();

    const res = await api()
      .post('/api/drives')
      .set(...auth(student.token))
      .send({ companyId: company.id, title: 'Nope', roles: oneRole });

    assert.equal(res.status, 403);
  });

  test('rejects missing required fields with 400', async () => {
    const { admin } = await seedScenario();

    const res = await api()
      .post('/api/drives')
      .set(...auth(admin.token))
      .send({ title: 'No company', roles: oneRole });

    assert.equal(res.status, 400);
  });

  test('rejects an unknown companyId with 400', async () => {
    const { admin } = await seedScenario();

    const res = await api()
      .post('/api/drives')
      .set(...auth(admin.token))
      .send({
        companyId: '00000000-0000-0000-0000-000000000000',
        title: 'Ghost',
        roles: oneRole,
      });

    assert.equal(res.status, 400);
  });

  test('rejects a negative backlog limit with 400', async () => {
    const { admin, company } = await seedScenario();

    const res = await api()
      .post('/api/drives')
      .set(...auth(admin.token))
      .send({ companyId: company.id, title: 'Bad', maxBacklogs: -1, roles: oneRole });

    assert.equal(res.status, 400);
  });

  test('rejects creating a drive with no roles', async () => {
    const { admin, company } = await seedScenario();

    const res = await api()
      .post('/api/drives')
      .set(...auth(admin.token))
      .send({ companyId: company.id, title: 'Roleless' });

    assert.equal(res.status, 400);
  });

  test('rejects creating a drive with an empty roles array', async () => {
    const { admin, company } = await seedScenario();

    const res = await api()
      .post('/api/drives')
      .set(...auth(admin.token))
      .send({ companyId: company.id, title: 'Roleless', roles: [] });

    assert.equal(res.status, 400);
  });

  test('rejects a role missing required fields', async () => {
    const { admin, company } = await seedScenario();

    const res = await api()
      .post('/api/drives')
      .set(...auth(admin.token))
      .send({
        companyId: company.id,
        title: 'Bad role',
        roles: [{ title: 'SDE', offerType: 'JOB' }],
      });

    assert.equal(res.status, 400);
  });
});

describe('PATCH /api/drives/:id/status', () => {
  test('lets an admin move a drive to OPEN', async () => {
    const { admin, drive } = await seedScenario({ drive: { status: 'DRAFT' } });

    const res = await api()
      .patch(`/api/drives/${drive.id}/status`)
      .set(...auth(admin.token))
      .send({ status: 'OPEN' });

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'OPEN');
  });

  test('rejects an invalid status with 400', async () => {
    const { admin, drive } = await seedScenario();

    const res = await api()
      .patch(`/api/drives/${drive.id}/status`)
      .set(...auth(admin.token))
      .send({ status: 'BOGUS' });

    assert.equal(res.status, 400);
  });

  test('forbids a student from changing status', async () => {
    const { student, drive } = await seedScenario();

    const res = await api()
      .patch(`/api/drives/${drive.id}/status`)
      .set(...auth(student.token))
      .send({ status: 'CLOSED' });

    assert.equal(res.status, 403);
  });

  test('cannot change a drive belonging to another university', async () => {
    const { admin } = await seedScenario();
    const other = await createUniversity();
    const otherCompany = await createCompany();
    const foreignDrive = await createDrive(other.id, otherCompany.id, { status: 'DRAFT' });

    const res = await api()
      .patch(`/api/drives/${foreignDrive.id}/status`)
      .set(...auth(admin.token))
      .send({ status: 'OPEN' });

    assert.equal(res.status, 404);
  });
});

describe('PATCH /api/drives/:id/details', () => {
  test('lets an admin edit title/description/eligibility after creation', async () => {
    const { admin, drive } = await seedScenario();

    const res = await api()
      .patch(`/api/drives/${drive.id}/details`)
      .set(...auth(admin.token))
      .send({ title: 'Updated Title', description: 'New description', minCgpa: 7.5, maxBacklogs: 1 });

    assert.equal(res.status, 200);
    assert.equal(res.body.title, 'Updated Title');
    assert.equal(res.body.description, 'New description');
    assert.equal(Number(res.body.minCgpa), 7.5);
    assert.equal(res.body.maxBacklogs, 1);
  });

  test('rejects a blank title with 400', async () => {
    const { admin, drive } = await seedScenario();
    const res = await api()
      .patch(`/api/drives/${drive.id}/details`)
      .set(...auth(admin.token))
      .send({ title: '   ' });
    assert.equal(res.status, 400);
  });

  test('forbids a student', async () => {
    const { student, drive } = await seedScenario();
    const res = await api()
      .patch(`/api/drives/${drive.id}/details`)
      .set(...auth(student.token))
      .send({ title: 'Nope' });
    assert.equal(res.status, 403);
  });

  test('cannot change a drive belonging to another university', async () => {
    const { admin } = await seedScenario();
    const other = await createUniversity();
    const otherCompany = await createCompany();
    const foreignDrive = await createDrive(other.id, otherCompany.id, { status: 'DRAFT' });

    const res = await api()
      .patch(`/api/drives/${foreignDrive.id}/details`)
      .set(...auth(admin.token))
      .send({ title: 'Hijacked' });

    assert.equal(res.status, 404);
  });
});

describe('application form', () => {
  test('admin sets it and a student can read it', async () => {
    const { admin, student, drive } = await seedScenario();
    const questions = [{ id: 'why', label: 'Why?', type: 'text' }];

    const put = await api()
      .put(`/api/drives/${drive.id}/application-form`)
      .set(...auth(admin.token))
      .send({ questions });
    assert.equal(put.status, 200);

    const get = await api()
      .get(`/api/drives/${drive.id}/application-form`)
      .set(...auth(student.token));

    assert.equal(get.status, 200);
    assert.deepEqual(get.body.questions, questions);
  });

  test('is upserted, not duplicated, when set twice', async () => {
    const { admin, drive } = await seedScenario();

    const first = await api()
      .put(`/api/drives/${drive.id}/application-form`)
      .set(...auth(admin.token))
      .send({ questions: [{ id: 'a' }] });
    const second = await api()
      .put(`/api/drives/${drive.id}/application-form`)
      .set(...auth(admin.token))
      .send({ questions: [{ id: 'b' }] });

    assert.equal(second.status, 200);
    assert.equal(second.body.id, first.body.id, 'should update the same row');
    assert.deepEqual(second.body.questions, [{ id: 'b' }]);
  });

  test('404s when no form has been set', async () => {
    const { admin, drive } = await seedScenario();

    const res = await api()
      .get(`/api/drives/${drive.id}/application-form`)
      .set(...auth(admin.token));

    assert.equal(res.status, 404);
  });

  test('forbids a student from setting it', async () => {
    const { student, drive } = await seedScenario();

    const res = await api()
      .put(`/api/drives/${drive.id}/application-form`)
      .set(...auth(student.token))
      .send({ questions: [] });

    assert.equal(res.status, 403);
  });

  test('rejects a non-array questions payload with 400', async () => {
    const { admin, drive } = await seedScenario();

    const res = await api()
      .put(`/api/drives/${drive.id}/application-form`)
      .set(...auth(admin.token))
      .send({ questions: 'not an array' });

    assert.equal(res.status, 400);
  });
});

describe('PATCH /api/drives/:id/declare-results', () => {
  const applyTo = (driveId, token) =>
    api()
      .post(`/api/drives/${driveId}/applications`)
      .set(...auth(token))
      .send({ responses: {} });

  const declareResults = (driveId, token) =>
    api()
      .patch(`/api/drives/${driveId}/declare-results`)
      .set(...auth(token));

  test('requires the drive to be CLOSED first', async () => {
    const { admin, drive } = await seedScenario({ drive: { status: 'OPEN' } });

    const res = await declareResults(drive.id, admin.token);

    assert.equal(res.status, 400);
  });

  test('lets an admin declare results once the drive is closed', async () => {
    const { admin, drive } = await seedScenario({ drive: { status: 'CLOSED' } });

    const res = await declareResults(drive.id, admin.token);

    assert.equal(res.status, 200);
    assert.equal(res.body.resultsDeclared, true);
    assert.ok(res.body.resultsDeclaredAt);
  });

  test('rejects declaring twice', async () => {
    const { admin, drive } = await seedScenario({ drive: { status: 'CLOSED' } });
    await declareResults(drive.id, admin.token);

    const res = await declareResults(drive.id, admin.token);

    assert.equal(res.status, 409);
  });

  test('forbids a student', async () => {
    const { student, drive } = await seedScenario({ drive: { status: 'CLOSED' } });

    const res = await declareResults(drive.id, student.token);

    assert.equal(res.status, 403);
  });

  test('cannot declare results for a drive belonging to another university', async () => {
    const mine = await seedScenario({ drive: { status: 'CLOSED' } });
    const other = await seedScenario();

    const res = await declareResults(mine.drive.id, other.admin.token);

    assert.equal(res.status, 404);
  });

  test('results stay hidden until declared, then are visible to any student — name and studentId only', async () => {
    const { university, program, admin, student, drive } = await seedScenario({
      drive: { status: 'OPEN' },
    });
    const applied = await applyTo(drive.id, student.token);
    await api()
      .patch(`/api/applications/${applied.body.id}/status`)
      .set(...auth(admin.token))
      .send({ status: 'SELECTED' });
    await api()
      .patch(`/api/drives/${drive.id}/status`)
      .set(...auth(admin.token))
      .send({ status: 'CLOSED' });

    const beforeDeclare = await api().get(`/api/drives/${drive.id}`).set(...auth(student.token));
    assert.equal(beforeDeclare.body.results, undefined);

    await declareResults(drive.id, admin.token);

    // A different student who never applied should still be able to see it.
    const bystander = await registerStudent(university.id, program.id);
    const afterDeclare = await api()
      .get(`/api/drives/${drive.id}`)
      .set(...auth(bystander.token));

    assert.equal(afterDeclare.status, 200);
    assert.equal(afterDeclare.body.results.length, 1);
    assert.deepEqual(Object.keys(afterDeclare.body.results[0]).sort(), ['name', 'studentId']);
    assert.equal(afterDeclare.body.results[0].name, 'Test Student');
  });
});

describe('openedAt', () => {
  test('is null until the drive is opened, then stamped', async () => {
    const { admin, drive } = await seedScenario({ drive: { status: 'DRAFT' } });

    const before = await api().get(`/api/drives/${drive.id}`).set(...auth(admin.token));
    assert.equal(before.body.openedAt, null);

    const after = await api()
      .patch(`/api/drives/${drive.id}/status`)
      .set(...auth(admin.token))
      .send({ status: 'OPEN' });

    assert.ok(after.body.openedAt);
  });
});

describe('PATCH /api/drives/:id/auto-close', () => {
  const setAutoClose = (driveId, token, autoCloseAt) =>
    api()
      .patch(`/api/drives/${driveId}/auto-close`)
      .set(...auth(token))
      .send({ autoCloseAt });

  test('an admin can schedule an auto-close time', async () => {
    const { admin, drive } = await seedScenario();
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const res = await setAutoClose(drive.id, admin.token, future);

    assert.equal(res.status, 200);
    assert.equal(new Date(res.body.autoCloseAt).toISOString(), future);
  });

  test('an admin can clear a scheduled auto-close by passing null', async () => {
    const { admin, drive } = await seedScenario();
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await setAutoClose(drive.id, admin.token, future);

    const res = await setAutoClose(drive.id, admin.token, null);

    assert.equal(res.status, 200);
    assert.equal(res.body.autoCloseAt, null);
  });

  test('rejects a past date', async () => {
    const { admin, drive } = await seedScenario();
    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const res = await setAutoClose(drive.id, admin.token, past);

    assert.equal(res.status, 400);
  });

  test('rejects an invalid date string', async () => {
    const { admin, drive } = await seedScenario();

    const res = await setAutoClose(drive.id, admin.token, 'not-a-date');

    assert.equal(res.status, 400);
  });

  test('forbids a student', async () => {
    const { student, drive } = await seedScenario();
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const res = await setAutoClose(drive.id, student.token, future);

    assert.equal(res.status, 403);
  });

  test('404s for a drive belonging to another university', async () => {
    const mine = await seedScenario();
    const other = await seedScenario();
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const res = await setAutoClose(mine.drive.id, other.admin.token, future);

    assert.equal(res.status, 404);
  });
});

describe('autoCloseDueDrives (poller)', () => {
  test('closes an OPEN drive whose auto-close time has passed', async () => {
    const { drive } = await seedScenario({ drive: { status: 'OPEN' } });
    await prisma.drive.update({
      where: { id: drive.id },
      data: { autoCloseAt: new Date(Date.now() - 1000) },
    });

    await autoCloseDueDrives();

    const updated = await prisma.drive.findUnique({ where: { id: drive.id } });
    assert.equal(updated.status, 'CLOSED');
  });

  test('does not close a drive whose auto-close time is in the future', async () => {
    const { drive } = await seedScenario({ drive: { status: 'OPEN' } });
    await prisma.drive.update({
      where: { id: drive.id },
      data: { autoCloseAt: new Date(Date.now() + 60 * 60 * 1000) },
    });

    await autoCloseDueDrives();

    const updated = await prisma.drive.findUnique({ where: { id: drive.id } });
    assert.equal(updated.status, 'OPEN');
  });

  test('does not touch a drive with no auto-close time set', async () => {
    const { drive } = await seedScenario({ drive: { status: 'OPEN' } });

    await autoCloseDueDrives();

    const updated = await prisma.drive.findUnique({ where: { id: drive.id } });
    assert.equal(updated.status, 'OPEN');
  });
});
