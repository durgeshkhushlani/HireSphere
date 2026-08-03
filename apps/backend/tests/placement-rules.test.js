// The placement-season business rules from the implementation plan (§4):
// automatic eligibility checks, and the global placement lock once a student
// is selected anywhere.
const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { resetDb, disconnect, prisma } = require('./helpers/db');
const {
  api,
  auth,
  createCompany,
  createDrive,
  createDriveRole,
  seedScenario,
} = require('./helpers/factories');

beforeEach(resetDb);
after(disconnect);

const applyTo = (driveId, token) =>
  api()
    .post(`/api/drives/${driveId}/applications`)
    .set(...auth(token))
    .send({ responses: {} });

const setStatus = (applicationId, token, body) =>
  api()
    .patch(`/api/applications/${applicationId}/status`)
    .set(...auth(token))
    .send(body);

describe('eligibility — minimum CGPA', () => {
  test('blocks a student below the threshold', async () => {
    const { student, drive } = await seedScenario({
      drive: { minCgpa: 9.0 },
      student: { cgpa: 8.5 },
    });

    const res = await applyTo(drive.id, student.token);

    assert.equal(res.status, 403);
    assert.match(res.body.error, /CGPA/i);
  });

  test('allows a student above the threshold', async () => {
    const { student, drive } = await seedScenario({
      drive: { minCgpa: 7.0 },
      student: { cgpa: 8.5 },
    });

    const res = await applyTo(drive.id, student.token);

    assert.equal(res.status, 201);
  });

  test('allows a student exactly at the threshold', async () => {
    const { student, drive } = await seedScenario({
      drive: { minCgpa: 8.5 },
      student: { cgpa: 8.5 },
    });

    const res = await applyTo(drive.id, student.token);

    assert.equal(res.status, 201, 'the minimum should be inclusive');
  });

  test('applies no CGPA restriction when the drive sets none', async () => {
    const { student, drive } = await seedScenario({ student: { cgpa: 5.0 } });

    const res = await applyTo(drive.id, student.token);

    assert.equal(res.status, 201);
  });
});

describe('eligibility — backlog limit', () => {
  test('blocks a student over the limit', async () => {
    const { student, drive } = await seedScenario({ drive: { maxBacklogs: 0 } });
    await prisma.studentProfile.update({
      where: { userId: student.user.id },
      data: { backlogCount: 2 },
    });

    const res = await applyTo(drive.id, student.token);

    assert.equal(res.status, 403);
    assert.match(res.body.error, /backlog/i);
  });

  test('allows a student exactly at the limit', async () => {
    const { student, drive } = await seedScenario({ drive: { maxBacklogs: 2 } });
    await prisma.studentProfile.update({
      where: { userId: student.user.id },
      data: { backlogCount: 2 },
    });

    const res = await applyTo(drive.id, student.token);

    assert.equal(res.status, 201, 'the maximum should be inclusive');
  });
});

