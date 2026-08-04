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

const ROLES_ORDER = { orderBy: { createdAt: 'asc' } };

function listForUniversity(universityId) {
  return prisma.drive.findMany({
    where: { universityId },
    include: { company: true, roles: ROLES_ORDER },
    orderBy: { createdAt: 'desc' },
  });
}

async function getForUniversity(driveId, universityId) {
  const drive = await prisma.drive.findFirst({
    where: { id: driveId, universityId },
    include: { company: true, eligiblePrograms: true, roles: ROLES_ORDER },
  });
  if (!drive) throw ApiError.notFound('Drive not found');
  return drive;
}

async function create({ companyId, title, description, minCgpa, maxBacklogs }, universityId) {
  if (!companyId || !title) {
    throw ApiError.badRequest('companyId and title are required');
  }
  if (maxBacklogs !== undefined && maxBacklogs !== null && maxBacklogs < 0) {
    throw ApiError.badRequest('maxBacklogs cannot be negative');
  }

  try {
    return await prisma.drive.create({
      data: {
        companyId,
        title,
        description,
        universityId,
        ...(minCgpa !== undefined && { minCgpa }),
        ...(maxBacklogs !== undefined && { maxBacklogs }),
      },
    });
  } catch (err) {
    if (err.code === 'P2003') throw ApiError.badRequest('companyId does not exist');
    throw err;
  }
}

// title/description/minCgpa/maxBacklogs were previously only settable at
// creation — there was no way to edit them afterward at all.
async function updateDetails(driveId, universityId, { title, description, minCgpa, maxBacklogs }) {
  await requireScoped(driveId, universityId);

  if (title !== undefined && !title.trim()) {
    throw ApiError.badRequest('title cannot be empty');
  }
  if (maxBacklogs !== undefined && maxBacklogs !== null && maxBacklogs < 0) {
    throw ApiError.badRequest('maxBacklogs cannot be negative');
  }

  return prisma.drive.update({
    where: { id: driveId },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description }),
      ...(minCgpa !== undefined && { minCgpa }),
      ...(maxBacklogs !== undefined && { maxBacklogs }),
    },
    include: { company: true, eligiblePrograms: true, roles: ROLES_ORDER },
  });
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

// No rows for a drive means "no program restriction" — same convention as
// the null minCgpa/maxBacklogs columns.
async function getEligiblePrograms(driveId, universityId) {
  const drive = await requireScoped(driveId, universityId);

  const rows = await prisma.driveEligibleProgram.findMany({
    where: { driveId: drive.id },
    include: { universityProgram: { include: { program: true } } },
  });
  return rows.map((row) => row.universityProgram.program);
}

async function setEligiblePrograms(driveId, universityId, programIds) {
  if (!Array.isArray(programIds)) {
    throw ApiError.badRequest('programIds must be an array');
  }

  const drive = await requireScoped(driveId, universityId);
  const uniqueProgramIds = [...new Set(programIds)];

  // A program can only be made eligible if this university actually offers
  // it (i.e. a UniversityProgram link exists) — the join table this feature
  // hangs off scopes eligibility per-university, not per-program globally.
  const universityPrograms = await prisma.universityProgram.findMany({
    where: { universityId, programId: { in: uniqueProgramIds } },
  });
  if (universityPrograms.length !== uniqueProgramIds.length) {
    throw ApiError.badRequest('One or more programIds are not offered at this university');
  }

  await prisma.$transaction(async (tx) => {
    await tx.driveEligibleProgram.deleteMany({ where: { driveId: drive.id } });
    if (universityPrograms.length > 0) {
      await tx.driveEligibleProgram.createMany({
        data: universityPrograms.map((up) => ({
          driveId: drive.id,
          universityProgramId: up.id,
        })),
      });
    }
  });

  return getEligiblePrograms(drive.id, universityId);
}

const OFFER_TYPES = ['INTERNSHIP', 'JOB'];

function validateRole(role) {
  if (!role.title || !role.title.trim()) {
    throw ApiError.badRequest('Each role needs a title');
  }
  if (!OFFER_TYPES.includes(role.offerType)) {
    throw ApiError.badRequest(`offerType must be one of: ${OFFER_TYPES.join(', ')}`);
  }
  if (!role.description || !role.description.trim()) {
    throw ApiError.badRequest('Each role needs a description (JD)');
  }
  if (role.offerType === 'JOB') {
    if (role.ctcAmount == null) {
      throw ApiError.badRequest('ctcAmount is required for a Job role');
    }
    if (role.stipendAmount != null) {
      throw ApiError.badRequest('stipendAmount must not be set for a Job role');
    }
  } else {
    if (role.stipendAmount == null) {
      throw ApiError.badRequest('stipendAmount is required for an Internship role');
    }
    if (role.ctcAmount != null) {
      throw ApiError.badRequest('ctcAmount must not be set for an Internship role');
    }
  }
}

// Full-replace, same shape as setApplicationForm/setEligiblePrograms: the
// admin's roles page always submits the complete current set. Roles not
// present in the incoming array are deleted — unless a student has already
// preferenced one, in which case the whole request is rejected up front so
// preference data is never silently orphaned.
async function setRoles(driveId, universityId, roles) {
  if (!Array.isArray(roles)) {
    throw ApiError.badRequest('roles must be an array');
  }
  roles.forEach(validateRole);

  const drive = await requireScoped(driveId, universityId);

  const existingRoles = await prisma.driveRole.findMany({ where: { driveId: drive.id } });
  const existingIds = new Set(existingRoles.map((r) => r.id));

  for (const role of roles) {
    if (role.id && !existingIds.has(role.id)) {
      throw ApiError.badRequest('One or more role ids do not belong to this drive');
    }
  }

  const incomingIds = new Set(roles.filter((r) => r.id).map((r) => r.id));
  const toDelete = existingRoles.filter((r) => !incomingIds.has(r.id));

  if (toDelete.length > 0) {
    const preferenceCount = await prisma.applicationRolePreference.count({
      where: { driveRoleId: { in: toDelete.map((r) => r.id) } },
    });
    if (preferenceCount > 0) {
      throw ApiError.conflict(
        'One or more roles being removed already have student applications against them — keep them instead of deleting'
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    if (toDelete.length > 0) {
      await tx.driveRole.deleteMany({ where: { id: { in: toDelete.map((r) => r.id) } } });
    }
    for (const role of roles) {
      const data = {
        title: role.title.trim(),
        offerType: role.offerType,
        description: role.description.trim(),
        ctcAmount: role.offerType === 'JOB' ? role.ctcAmount : null,
        stipendAmount: role.offerType === 'INTERNSHIP' ? role.stipendAmount : null,
      };
      if (role.id) {
        await tx.driveRole.update({ where: { id: role.id }, data });
      } else {
        await tx.driveRole.create({ data: { ...data, driveId: drive.id } });
      }
    }
  });

  return prisma.driveRole.findMany({ where: { driveId: drive.id }, ...ROLES_ORDER });
}

module.exports = {
  DRIVE_STATUSES,
  requireScoped,
  listForUniversity,
  getForUniversity,
  create,
  updateDetails,
  updateStatus,
  getApplicationForm,
  setApplicationForm,
  getEligiblePrograms,
  setEligiblePrograms,
  setRoles,
};
