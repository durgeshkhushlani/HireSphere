const ExcelJS = require('exceljs');
const ApiError = require('../lib/ApiError');
const drivesService = require('./drives.service');
const applicationsService = require('./applications.service');

const FIXED_COLUMNS = [
  { key: 'studentName', header: 'Student Name' },
  { key: 'studentId', header: 'Student ID' },
  { key: 'program', header: 'Program' },
  { key: 'cgpa', header: 'CGPA' },
  { key: 'status', header: 'Status' },
  { key: 'resumeLink', header: 'Resume Link' },
  { key: 'preferences', header: 'Role Preferences' },
];

function fixedValue(key, application) {
  switch (key) {
    case 'studentName':
      return application.studentProfile.user.name;
    case 'studentId':
      return application.studentProfile.studentId ?? '';
    case 'program':
      return application.studentProfile.program.name;
    case 'cgpa':
      // Prisma returns Decimal fields as strings — cast to a real number so
      // Excel treats the column as sortable/numeric instead of text.
      return Number(application.studentProfile.cgpa);
    case 'status':
      return application.status;
    case 'resumeLink':
      return application.resumeUrl ?? '';
    case 'preferences':
      return application.rolePreferences.map((p) => `${p.rank}. ${p.driveRole.title}`).join('; ');
    default:
      return '';
  }
}

// The canonical column set for a drive: the fixed columns above, plus one
// per custom application question, keyed `question:<id>` so its value can be
// looked up from `application.responses`. This is the server's source of
// truth for what's exportable — a request only selects a subset of these,
// it never introduces new ones.
async function availableColumns(driveId, universityId) {
  const questions = await drivesService.getApplicationFormOrEmpty(driveId, universityId);
  return [
    ...FIXED_COLUMNS,
    ...questions.map((q) => ({ key: `question:${q.id}`, header: q.label, questionId: q.id })),
  ];
}

async function exportForDrive(driveId, universityId, { statuses, columns } = {}) {
  if (statuses !== undefined && !Array.isArray(statuses)) {
    throw ApiError.badRequest('statuses must be an array');
  }
  if (
    statuses !== undefined &&
    statuses.some((s) => !applicationsService.APPLICATION_STATUSES.includes(s))
  ) {
    throw ApiError.badRequest(
      `statuses must only contain: ${applicationsService.APPLICATION_STATUSES.join(', ')}`
    );
  }
  if (columns !== undefined && !Array.isArray(columns)) {
    throw ApiError.badRequest('columns must be an array');
  }

  const drive = await drivesService.getForUniversity(driveId, universityId);
  const available = await availableColumns(driveId, universityId);

  // A whitelist intersection, never client-supplied columns directly — an
  // unknown/stale key (e.g. a question deleted after the export dialog was
  // opened) is silently dropped instead of erroring.
  const requested = Array.isArray(columns) ? new Set(columns) : null;
  const selected = requested ? available.filter((c) => requested.has(c.key)) : available;
  if (selected.length === 0) {
    throw ApiError.badRequest('At least one column must be selected');
  }

  const applications = await applicationsService.listForDriveByStatus(driveId, universityId, statuses);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Applicants');
  sheet.columns = selected.map((c) => ({ header: c.header, key: c.key, width: 24 }));
  for (const application of applications) {
    const row = {};
    for (const column of selected) {
      row[column.key] = column.questionId
        ? application.responses[column.questionId] ?? ''
        : fixedValue(column.key, application);
    }
    sheet.addRow(row);
  }
  sheet.getRow(1).font = { bold: true };

  return { workbook, drive };
}

module.exports = { availableColumns, exportForDrive };
