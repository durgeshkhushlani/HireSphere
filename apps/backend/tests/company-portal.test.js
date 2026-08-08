const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { resetDb, disconnect } = require('./helpers/db');
const { api, auth, seedScenario, registerStudent } = require('./helpers/factories');

beforeEach(resetDb);
after(disconnect);

const createDriveViaApi = (companyId, token, overrides = {}) =>
  api()
    .post('/api/drives')
    .set(...auth(token))
    .send({ companyId, title: 'Portal Test Drive', ...overrides });

const login = (body) => api().post('/api/company-portal/login').send(body);

describe('POST /api/drives — company portal access', () => {
  test('creating a drive generates a one-time access code and password', async () => {
    const { admin, company } = await seedScenario();

    const res = await createDriveViaApi(company.id, admin.token);

    assert.equal(res.status, 201);
    assert.ok(res.body.companyAccess.accessCode);
    assert.ok(res.body.companyAccess.password);
  });

  test('the access code lets the company log in and scopes them to that drive', async () => {
    const { university, admin, company } = await seedScenario();
    const created = await createDriveViaApi(company.id, admin.token);
    const { accessCode, password } = created.body.companyAccess;

    const res = await login({ universityDomain: university.domain, accessCode, password });

    assert.equal(res.status, 200);
    assert.ok(res.body.token);
    assert.equal(res.body.drive.id, created.body.id);
    assert.equal(res.body.drive.companyName, company.name);
  });

  test('rejects the wrong password', async () => {
    const { university, admin, company } = await seedScenario();
    const created = await createDriveViaApi(company.id, admin.token);

    const res = await login({
      universityDomain: university.domain,
      accessCode: created.body.companyAccess.accessCode,
      password: 'wrong-password',
    });

    assert.equal(res.status, 401);
  });

  test('rejects a mismatched university domain even with the right code/password', async () => {
    const { admin, company } = await seedScenario();
    const created = await createDriveViaApi(company.id, admin.token);

    const res = await login({
      universityDomain: 'not-the-real-domain.edu',
      accessCode: created.body.companyAccess.accessCode,
      password: created.body.companyAccess.password,
    });

    assert.equal(res.status, 401);
  });

  test('rejects missing fields with 400', async () => {
    const res = await login({ accessCode: 'ABC123' });
    assert.equal(res.status, 400);
  });
});

describe('company-portal scoped access', () => {
  async function setupCompanySession() {
    const { university, program, admin, student, company } = await seedScenario();
    const created = await createDriveViaApi(company.id, admin.token);
    const driveId = created.body.id;
    const otherDrive = await createDriveViaApi(company.id, admin.token, {
      title: 'Sibling Drive',
    });
    // New drives always start DRAFT — apply requires OPEN.
    await api()
      .patch(`/api/drives/${driveId}/status`)
      .set(...auth(admin.token))
      .send({ status: 'OPEN' });

    const applied = await api()
      .post(`/api/drives/${driveId}/applications`)
      .set(...auth(student.token))
      .send({ responses: {} });

    const loginRes = await login({
      universityDomain: university.domain,
      accessCode: created.body.companyAccess.accessCode,
      password: created.body.companyAccess.password,
    });

    return {
      university,
      program,
      admin,
      companyToken: loginRes.body.token,
      driveId,
      otherDriveId: otherDrive.body.id,
      applicationId: applied.body.id,
    };
  }

  test('a company caller can list their own drive applicants', async () => {
    const { companyToken, driveId } = await setupCompanySession();

    const res = await api()
      .get(`/api/drives/${driveId}/applications`)
      .set(...auth(companyToken));

    assert.equal(res.status, 200);
    assert.equal(res.body.length, 1);
  });

  test('a company caller cannot list a different drive\'s applicants', async () => {
    const { companyToken, otherDriveId } = await setupCompanySession();

    const res = await api()
      .get(`/api/drives/${otherDriveId}/applications`)
      .set(...auth(companyToken));

    assert.equal(res.status, 404);
  });

  test('a company caller cannot list all drives', async () => {
    const { companyToken } = await setupCompanySession();

    const res = await api().get('/api/drives').set(...auth(companyToken));

    assert.equal(res.status, 403);
  });

  test('a company caller can view their own drive by id', async () => {
    const { companyToken, driveId } = await setupCompanySession();

    const res = await api().get(`/api/drives/${driveId}`).set(...auth(companyToken));

    assert.equal(res.status, 200);
    assert.equal(res.body.id, driveId);
    assert.equal(res.body.companyAccess, undefined);
  });

  test('a company caller cannot view a different drive by id', async () => {
    const { companyToken, otherDriveId } = await setupCompanySession();

    const res = await api().get(`/api/drives/${otherDriveId}`).set(...auth(companyToken));

    assert.equal(res.status, 404);
  });

  test('a company caller can update the status of their own applicant', async () => {
    const { companyToken, applicationId } = await setupCompanySession();

    const res = await api()
      .patch(`/api/applications/${applicationId}/status`)
      .set(...auth(companyToken))
      .send({ status: 'SHORTLISTED' });

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'SHORTLISTED');
  });

  test('a company caller cannot update an application belonging to a different drive', async () => {
    const { university, program, admin, companyToken, otherDriveId } = await setupCompanySession();
    await api()
      .patch(`/api/drives/${otherDriveId}/status`)
      .set(...auth(admin.token))
      .send({ status: 'OPEN' });
    const sameUniStudent = await registerStudent(university.id, program.id);
    const foreignApplication = await api()
      .post(`/api/drives/${otherDriveId}/applications`)
      .set(...auth(sameUniStudent.token))
      .send({ responses: {} });

    const res = await api()
      .patch(`/api/applications/${foreignApplication.body.id}/status`)
      .set(...auth(companyToken))
      .send({ status: 'SHORTLISTED' });

    assert.equal(res.status, 404);
  });
});

