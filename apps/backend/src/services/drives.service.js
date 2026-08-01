const prisma = require('../lib/prisma');
const ApiError = require('../lib/ApiError');

const DRIVE_STATUSES = ['DRAFT', 'OPEN', 'CLOSED'];

// Drives are always scoped to the caller's own university, taken from their
// JWT — never from a client-supplied parameter.
async function requireScoped(driveId, universityId) {
  const drive = await prisma.drive.findFirst({ where: { id: driveId, universityId } });
  if (!drive) throw ApiError.notFound('Drive not found');
  return drive;
}

function listForUniversity(universityId) {
  return prisma.drive.findMany({
    where: { universityId },
    include: { company: true },
    orderBy: { createdAt: 'desc' },
  });
}

async function getForUniversity(driveId, universityId) {
  const drive = await prisma.drive.findFirst({
    where: { id: driveId, universityId },
    include: { company: true, eligiblePrograms: true },
  });
  if (!drive) throw ApiError.notFound('Drive not found');
  return drive;
}

async function create({ companyId, title, description }, universityId) {
  if (!companyId || !title) {
    throw ApiError.badRequest('companyId and title are required');
  }

  try {
    return await prisma.drive.create({
      data: { companyId, title, description, universityId },
    });
  } catch (err) {
    if (err.code === 'P2003') throw ApiError.badRequest('companyId does not exist');
    throw err;
  }
}

async function updateStatus(driveId, universityId, status) {
  if (!DRIVE_STATUSES.includes(status)) {
    throw ApiError.badRequest(`status must be one of: ${DRIVE_STATUSES.join(', ')}`);
  }

  await requireScoped(driveId, universityId);

  return prisma.drive.update({ where: { id: driveId }, data: { status } });
}

async function getApplicationForm(driveId, universityId) {
  const drive = await requireScoped(driveId, universityId);

  const form = await prisma.applicationForm.findUnique({ where: { driveId: drive.id } });
  if (!form) throw ApiError.notFound('No application form set for this drive yet');
  return form;
}

async function setApplicationForm(driveId, universityId, questions) {
  if (!Array.isArray(questions)) {
    throw ApiError.badRequest('questions must be an array');
  }

  const drive = await requireScoped(driveId, universityId);

  return prisma.applicationForm.upsert({
    where: { driveId: drive.id },
    update: { questions },
    create: { driveId: drive.id, questions },
  });
}

module.exports = {
  DRIVE_STATUSES,
  requireScoped,
  listForUniversity,
  getForUniversity,
  create,
  updateStatus,
  getApplicationForm,
  setApplicationForm,
};
