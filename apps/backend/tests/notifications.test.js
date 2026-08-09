const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { resetDb, disconnect } = require('./helpers/db');
const { api, auth, seedScenario } = require('./helpers/factories');
const mailer = require('../src/lib/mailer');

beforeEach(async () => {
  await resetDb();
  mailer._resetLastTestMessage();
});
after(disconnect);

const list = (token) => api().get('/api/notification-recipients').set(...auth(token));
const add = (token, body) =>
  api().post('/api/notification-recipients').set(...auth(token)).send(body);
const remove = (token, id) =>
  api().delete(`/api/notification-recipients/${id}`).set(...auth(token));

describe('notification recipients CRUD', () => {
  test('an admin can add, list, and remove a recipient', async () => {
    const { admin } = await seedScenario();

    const created = await add(admin.token, { event: 'NEW_DRIVE', email: 'placement@uni.edu' });
    assert.equal(created.status, 201);
    assert.equal(created.body.email, 'placement@uni.edu');

    const listed = await list(admin.token);
    assert.equal(listed.status, 200);
    assert.equal(listed.body.length, 1);

    const removed = await remove(admin.token, created.body.id);
    assert.equal(removed.status, 204);

    const listedAfter = await list(admin.token);
    assert.equal(listedAfter.body.length, 0);
  });

  test('lowercases and trims the email', async () => {
    const { admin } = await seedScenario();
    const res = await add(admin.token, { event: 'NEW_DRIVE', email: '  Placement@Uni.EDU  ' });
    assert.equal(res.body.email, 'placement@uni.edu');
  });

  test('rejects an invalid event', async () => {
    const { admin } = await seedScenario();
    const res = await add(admin.token, { event: 'NOT_AN_EVENT', email: 'a@b.com' });
    assert.equal(res.status, 400);
  });

  test('rejects a malformed email', async () => {
    const { admin } = await seedScenario();
    const res = await add(admin.token, { event: 'NEW_DRIVE', email: 'not-an-email' });
    assert.equal(res.status, 400);
  });

  test('rejects a duplicate email for the same event', async () => {
    const { admin } = await seedScenario();
    await add(admin.token, { event: 'NEW_DRIVE', email: 'a@b.com' });
    const res = await add(admin.token, { event: 'NEW_DRIVE', email: 'a@b.com' });
    assert.equal(res.status, 409);
  });

  test('the same email can be subscribed to a different event', async () => {
    const { admin } = await seedScenario();
    await add(admin.token, { event: 'NEW_DRIVE', email: 'a@b.com' });
    const res = await add(admin.token, { event: 'NEW_COMPANY', email: 'a@b.com' });
    assert.equal(res.status, 201);
  });

  test('forbids a student', async () => {
    const { student } = await seedScenario();
    const res = await list(student.token);
    assert.equal(res.status, 403);
  });

  test('cannot remove a recipient belonging to another university', async () => {
    const mine = await seedScenario();
    const other = await seedScenario();
    const created = await add(other.admin.token, { event: 'NEW_DRIVE', email: 'a@b.com' });

    const res = await remove(mine.admin.token, created.body.id);

    assert.equal(res.status, 404);
  });

  test('recipients never leak across universities in the list', async () => {
    const mine = await seedScenario();
    const other = await seedScenario();
    await add(other.admin.token, { event: 'NEW_DRIVE', email: 'a@b.com' });

    const res = await list(mine.admin.token);

    assert.equal(res.body.length, 0);
  });
});

describe('notification triggers', () => {
  test('creating a company notifies the NEW_COMPANY list', async () => {
    const { admin } = await seedScenario();
    await add(admin.token, { event: 'NEW_COMPANY', email: 'a@b.com' });

    const res = await api()
      .post('/api/companies')
      .set(...auth(admin.token))
      .send({ name: 'Acme Corp', industry: 'Widgets' });

    assert.equal(res.status, 201);
    const message = mailer.getLastTestMessage();
    assert.deepEqual(message.bcc.map((b) => b.address), ['a@b.com']);
    assert.match(message.subject, /Acme Corp/);
  });

  test('creating a drive notifies the NEW_DRIVE list', async () => {
    const { admin, company } = await seedScenario();
    await add(admin.token, { event: 'NEW_DRIVE', email: 'a@b.com' });

    const res = await api()
      .post('/api/drives')
      .set(...auth(admin.token))
      .send({
        companyId: company.id,
        title: 'SDE Hiring',
        roles: [{ title: 'SDE', offerType: 'JOB', description: 'Build things', ctcAmount: 1000000 }],
      });

    assert.equal(res.status, 201);
    const message = mailer.getLastTestMessage();
    assert.deepEqual(message.bcc.map((b) => b.address), ['a@b.com']);
    assert.match(message.subject, /SDE Hiring/);
  });

  test('selecting a student notifies the STUDENT_SELECTED list', async () => {
    const { admin, student, drive } = await seedScenario();
    await add(admin.token, { event: 'STUDENT_SELECTED', email: 'a@b.com' });
    const applied = await api()
      .post(`/api/drives/${drive.id}/applications`)
      .set(...auth(student.token))
      .send({ responses: {} });

    const res = await api()
      .patch(`/api/applications/${applied.body.id}/status`)
      .set(...auth(admin.token))
      .send({ status: 'SELECTED' });

    assert.equal(res.status, 200);
    const message = mailer.getLastTestMessage();
    assert.deepEqual(message.bcc.map((b) => b.address), ['a@b.com']);
    assert.match(message.text, /Test Student/);
  });

  test('does not send anything when no recipients are configured', async () => {
    const { admin } = await seedScenario();
    // seedScenario's own OTP-based registration sends a real verification
    // email through this same test mailer — reset after setup so the
    // assertion below reflects only the action under test.
    mailer._resetLastTestMessage();

    const res = await api()
      .post('/api/companies')
      .set(...auth(admin.token))
      .send({ name: 'Nobody Cares Inc' });

    assert.equal(res.status, 201);
    assert.equal(mailer.getLastTestMessage(), null);
  });

  test('other universities recipients are never notified', async () => {
    const mine = await seedScenario();
    const other = await seedScenario();
    await add(other.admin.token, { event: 'NEW_COMPANY', email: 'other-uni@b.com' });
    mailer._resetLastTestMessage();

    await api()
      .post('/api/companies')
      .set(...auth(mine.admin.token))
      .send({ name: 'Scoped Co' });

    const message = mailer.getLastTestMessage();
    assert.equal(message, null);
  });
});
