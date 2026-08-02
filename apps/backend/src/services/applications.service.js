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

// Plan §4: eligibility is checked automatically against the student's stored
// profile. A null criterion on the drive means "no restriction on that dimension".
async function assertEligible(drive, studentProfileId) {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: studentProfileId },
  });
  if (!profile) {
    throw ApiError.notFound('Student profile not found');
  }

  // Global placement lock: once selected anywhere, no further applications.
  if (profile.placementLocked) {
    throw ApiError.forbidden('You are already placed and cannot apply to further drives');
  }

  if (drive.minCgpa != null && Number(profile.cgpa) < Number(drive.minCgpa)) {
    throw ApiError.forbidden(`This drive requires a minimum CGPA of ${drive.minCgpa}`);
  }

  if (drive.maxBacklogs != null && profile.backlogCount > drive.maxBacklogs) {
    throw ApiError.forbidden(`This drive allows at most ${drive.maxBacklogs} backlog(s)`);
  }

  // Program restriction: no DriveEligibleProgram rows means open to every program.
  const eligiblePrograms = await prisma.driveEligibleProgram.findMany({
    where: { driveId: drive.id },
    include: { universityProgram: true },
  });
  if (eligiblePrograms.length > 0) {
    const allowedProgramIds = eligiblePrograms.map((ep) => ep.universityProgram.programId);
    if (!allowedProgramIds.includes(profile.programId)) {
      throw ApiError.forbidden('Your program is not eligible for this drive');
    }
  }
}

async function applyToDrive({ driveId, universityId, studentProfileId, responses, resumeUrl }) {
  if (responses === undefined) {
    throw ApiError.badRequest('responses is required');
  }

  const drive = await drivesService.requireScoped(driveId, universityId);
  if (drive.status !== 'OPEN') {
    throw ApiError.badRequest('This drive is not currently open for applications');
  }

  await assertEligible(drive, studentProfileId);

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

async function updateStatus(
  id,
  universityId,
  { status, interviewSlot, interviewVenue, packageAmount }
) {
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

  const wasSelected = application.status === 'SELECTED';
  const nowSelected = status === 'SELECTED';

  // Status change, placement record and placement lock must move together —
  // a partial write here would either lock a student with no placement on
  // record, or record a placement without locking them.
  return prisma.$transaction(async (tx) => {
    const updated = await tx.application.update({
      where: { id },
      data: {
        status,
        ...(interviewSlot !== undefined && { interviewSlot: new Date(interviewSlot) }),
        ...(interviewVenue !== undefined && { interviewVenue }),
      },
    });

    if (nowSelected && !wasSelected) {
      await tx.placement.create({
        data: {
          universityId: application.drive.universityId,
          userId: application.studentProfileId,
          companyId: application.drive.companyId,
          driveId: application.drive.id,
          ...(packageAmount !== undefined && { packageAmount }),
        },
      });
      await tx.studentProfile.update({
        where: { userId: application.studentProfileId },
        data: { placementLocked: true },
      });
    } else if (wasSelected && !nowSelected) {
      // Admin undoing a selection. Without this the student would stay
      // permanently locked out of every future drive.
      await tx.placement.deleteMany({
        where: { driveId: application.driveId, userId: application.studentProfileId },
      });
      await tx.studentProfile.update({
        where: { userId: application.studentProfileId },
        data: { placementLocked: false },
      });
    }

    return updated;
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
