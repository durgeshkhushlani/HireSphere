const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { resetDb, disconnect, prisma } = require('./helpers/db');
const { api, auth } = require('./helpers/factories');
const demoController = require('../src/controllers/demo.controller');
const companyPortalService = require('../src/services/company-portal.service');

beforeEach(async () => {
  await resetDb();
  demoController._resetRateLimitForTests();
});
after(disconnect);

const startDemo = () => api().post('/api/demo/start').send();

describe('POST /api/demo/start', () => {
  test('returns an admin and a student token scoped to the same fresh university', async () => {
    const res = await startDemo();

    assert.equal(res.status, 201);
    assert.equal(res.body.admin.user.role, 'ADMIN');
    assert.equal(res.body.student.user.role, 'STUDENT');
    assert.equal(res.body.admin.user.universityId, res.body.student.user.universityId);
    assert.ok(res.body.expiresAt);
    assert.ok(!('passwordHash' in res.body.admin.user));
    assert.ok(!('passwordHash' in res.body.student.user));
  });

  test('the returned student is not placement-locked and can apply to a drive', async () => {
    const res = await startDemo();
    const studentToken = res.body.student.token;

    const drives = await api().get('/api/drives').set(...auth(studentToken));
    const openDrive = drives.body.find((d) => d.status === 'OPEN');
    assert.ok(openDrive, 'expected at least one OPEN demo drive');

    const applyRes = await api()
      .post(`/api/drives/${openDrive.id}/applications`)
      .set(...auth(studentToken))
      .send({
        responses: { q1: 'testing' },
        rolePreferences: openDrive.roles.map((r) => r.id),
      });

    assert.equal(applyRes.status, 201);
  });

  test('seeds a realistic, varied dataset', async () => {
    const res = await startDemo();
    const adminToken = res.body.admin.token;

    const drives = await api().get('/api/drives').set(...auth(adminToken));
    assert.equal(drives.body.length, 4);
    const statuses = drives.body.map((d) => d.status).sort();
    assert.deepEqual(statuses, ['CLOSED', 'DRAFT', 'OPEN', 'OPEN']);

    const roster = await api().get('/api/students').set(...auth(adminToken));
    assert.equal(roster.body.length, 5);
    assert.ok(roster.body.some((s) => s.verified === false), 'expected an unverified student');

    const placements = await api().get('/api/placements').set(...auth(adminToken));
    assert.equal(placements.body.length, 1);
  });

  test('two calls create two fully isolated universities', async () => {
    const first = await startDemo();
    const second = await startDemo();

    assert.notEqual(first.body.admin.user.universityId, second.body.admin.user.universityId);

    // The admin from session 1 must not be able to see session 2's drives.
    const drivesFromFirstAdmin = await api()
      .get('/api/drives')
      .set(...auth(first.body.admin.token));
    const drivesFromSecondAdmin = await api()
      .get('/api/drives')
      .set(...auth(second.body.admin.token));
    const firstIds = new Set(drivesFromFirstAdmin.body.map((d) => d.id));
    const secondIds = new Set(drivesFromSecondAdmin.body.map((d) => d.id));
    for (const id of secondIds) {
      assert.ok(!firstIds.has(id), 'session 2 drive leaked into session 1');
    }
  });

  test('reuses the same shared company/program catalog across sessions', async () => {
    await startDemo();
    await startDemo();

    const companies = await prisma.company.findMany({ where: { name: 'NovaTech Solutions' } });
    assert.equal(companies.length, 1);
  });

  test('sweeps an expired demo university before creating a new one', async () => {
    const first = await startDemo();
    await prisma.university.update({
      where: { id: first.body.admin.user.universityId },
      data: { demoExpiresAt: new Date(Date.now() - 1000) },
    });

    await startDemo();

    const stillThere = await prisma.university.findUnique({
      where: { id: first.body.admin.user.universityId },
    });
    assert.equal(stillThere, null);
  });

  // Regression test for a real production incident: a demo drive that had
  // ever had company-portal access generated for it (e.g. an admin created
  // an extra drive through the normal UI during their session, which always
  // creates access) couldn't be swept — cleanupExpired's children-before-
  // parents delete order was missing DriveCompanyAccess, so the FK violation
  // threw, which broke *every* subsequent /api/demo/start call globally
  // (cleanupExpired originally had no per-university error isolation either
  // — now fixed alongside this, see the try/catch around the loop body).
  test('sweeps an expired demo university even when one of its drives has company-portal access', async () => {
    const first = await startDemo();
    const drives = await api()
      .get('/api/drives')
      .set(...auth(first.body.admin.token));
    await companyPortalService.createAccess(drives.body[0].id);

    await prisma.university.update({
      where: { id: first.body.admin.user.universityId },
      data: { demoExpiresAt: new Date(Date.now() - 1000) },
    });

    const second = await startDemo();

    assert.equal(second.status, 201);
    const stillThere = await prisma.university.findUnique({
      where: { id: first.body.admin.user.universityId },
    });
    assert.equal(stillThere, null);
  });

  // Same class of production incident as above, one step later: an admin
  // who subscribed a notification recipient during their demo session left
  // a row with a direct FK to the university, which blocked the final
  // tx.university.delete() even after every drive-scoped row was cleared.
  test('sweeps an expired demo university even when it has a notification recipient', async () => {
    const first = await startDemo();
    await api()
      .post('/api/notification-recipients')
      .set(...auth(first.body.admin.token))
      .send({ event: 'NEW_DRIVE', email: 'placement@demo.edu' });

    await prisma.university.update({
      where: { id: first.body.admin.user.universityId },
      data: { demoExpiresAt: new Date(Date.now() - 1000) },
    });

    const second = await startDemo();

    assert.equal(second.status, 201);
    const stillThere = await prisma.university.findUnique({
      where: { id: first.body.admin.user.universityId },
    });
    assert.equal(stillThere, null);
  });

  test('does not sweep a demo university that has not expired yet', async () => {
    const first = await startDemo();
    await startDemo();

    const stillThere = await prisma.university.findUnique({
      where: { id: first.body.admin.user.universityId },
    });
    assert.ok(stillThere, 'a non-expired demo university should survive another /start call');
  });

  test('rate-limits repeated starts from the same caller', async () => {
    for (let i = 0; i < 20; i++) {
      const res = await startDemo();
      assert.equal(res.status, 201);
    }
    const res = await startDemo();
    assert.equal(res.status, 429);
  });
});
