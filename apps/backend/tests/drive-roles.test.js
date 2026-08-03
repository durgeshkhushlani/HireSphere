const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { resetDb, disconnect, prisma } = require('./helpers/db');
const {
  api,
  auth,
  createUniversity,
  createCompany,
  createDrive,
  createDriveRole,
  registerAdmin,
  registerStudent,
  createProgram,
  createUniversityProgram,
} = require('./helpers/factories');

beforeEach(resetDb);
after(disconnect);

const jobRole = (overrides = {}) => ({
  title: 'Software Engineer',
  offerType: 'JOB',
  description: 'Build things.',
  ctcAmount: 1200000,
  ...overrides,
});

const internshipRole = (overrides = {}) => ({
  title: 'SWE Intern',
  offerType: 'INTERNSHIP',
  description: 'Build smaller things.',
  stipendAmount: 25000,
  ...overrides,
});

async function setup() {
  const university = await createUniversity();
  const company = await createCompany();
  const drive = await createDrive(university.id, company.id);
  const admin = await registerAdmin(university.id);
  return { university, company, drive, admin };
}

describe('PUT /api/drives/:driveId/roles', () => {
  test('creates roles and they come back on GET /drives/:id', async () => {
    const { drive, admin } = await setup();

    const res = await api()
      .put(`/api/drives/${drive.id}/roles`)
      .set(...auth(admin.token))
      .send({ roles: [jobRole(), internshipRole()] });

    assert.equal(res.status, 200);
    assert.equal(res.body.length, 2);

    const getRes = await api().get(`/api/drives/${drive.id}`).set(...auth(admin.token));
    assert.equal(getRes.body.roles.length, 2);
  });

  test('rejects a JOB role missing ctcAmount', async () => {
    const { drive, admin } = await setup();

    const res = await api()
      .put(`/api/drives/${drive.id}/roles`)
      .set(...auth(admin.token))
      .send({ roles: [jobRole({ ctcAmount: undefined })] });

    assert.equal(res.status, 400);
  });

  test('rejects a JOB role that also sets stipendAmount', async () => {
    const { drive, admin } = await setup();

    const res = await api()
      .put(`/api/drives/${drive.id}/roles`)
      .set(...auth(admin.token))
      .send({ roles: [jobRole({ stipendAmount: 5000 })] });

    assert.equal(res.status, 400);
  });

  test('rejects an INTERNSHIP role missing stipendAmount', async () => {
    const { drive, admin } = await setup();

    const res = await api()
      .put(`/api/drives/${drive.id}/roles`)
      .set(...auth(admin.token))
      .send({ roles: [internshipRole({ stipendAmount: undefined })] });

    assert.equal(res.status, 400);
  });

  test('rejects a missing description', async () => {
    const { drive, admin } = await setup();

    const res = await api()
      .put(`/api/drives/${drive.id}/roles`)
      .set(...auth(admin.token))
      .send({ roles: [jobRole({ description: '' })] });

    assert.equal(res.status, 400);
  });

  test('updates an existing role when its id is included', async () => {
    const { drive, admin } = await setup();
    const role = await createDriveRole(drive.id, { title: 'Old Title' });

    const res = await api()
      .put(`/api/drives/${drive.id}/roles`)
      .set(...auth(admin.token))
      .send({ roles: [jobRole({ id: role.id, title: 'New Title' })] });

    assert.equal(res.status, 200);
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].id, role.id);
    assert.equal(res.body[0].title, 'New Title');
  });

  test('deletes a role omitted from the array when it has no applications', async () => {
    const { drive, admin } = await setup();
    await createDriveRole(drive.id);

    const res = await api()
      .put(`/api/drives/${drive.id}/roles`)
      .set(...auth(admin.token))
      .send({ roles: [] });

    assert.equal(res.status, 200);
    assert.deepEqual(res.body, []);
  });

  test('rejects deleting a role that already has a student preference against it', async () => {
    const { university, drive, admin } = await setup();
    const role = await createDriveRole(drive.id);
    await prisma.drive.update({ where: { id: drive.id }, data: { status: 'OPEN' } });

    const program = await createProgram();
    await createUniversityProgram(university.id, program.id);
    const student = await registerStudent(university.id, program.id);

    const applyRes = await api()
      .post(`/api/drives/${drive.id}/applications`)
      .set(...auth(student.token))
      .send({ responses: {}, rolePreferences: [role.id] });
    assert.equal(applyRes.status, 201);

    const res = await api()
      .put(`/api/drives/${drive.id}/roles`)
      .set(...auth(admin.token))
      .send({ roles: [] });

    assert.equal(res.status, 409);
  });

  test('rejects a role id that belongs to a different drive', async () => {
    const { university, company, drive, admin } = await setup();
    const otherDrive = await createDrive(university.id, company.id);
    const foreignRole = await createDriveRole(otherDrive.id);

    const res = await api()
      .put(`/api/drives/${drive.id}/roles`)
      .set(...auth(admin.token))
      .send({ roles: [jobRole({ id: foreignRole.id })] });

    assert.equal(res.status, 400);
  });

  test('forbids a student', async () => {
    const { university, drive } = await setup();
    const program = await createProgram();
    await createUniversityProgram(university.id, program.id);
    const student = await registerStudent(university.id, program.id);

    const res = await api()
      .put(`/api/drives/${drive.id}/roles`)
      .set(...auth(student.token))
      .send({ roles: [jobRole()] });

    assert.equal(res.status, 403);
  });

  test('requires authentication', async () => {
    const { drive } = await setup();

    const res = await api().put(`/api/drives/${drive.id}/roles`).send({ roles: [jobRole()] });

    assert.equal(res.status, 401);
  });
});
