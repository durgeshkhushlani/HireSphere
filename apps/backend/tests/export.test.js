const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const { resetDb, disconnect } = require('./helpers/db');
const { api, auth, registerStudent, seedScenario } = require('./helpers/factories');

beforeEach(resetDb);
after(disconnect);

const applyTo = (driveId, token, body = { responses: { q: 'a' } }) =>
  api()
    .post(`/api/drives/${driveId}/applications`)
    .set(...auth(token))
    .send(body);

// supertest/superagent doesn't know the xlsx content type, so it won't
// buffer the response as binary by default — force it, the same recipe used
// for any binary-download test with superagent.
const binaryParser = (res, cb) => {
  res.setEncoding('binary');
  let data = '';
  res.on('data', (chunk) => (data += chunk));
  res.on('end', () => cb(null, Buffer.from(data, 'binary')));
};

const exportFor = (driveId, token, body = {}) =>
  api()
    .post(`/api/drives/${driveId}/applications/export`)
    .set(...auth(token))
    .buffer()
    .parse(binaryParser)
    .send(body);

async function readWorkbook(res) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(res.body);
  return workbook.getWorksheet('Applicants');
}

// row.values is 1-indexed (index 0 is always empty) — drop just that
// leading slot rather than filter(Boolean), which would also drop genuine
// blank cells and misalign header/data indices.
const rowValues = (row) => row.values.slice(1);

describe('POST /api/drives/:driveId/applications/export', () => {
  test('exports every applicant with every default column', async () => {
    const { admin, student, drive } = await seedScenario();
    await applyTo(drive.id, student.token);

    const res = await exportFor(drive.id, admin.token);

    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /spreadsheetml/);
    assert.match(res.headers['content-disposition'], /attachment/);

    const sheet = await readWorkbook(res);
    const headerRow = rowValues(sheet.getRow(1));
    assert.deepEqual(headerRow, [
      'Student Name',
      'Student ID',
      'Program',
      'CGPA',
      'Status',
      'Resume Link',
      'Role Preferences',
    ]);
    assert.equal(sheet.rowCount, 2);
    const dataRow = rowValues(sheet.getRow(2));
    assert.equal(dataRow[0], student.user.name);
    // Written as a real number, not a string, so Excel can sort/filter on it.
    const cgpaValue = dataRow[headerRow.indexOf('CGPA')];
    assert.equal(typeof cgpaValue, 'number');
    assert.equal(cgpaValue, 8.5);
  });

  test('names the file after the company and the drive', async () => {
    const { admin, student, company, drive } = await seedScenario({
      drive: { title: 'Summer Internship 2026' },
    });
    await applyTo(drive.id, student.token);

    const res = await exportFor(drive.id, admin.token);

    assert.equal(res.status, 200);
    const disposition = res.headers['content-disposition'];
    assert.match(disposition, /\.xlsx"$/);
    assert.match(disposition, /Summer-Internship-2026/);
    const companySlugStart = company.name.split(/[^a-zA-Z0-9]+/)[0];
    assert.ok(disposition.includes(companySlugStart));
    // The company name comes first, ahead of the drive title.
    assert.ok(disposition.indexOf(companySlugStart) < disposition.indexOf('Summer-Internship-2026'));
  });

  test('filters rows by the requested statuses', async () => {
    const { university, program, admin, student, drive } = await seedScenario();
    const other = await registerStudent(university.id, program.id);
    const shortlisted = await applyTo(drive.id, student.token);
    await applyTo(drive.id, other.token);
    await api()
      .patch(`/api/applications/${shortlisted.body.id}/status`)
      .set(...auth(admin.token))
      .send({ status: 'SHORTLISTED' });

    const res = await exportFor(drive.id, admin.token, { statuses: ['SHORTLISTED'] });

    assert.equal(res.status, 200);
    const sheet = await readWorkbook(res);
    assert.equal(sheet.rowCount, 2);
    const headerRow = rowValues(sheet.getRow(1));
    const statusIndex = headerRow.indexOf('Status');
    assert.equal(rowValues(sheet.getRow(2))[statusIndex], 'SHORTLISTED');
  });

  test('only includes the requested columns', async () => {
    const { admin, student, drive } = await seedScenario();
    await applyTo(drive.id, student.token);

    const res = await exportFor(drive.id, admin.token, {
      columns: ['studentName', 'studentId'],
    });

    assert.equal(res.status, 200);
    const sheet = await readWorkbook(res);
    const headerRow = rowValues(sheet.getRow(1));
    assert.deepEqual(headerRow, ['Student Name', 'Student ID']);
  });

  test('includes one column per custom application question', async () => {
    const { admin, student, drive } = await seedScenario();
    await api()
      .put(`/api/drives/${drive.id}/application-form`)
      .set(...auth(admin.token))
      .send({ questions: [{ id: 'q1', label: 'Why this role?' }] });
    await applyTo(drive.id, student.token, { responses: { q1: 'Because I love it' } });

    const res = await exportFor(drive.id, admin.token);

    assert.equal(res.status, 200);
    const sheet = await readWorkbook(res);
    const headerRow = rowValues(sheet.getRow(1));
    assert.ok(headerRow.includes('Why this role?'));
    const questionIndex = headerRow.indexOf('Why this role?');
    assert.equal(rowValues(sheet.getRow(2))[questionIndex], 'Because I love it');
  });

  test('drops unknown/stale column keys instead of erroring', async () => {
    const { admin, student, drive } = await seedScenario();
    await applyTo(drive.id, student.token);

    const res = await exportFor(drive.id, admin.token, {
      columns: ['studentName', 'question:does-not-exist'],
    });

    assert.equal(res.status, 200);
    const sheet = await readWorkbook(res);
    const headerRow = rowValues(sheet.getRow(1));
    assert.deepEqual(headerRow, ['Student Name']);
  });

  test('rejects an invalid status value', async () => {
    const { admin, drive } = await seedScenario();
    const res = await exportFor(drive.id, admin.token, { statuses: ['NOT_A_STATUS'] });
    assert.equal(res.status, 400);
  });

  test('rejects an empty column selection', async () => {
    const { admin, student, drive } = await seedScenario();
    await applyTo(drive.id, student.token);
    const res = await exportFor(drive.id, admin.token, { columns: ['does-not-exist'] });
    assert.equal(res.status, 400);
  });

  test('is forbidden to students', async () => {
    const { student, drive } = await seedScenario();
    const res = await exportFor(drive.id, student.token);
    assert.equal(res.status, 403);
  });

  test('404s for a drive in a different university', async () => {
    const { drive } = await seedScenario();
    const other = await seedScenario();
    const res = await exportFor(drive.id, other.admin.token);
    assert.equal(res.status, 404);
  });
});
