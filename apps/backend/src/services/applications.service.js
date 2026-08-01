const prisma = require('../lib/prisma');
const ApiError = require('../lib/ApiError');
const drivesService = require('./drives.service');

const APPLICATION_STATUSES = [
  'APPLIED',
  'SHORTLISTED',
  'OA_TEST',
  'INTERVIEW',
  'SELECTED',
  'NOT_SELECTED',
];

const APPLICANT_INCLUDE = {
  studentProfile: {
    include: {
      user: { select: { id: true, name: true, email: true } },
      program: true,
    },
  },
};

async function applyToDrive({ driveId, universityId, studentProfileId, responses, resumeUrl }) {
  if (responses === undefined) {
    throw ApiError.badRequest('responses is required');
  }

  const drive = await drivesService.requireScoped(driveId, universityId);
  if (drive.status !== 'OPEN') {
    throw ApiError.badRequest('This drive is not currently open for applications');
  }

  try {
    return await prisma.application.create({
      data: { driveId: drive.id, studentProfileId, responses, resumeUrl },
    });
  } catch (err) {
    if (err.code === 'P2002') throw ApiError.conflict('You have already applied to this drive');
    throw err;
  }
}

async function listForDrive(driveId, universityId) {
  const drive = await drivesService.requireScoped(driveId, universityId);

  return prisma.application.findMany({
    where: { driveId: drive.id },
    include: APPLICANT_INCLUDE,
    orderBy: { createdAt: 'asc' },
  });
}

function listForStudent(studentProfileId) {
  return prisma.application.findMany({
    where: { studentProfileId },
    include: { drive: { include: { company: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

// Visible to the owning student, or to any admin of the same university.
// Cross-university reads 404 rather than 403 so they don't leak existence.
async function getForUser(id, user) {
  const application = await prisma.application.findUnique({
    where: { id },
    include: { drive: { include: { company: true } } },
  });

  if (!application || application.drive.universityId !== user.universityId) {
    throw ApiError.notFound('Application not found');
  }

  const isOwner = user.role === 'STUDENT' && application.studentProfileId === user.id;
  const isAdmin = user.role === 'ADMIN';
  if (!isOwner && !isAdmin) {
    throw ApiError.forbidden('Insufficient permissions');
  }

  return application;
}

async function updateStatus(id, universityId, { status, interviewSlot, interviewVenue }) {
  if (!APPLICATION_STATUSES.includes(status)) {
    throw ApiError.badRequest(`status must be one of: ${APPLICATION_STATUSES.join(', ')}`);
  }

  const application = await prisma.application.findUnique({
    where: { id },
    include: { drive: true },
  });
  if (!application || application.drive.universityId !== universityId) {
    throw ApiError.notFound('Application not found');
  }

  return prisma.application.update({
    where: { id },
    data: {
      status,
      ...(interviewSlot !== undefined && { interviewSlot: new Date(interviewSlot) }),
      ...(interviewVenue !== undefined && { interviewVenue }),
    },
  });
}

module.exports = {
  APPLICATION_STATUSES,
  applyToDrive,
  listForDrive,
  listForStudent,
  getForUser,
  updateStatus,
};