describe('selection creates a placement and locks the student', () => {
  test('marking SELECTED records a placement', async () => {
    const { admin, student, drive, company } = await seedScenario();
    const application = await applyTo(drive.id, student.token);

    const res = await setStatus(application.body.id, admin.token, {
      status: 'SELECTED',
      packageAmount: 1800000,
    });

    assert.equal(res.status, 200);

    const placements = await prisma.placement.findMany();
    assert.equal(placements.length, 1);
    assert.equal(placements[0].userId, student.user.id);
    assert.equal(placements[0].companyId, company.id);
    assert.equal(placements[0].driveId, drive.id);
    assert.equal(Number(placements[0].packageAmount), 1800000);
  });

  test('marking SELECTED sets the global placement lock', async () => {
    const { admin, student, drive } = await seedScenario();
    const application = await applyTo(drive.id, student.token);

    await setStatus(application.body.id, admin.token, { status: 'SELECTED' });

    const profile = await prisma.studentProfile.findUnique({
      where: { userId: student.user.id },
    });
    assert.equal(profile.placementLocked, true);
  });

  test('a placed student cannot apply to any other drive', async () => {
    const { admin, student, drive, university } = await seedScenario();
    const application = await applyTo(drive.id, student.token);
    await setStatus(application.body.id, admin.token, { status: 'SELECTED' });

    const secondCompany = await createCompany();
    const secondDrive = await createDrive(university.id, secondCompany.id, { status: 'OPEN' });

    const res = await applyTo(secondDrive.id, student.token);

    assert.equal(res.status, 403);
    assert.match(res.body.error, /already placed/i);
  });

  test('does not lock other students', async () => {
    const { admin, student, drive, university, program } = await seedScenario();
    const { registerStudent } = require('./helpers/factories');
    const peer = await registerStudent(university.id, program.id);

    const application = await applyTo(drive.id, student.token);
    await setStatus(application.body.id, admin.token, { status: 'SELECTED' });

    const peerProfile = await prisma.studentProfile.findUnique({
      where: { userId: peer.user.id },
    });
    assert.equal(peerProfile.placementLocked, false);
  });

  test('advancing to a non-final status does not lock anyone', async () => {
    const { admin, student, drive } = await seedScenario();
    const application = await applyTo(drive.id, student.token);

    await setStatus(application.body.id, admin.token, { status: 'INTERVIEW' });

    const profile = await prisma.studentProfile.findUnique({
      where: { userId: student.user.id },
    });
    assert.equal(profile.placementLocked, false);
    assert.equal(await prisma.placement.count(), 0);
  });

  test('NOT_SELECTED does not lock the student', async () => {
    const { admin, student, drive } = await seedScenario();
    const application = await applyTo(drive.id, student.token);

    await setStatus(application.body.id, admin.token, { status: 'NOT_SELECTED' });

    const profile = await prisma.studentProfile.findUnique({
      where: { userId: student.user.id },
    });
    assert.equal(profile.placementLocked, false);
  });
});

