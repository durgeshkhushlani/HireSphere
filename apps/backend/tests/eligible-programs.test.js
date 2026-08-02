// Program eligibility restriction on a drive (DriveEligibleProgram). No rows
// for a drive means it's open to every program — same convention as the
// null minCgpa/maxBacklogs eligibility columns.
const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { resetDb, disconnect } = require('./helpers/db');
const {
  api,
  auth,
  createUniversity,
  createProgram,
  createUniversityProgram,
  createCompany,
  createDrive,
  seedScenario,
} = require('./helpers/factories');

beforeEach(resetDb);
after(disconnect);

const getEligible = (driveId, token) =>
  api()
    .get(`/api/drives/${driveId}/eligible-programs`)
    .set(...auth(token));

const putEligible = (driveId, token, programIds) =>
  api()
    .put(`/api/drives/${driveId}/eligible-programs`)
    .set(...auth(token))
    .send({ programIds });

const applyTo = (driveId, token) =>
  api()
    .post(`/api/drives/${driveId}/applications`)
    .set(...auth(token))
    .send({ responses: {} });

describe('GET /api/drives/:driveId/eligible-programs', () => {
  test('empty by default (no restriction)', async () => {
    const { admin, drive } = await seedScenario();

    const res = await getEligible(drive.id, admin.token);

    assert.equal(res.status, 200);
    assert.deepEqual(res.body, []);
  });

  test('a student can read it', async () => {
    const { student, drive } = await seedScenario();

    const res = await getEligible(drive.id, student.token);

    assert.equal(res.status, 200);
  });

  test('404s for a drive belonging to another university', async () => {
    const { admin } = await seedScenario();
    const other = await createUniversity();
    const otherCompany = await createCompany();
    const foreignDrive = await createDrive(other.id, otherCompany.id, { status: 'OPEN' });

    const res = await getEligible(foreignDrive.id, admin.token);

    assert.equal(res.status, 404);
  });
});

describe('PUT /api/drives/:driveId/eligible-programs', () => {
  test('sets the eligible program list', async () => {
    const { university, admin, drive, program } = await seedScenario();
    await createUniversityProgram(university.id, program.id);

    const put = await putEligible(drive.id, admin.token, [program.id]);
    assert.equal(put.status, 200);
    assert.equal(put.body.length, 1);
    assert.equal(put.body[0].id, program.id);

    const get = await getEligible(drive.id, admin.token);
    assert.equal(get.body.length, 1);
    assert.equal(get.body[0].id, program.id);
  });

  test('replaces the previous set rather than appending', async () => {
    const { university, admin, drive, program } = await seedScenario();
    await createUniversityProgram(university.id, program.id);
    const secondProgram = await createProgram();
    await createUniversityProgram(university.id, secondProgram.id);

    await putEligible(drive.id, admin.token, [program.id]);
    const second = await putEligible(drive.id, admin.token, [secondProgram.id]);

    assert.equal(second.body.length, 1);
    assert.equal(second.body[0].id, secondProgram.id);
  });

  test('an empty array clears the restriction', async () => {
    const { university, admin, drive, program } = await seedScenario();
    await createUniversityProgram(university.id, program.id);
    await putEligible(drive.id, admin.token, [program.id]);

    const res = await putEligible(drive.id, admin.token, []);

    assert.equal(res.status, 200);
    assert.deepEqual(res.body, []);
  });

  test('dedupes repeated programIds instead of erroring', async () => {
    const { university, admin, drive, program } = await seedScenario();
    await createUniversityProgram(university.id, program.id);

    const res = await putEligible(drive.id, admin.token, [program.id, program.id]);

    assert.equal(res.status, 200);
    assert.equal(res.body.length, 1);
  });

  test('rejects a program not offered at this university with 400', async () => {
    const { admin, drive, program } = await seedScenario();
    // Deliberately not linked via createUniversityProgram.

    const res = await putEligible(drive.id, admin.token, [program.id]);

    assert.equal(res.status, 400);
  });

  test('rejects a non-array payload with 400', async () => {
    const { admin, drive } = await seedScenario();

    const res = await putEligible(drive.id, admin.token, 'not-an-array');

    assert.equal(res.status, 400);
  });

  test('forbids a student from setting it', async () => {
    const { student, drive } = await seedScenario();

    const res = await putEligible(drive.id, student.token, []);

    assert.equal(res.status, 403);
  });

  test('cannot set eligibility on a drive belonging to another university', async () => {
    const { admin } = await seedScenario();
    const other = await createUniversity();
    const otherCompany = await createCompany();
    const foreignDrive = await createDrive(other.id, otherCompany.id, { status: 'OPEN' });

    const res = await putEligible(foreignDrive.id, admin.token, []);

    assert.equal(res.status, 404);
  });
});

describe('applying respects program eligibility', () => {
  test('a student in an eligible program can apply', async () => {
    const { university, admin, student, drive, program } = await seedScenario();
    await createUniversityProgram(university.id, program.id);
    await putEligible(drive.id, admin.token, [program.id]);

    const res = await applyTo(drive.id, student.token);

    assert.equal(res.status, 201);
  });

  test('a student outside the eligible programs is blocked', async () => {
    const { university, admin, student, drive, program } = await seedScenario();
    await createUniversityProgram(university.id, program.id);
    const otherProgram = await createProgram();
    await createUniversityProgram(university.id, otherProgram.id);
    await putEligible(drive.id, admin.token, [otherProgram.id]);

    const res = await applyTo(drive.id, student.token);

    assert.equal(res.status, 403);
    assert.match(res.body.error, /program/i);
  });

  test('no eligible-programs rows means every program can apply', async () => {
    const { student, drive } = await seedScenario();

    const res = await applyTo(drive.id, student.token);

    assert.equal(res.status, 201);
  });

  test('clearing the restriction re-opens the drive to all programs', async () => {
    const { university, admin, student, drive } = await seedScenario();
    const otherProgram = await createProgram();
    await createUniversityProgram(university.id, otherProgram.id);
    await putEligible(drive.id, admin.token, [otherProgram.id]);
    await putEligible(drive.id, admin.token, []);

    const res = await applyTo(drive.id, student.token);

    assert.equal(res.status, 201);
  });
});