describe('PATCH /api/drives/:id/company-access/regenerate', () => {
  test('an admin can regenerate and send new credentials, invalidating the old password', async () => {
    const { university, admin, company } = await seedScenario();
    const created = await createDriveViaApi(company.id, admin.token);
    const { accessCode, password: oldPassword } = created.body.companyAccess;

    const res = await api()
      .patch(`/api/drives/${created.body.id}/company-access/regenerate`)
      .set(...auth(admin.token))
      .send({ emails: ['ceo@company.com', 'vp@company.com'] });

    assert.equal(res.status, 200);
    assert.equal(res.body.accessCode, accessCode);
    assert.notEqual(res.body.password, oldPassword);

    const oldLogin = await login({ universityDomain: university.domain, accessCode, password: oldPassword });
    assert.equal(oldLogin.status, 401);

    const newLogin = await login({
      universityDomain: university.domain,
      accessCode,
      password: res.body.password,
    });
    assert.equal(newLogin.status, 200);
  });

  test('rejects an empty emails list', async () => {
    const { admin, company } = await seedScenario();
    const created = await createDriveViaApi(company.id, admin.token);

    const res = await api()
      .patch(`/api/drives/${created.body.id}/company-access/regenerate`)
      .set(...auth(admin.token))
      .send({ emails: [] });

    assert.equal(res.status, 400);
  });

  test('rejects an invalid email in the list', async () => {
    const { admin, company } = await seedScenario();
    const created = await createDriveViaApi(company.id, admin.token);

    const res = await api()
      .patch(`/api/drives/${created.body.id}/company-access/regenerate`)
      .set(...auth(admin.token))
      .send({ emails: ['not-an-email'] });

    assert.equal(res.status, 400);
  });

  test('forbids a student', async () => {
    const { student, admin, company } = await seedScenario();
    const created = await createDriveViaApi(company.id, admin.token);

    const res = await api()
      .patch(`/api/drives/${created.body.id}/company-access/regenerate`)
      .set(...auth(student.token))
      .send({ emails: ['a@b.com'] });

    assert.equal(res.status, 403);
  });

  test('cannot regenerate for a drive belonging to another university', async () => {
    const mine = await seedScenario();
    const other = await seedScenario();
    const created = await createDriveViaApi(mine.company.id, mine.admin.token);

    const res = await api()
      .patch(`/api/drives/${created.body.id}/company-access/regenerate`)
      .set(...auth(other.admin.token))
      .send({ emails: ['a@b.com'] });

    assert.equal(res.status, 404);
  });
});