describe('selecting with roles', () => {
  const applyWithRoles = (driveId, token, rolePreferences) =>
    api()
      .post(`/api/drives/${driveId}/applications`)
      .set(...auth(token))
      .send({ responses: {}, rolePreferences });

  test('SELECTED requires selectedRoleId when the drive has roles', async () => {
    const { admin, student, drive } = await seedScenario();
    const role = await createDriveRole(drive.id);
    const application = await applyWithRoles(drive.id, student.token, [role.id]);

    const res = await setStatus(application.body.id, admin.token, { status: 'SELECTED' });

    assert.equal(res.status, 400);
  });

  test('rejects a selectedRoleId the student never preferred', async () => {
    const { admin, student, drive } = await seedScenario();
    const preferred = await createDriveRole(drive.id, { title: 'Preferred' });
    const other = await createDriveRole(drive.id, { title: 'Other' });
    const application = await applyWithRoles(drive.id, student.token, [preferred.id]);

    const res = await setStatus(application.body.id, admin.token, {
      status: 'SELECTED',
      selectedRoleId: other.id,
    });

    assert.equal(res.status, 400);
  });

  test('records the role on the application and placement, defaulting the package from it', async () => {
    const { admin, student, drive, company } = await seedScenario();
    const role = await createDriveRole(drive.id, { ctcAmount: 1500000 });
    const application = await applyWithRoles(drive.id, student.token, [role.id]);

    const res = await setStatus(application.body.id, admin.token, {
      status: 'SELECTED',
      selectedRoleId: role.id,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.selectedRoleId, role.id);

    const placements = await prisma.placement.findMany({ where: { companyId: company.id } });
    assert.equal(placements.length, 1);
    assert.equal(placements[0].driveRoleId, role.id);
    assert.equal(Number(placements[0].packageAmount), 1500000);
  });

  test('an explicit packageAmount overrides the role default', async () => {
    const { admin, student, drive } = await seedScenario();
    const role = await createDriveRole(drive.id, { ctcAmount: 1500000 });
    const application = await applyWithRoles(drive.id, student.token, [role.id]);

    await setStatus(application.body.id, admin.token, {
      status: 'SELECTED',
      selectedRoleId: role.id,
      packageAmount: 2000000,
    });

    const placement = await prisma.placement.findFirst();
    assert.equal(Number(placement.packageAmount), 2000000);
  });

  test('reversing a role-based selection clears selectedRoleId', async () => {
    const { admin, student, drive } = await seedScenario();
    const role = await createDriveRole(drive.id);
    const application = await applyWithRoles(drive.id, student.token, [role.id]);

    await setStatus(application.body.id, admin.token, {
      status: 'SELECTED',
      selectedRoleId: role.id,
    });
    const reverted = await setStatus(application.body.id, admin.token, { status: 'SHORTLISTED' });

    assert.equal(reverted.body.selectedRoleId, null);
  });

  test('a drive with no roles does not require selectedRoleId', async () => {
    const { admin, student, drive } = await seedScenario();
    const application = await applyTo(drive.id, student.token);

    const res = await setStatus(application.body.id, admin.token, { status: 'SELECTED' });

    assert.equal(res.status, 200);
  });
});

describe('reversing a selection', () => {
  test('releases the lock and removes the placement', async () => {
    const { admin, student, drive } = await seedScenario();
    const application = await applyTo(drive.id, student.token);
    await setStatus(application.body.id, admin.token, { status: 'SELECTED' });

    // An admin correcting a misclick must not leave the student locked out
    // of every future drive.
    await setStatus(application.body.id, admin.token, { status: 'SHORTLISTED' });

    const profile = await prisma.studentProfile.findUnique({
      where: { userId: student.user.id },
    });
    assert.equal(profile.placementLocked, false);
    assert.equal(await prisma.placement.count(), 0);
  });

  test('the student can apply again after a reversal', async () => {
    const { admin, student, drive, university } = await seedScenario();
    const application = await applyTo(drive.id, student.token);
    await setStatus(application.body.id, admin.token, { status: 'SELECTED' });
    await setStatus(application.body.id, admin.token, { status: 'SHORTLISTED' });

    const secondCompany = await createCompany();
    const secondDrive = await createDrive(university.id, secondCompany.id, { status: 'OPEN' });

    const res = await applyTo(secondDrive.id, student.token);

    assert.equal(res.status, 201);
  });

  test('re-confirming SELECTED does not create a duplicate placement', async () => {
    const { admin, student, drive } = await seedScenario();
    const application = await applyTo(drive.id, student.token);

    await setStatus(application.body.id, admin.token, { status: 'SELECTED' });
    await setStatus(application.body.id, admin.token, { status: 'SELECTED' });

    assert.equal(await prisma.placement.count(), 1);
  });
});

describe('GET /api/placements', () => {
  test('an admin sees placements for their university', async () => {
    const { admin, student, drive } = await seedScenario();
    const application = await applyTo(drive.id, student.token);
    await setStatus(application.body.id, admin.token, { status: 'SELECTED' });

    const res = await api()
      .get('/api/placements')
      .set(...auth(admin.token));

    assert.equal(res.status, 200);
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].user.email, student.user.email);
    assert.equal(res.body[0].user.passwordHash, undefined);
  });

  test('is forbidden to students', async () => {
    const { student } = await seedScenario();

    const res = await api()
      .get('/api/placements')
      .set(...auth(student.token));

    assert.equal(res.status, 403);
  });

  test('a student sees only their own via /me', async () => {
    const { admin, student, drive } = await seedScenario();
    const application = await applyTo(drive.id, student.token);
    await setStatus(application.body.id, admin.token, { status: 'SELECTED' });

    const res = await api()
      .get('/api/placements/me')
      .set(...auth(student.token));

    assert.equal(res.status, 200);
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].userId, student.user.id);
  });

  test('/me is forbidden to admins', async () => {
    const { admin } = await seedScenario();

    const res = await api()
      .get('/api/placements/me')
      .set(...auth(admin.token));

    assert.equal(res.status, 403);
  });
});
