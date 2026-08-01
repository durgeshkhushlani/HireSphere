const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { resetDb, disconnect } = require('./helpers/db');
const {
  api,
  auth,
  createUniversity,
  createProgram,
  createCompany,
  createDrive,
  registerAdmin,
  registerStudent,
  seedScenario,
} = require('./helpers/factories');

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
});

describe('POST /api/drives', () => {
  test('lets an admin create a drive, defaulting to DRAFT', async () => {
    const university = await createUniversity();
    const company = await createCompany();
    const admin = await registerAdmin(university.id);

    const res = await api()
      .post('/api/drives')
      .set(...auth(admin.token))
      .send({ companyId: company.id, title: 'SDE Intern' });

    assert.equal(res.status, 201);
    assert.equal(res.body.status, 'DRAFT');
    assert.equal(res.body.universityId, university.id);
  });

  test('forbids a student from creating a drive', async () => {
    const { student, company } = await seedScenario();

    const res = await api()
      .post('/api/drives')
      .set(...auth(student.token))
      .send({ companyId: company.id, title: 'Nope' });

    assert.equal(res.status, 403);
  });

  test('rejects missing required fields with 400', async () => {
    const { admin } = await seedScenario();

    const res = await api()
      .post('/api/drives')
      .set(...auth(admin.token))
      .send({ title: 'No company' });

    assert.equal(res.status, 400);
  });

  test('rejects an unknown companyId with 400', async () => {
    const { admin } = await seedScenario();

    const res = await api()
      .post('/api/drives')
      .set(...auth(admin.token))
      .send({ companyId: '00000000-0000-0000-0000-000000000000', title: 'Ghost' });

    assert.equal(res.status, 400);
  });

  test('rejects a negative backlog limit with 400', async () => {
    const { admin, company } = await seedScenario();

    const res = await api()
      .post('/api/drives')
      .set(...auth(admin.token))
      .send({ companyId: company.id, title: 'Bad', maxBacklogs: -1 });

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
