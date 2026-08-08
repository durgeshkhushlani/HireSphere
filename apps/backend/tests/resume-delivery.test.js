// Plan §4: resumes are emailed to the company's contact at a scheduled
// datetime. Covers both the scheduling endpoint and the dispatcher job that
// actually sends (src/jobs/resumeDispatcher.js) — the dispatcher only ever
// runs from server.js in real life, so it's exercised directly here.
const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { resetDb, disconnect, prisma } = require('./helpers/db');
const { api, auth, seedScenario } = require('./helpers/factories');
const mailer = require('../src/lib/mailer');
const { dispatchDueResumes } = require('../src/jobs/resumeDispatcher');

beforeEach(resetDb);
after(disconnect);

// resumeUrl is no longer request-supplied — it's snapshotted from whatever
// the student's profile has on file at apply time (see
// applications.service.js's applyToDrive), which seedScenario now defaults
// to 'https://example.com/resume.pdf' unless overridden.
const applyWithResume = (driveId, token) =>
  api()
    .post(`/api/drives/${driveId}/applications`)
    .set(...auth(token))
    .send({ responses: {} });

const scheduleResume = (id, token, body) =>
  api()
    .patch(`/api/applications/${id}/schedule-resume`)
    .set(...auth(token))
    .send(body);

describe('PATCH /api/applications/:id/schedule-resume', () => {
  test('an admin can schedule a resume send', async () => {
    const { admin, student, drive } = await seedScenario();
    await prisma.drive.update({
      where: { id: drive.id },
      data: { company: { update: { contactEmail: 'hr@company.com' } } },
    });
    const created = await applyWithResume(drive.id, student.token);

    const res = await scheduleResume(created.body.id, admin.token, {
      dispatchAt: '2099-01-01T00:00:00.000Z',
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.resumeDispatchAt);
    assert.equal(res.body.resumeSentAt, null);
  });

  test('rejects a missing dispatchAt with 400', async () => {
    const { admin, student, drive } = await seedScenario();
    const created = await applyWithResume(drive.id, student.token);

    const res = await scheduleResume(created.body.id, admin.token, {});

    assert.equal(res.status, 400);
  });

  test('rejects when the application has no resumeUrl', async () => {
    // Applying now always requires (and snapshots) a resume, so this state
    // can only arise from data that predates that requirement — simulated
    // here by nulling it out directly rather than through the apply endpoint.
    const { admin, student, drive } = await seedScenario();
    const created = await applyWithResume(drive.id, student.token);
    await prisma.application.update({
      where: { id: created.body.id },
      data: { resumeUrl: null },
    });

    const res = await scheduleResume(created.body.id, admin.token, {
      dispatchAt: '2099-01-01T00:00:00.000Z',
    });

    assert.equal(res.status, 400);
  });

  test("rejects when the company has no contact email on file", async () => {
    const { admin, student, drive } = await seedScenario();
    const created = await applyWithResume(drive.id, student.token);

    const res = await scheduleResume(created.body.id, admin.token, {
      dispatchAt: '2099-01-01T00:00:00.000Z',
    });

    assert.equal(res.status, 400);
  });

  test('is forbidden to students', async () => {
    const { student, drive } = await seedScenario();
    const created = await applyWithResume(drive.id, student.token);

    const res = await scheduleResume(created.body.id, student.token, {
      dispatchAt: '2099-01-01T00:00:00.000Z',
    });

    assert.equal(res.status, 403);
  });

  test('404s for an application in another university', async () => {
    const { admin } = await seedScenario();
    const scenarioTwo = await seedScenario();
    await prisma.drive.update({
      where: { id: scenarioTwo.drive.id },
      data: { company: { update: { contactEmail: 'hr@company.com' } } },
    });
    const foreign = await applyWithResume(scenarioTwo.drive.id, scenarioTwo.student.token);

    const res = await scheduleResume(foreign.body.id, admin.token, {
      dispatchAt: '2099-01-01T00:00:00.000Z',
    });

    assert.equal(res.status, 404);
  });
});

describe('dispatchDueResumes', () => {
  test('sends an email and marks resumeSentAt for a due, unsent application', async () => {
    const { admin, student, drive } = await seedScenario({
      student: { resumeUrl: 'https://example.com/cv.pdf' },
    });
    await prisma.drive.update({
      where: { id: drive.id },
      data: { company: { update: { contactEmail: 'hr@company.com' } } },
    });
    const created = await applyWithResume(drive.id, student.token);
    await scheduleResume(created.body.id, admin.token, {
      dispatchAt: new Date(Date.now() - 1000).toISOString(),
    });

    await dispatchDueResumes();

    const application = await prisma.application.findUnique({ where: { id: created.body.id } });
    assert.ok(application.resumeSentAt);

    const message = mailer.getLastTestMessage();
    assert.equal(message.to[0].address, 'hr@company.com');
    assert.match(message.text, /https:\/\/example\.com\/cv\.pdf/);
  });

  test('does not send for a future dispatchAt', async () => {
    const { admin, student, drive } = await seedScenario();
    await prisma.drive.update({
      where: { id: drive.id },
      data: { company: { update: { contactEmail: 'hr@company.com' } } },
    });
    const created = await applyWithResume(drive.id, student.token);
    await scheduleResume(created.body.id, admin.token, {
      dispatchAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    await dispatchDueResumes();

    const application = await prisma.application.findUnique({ where: { id: created.body.id } });
    assert.equal(application.resumeSentAt, null);
  });

  test('does not re-send an already-sent resume', async () => {
    const { admin, student, drive } = await seedScenario();
    await prisma.drive.update({
      where: { id: drive.id },
      data: { company: { update: { contactEmail: 'hr@company.com' } } },
    });
    const created = await applyWithResume(drive.id, student.token);
    await scheduleResume(created.body.id, admin.token, {
      dispatchAt: new Date(Date.now() - 1000).toISOString(),
    });

    await dispatchDueResumes();
    const sentAtFirst = (await prisma.application.findUnique({ where: { id: created.body.id } }))
      .resumeSentAt;
    await dispatchDueResumes();
    const sentAtSecond = (await prisma.application.findUnique({ where: { id: created.body.id } }))
      .resumeSentAt;

    assert.deepEqual(sentAtFirst, sentAtSecond);
  });

  test("re-scheduling an already-sent resume is rejected", async () => {
    const { admin, student, drive } = await seedScenario();
    await prisma.drive.update({
      where: { id: drive.id },
      data: { company: { update: { contactEmail: 'hr@company.com' } } },
    });
    const created = await applyWithResume(drive.id, student.token);
    await scheduleResume(created.body.id, admin.token, {
      dispatchAt: new Date(Date.now() - 1000).toISOString(),
    });
    await dispatchDueResumes();

    const res = await scheduleResume(created.body.id, admin.token, {
      dispatchAt: new Date(Date.now() + 1000).toISOString(),
    });

    assert.equal(res.status, 400);
  });
});
