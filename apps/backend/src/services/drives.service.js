const prisma = require('../lib/prisma');
const ApiError = require('../lib/ApiError');
const notificationsService = require('./notifications.service');
const companyPortalService = require('./company-portal.service');
const mailer = require('../lib/mailer');

const DRIVE_STATUSES = ['DRAFT', 'OPEN', 'CLOSED'];

// Drives are always scoped to the caller's own university, taken from their
// JWT — never from a client-supplied parameter.
async function requireScoped(driveId, universityId) {
  const drive = await prisma.drive.findFirst({ where: { id: driveId, universityId } });
  if (!drive) throw ApiError.notFound('Drive not found');
  return drive;
}

const ROLES_ORDER = { orderBy: { createdAt: 'asc' } };

async function listForUniversity(universityId) {
  const drives = await prisma.drive.findMany({
    where: { universityId },
    include: { company: true, roles: ROLES_ORDER },
    orderBy: { createdAt: 'desc' },
  });
  return Promise.all(
    drives.map(async (d) => (d.resultsDeclared ? { ...d, results: await getResults(d.id) } : d))
  );
}

// Only meaningful once resultsDeclared — the selected-student list, scoped
// to just name + studentId (never CGPA, email, or anything else), since
// this is shown to every student at the university, not just applicants.
async function getResults(driveId) {
  const selected = await prisma.application.findMany({
    where: { driveId, status: 'SELECTED' },
    include: { studentProfile: { include: { user: { select: { name: true } } } } },
  });
  return selected.map((a) => ({
    name: a.studentProfile.user.name,
    studentId: a.studentProfile.studentId,
  }));
}

async function getForUniversity(driveId, universityId) {
  const drive = await prisma.drive.findFirst({
    where: { id: driveId, universityId },
    include: { company: true, eligiblePrograms: true, roles: ROLES_ORDER },
  });
  if (!drive) throw ApiError.notFound('Drive not found');
  if (!drive.resultsDeclared) return drive;
  return { ...drive, results: await getResults(drive.id) };
}

// Chat-assistant lookup only — backs the search_drives tool. Same
// university scoping as every other query here, just a looser filter
// (partial company name, or an exact id) instead of a single required key.
async function searchDrives(universityId, { companyQuery, driveId } = {}) {
  return prisma.drive.findMany({
    where: {
      universityId,
      ...(driveId && { id: driveId }),
      ...(companyQuery && { company: { name: { contains: companyQuery, mode: 'insensitive' } } }),
    },
    include: { company: true, roles: ROLES_ORDER },
    orderBy: { createdAt: 'desc' },
  });
}

async function create({ companyId, title, description, minCgpa, maxBacklogs }, universityId) {
  if (!companyId || !title) {
    throw ApiError.badRequest('companyId and title are required');
  }
  if (maxBacklogs !== undefined && maxBacklogs !== null && maxBacklogs < 0) {
    throw ApiError.badRequest('maxBacklogs cannot be negative');
  }

  let drive;
  try {
    drive = await prisma.drive.create({
      data: {
        companyId,
        title,
        description,
        universityId,
        ...(minCgpa !== undefined && { minCgpa }),
        ...(maxBacklogs !== undefined && { maxBacklogs }),
      },
      include: { company: true, university: true },
    });
  } catch (err) {
    if (err.code === 'P2003') throw ApiError.badRequest('companyId does not exist');
    throw err;
  }

  try {
    await notificationsService.notify(universityId, 'NEW_DRIVE', {
      subject: `New drive opened: ${drive.title}`,
      text: [
        `A new drive was created on HireSphere.`,
        '',
        `Title: ${drive.title}`,
        `Company: ${drive.company.name}`,
        `Status: ${drive.status}`,
      ].join('\n'),
    });
  } catch (err) {
    console.error('Failed to send new-drive notification:', err);
  }

  // Every drive gets its own company-portal login, generated up front —
  // the one-time plaintext password is only ever available on this
  // response (and the regenerate-password response later).
  const { accessCode, password } = await companyPortalService.createAccess(drive.id);

  if (drive.company.contactEmail) {
    try {
      await mailer.sendMail({
        to: drive.company.contactEmail,
        subject: `HireSphere company portal access — ${drive.title}`,
        text: [
          `You've been given access to review applicants for "${drive.title}" on HireSphere.`,
          '',
          `Portal link: ${companyPortalService.portalUrl(drive.university.domain, accessCode)}`,
          `Password: ${password}`,
          '',
          'This link only shows applicants for this specific drive.',
        ].join('\n'),
      });
    } catch (err) {
      console.error('Failed to send company-portal welcome email:', err);
    }
  }

  return { ...drive, companyAccess: { accessCode, password } };
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

  return prisma.drive.update({
    where: { id: driveId },
    // Stamped every time it's (re-)opened — shown to students as the
    // drive's "start" date. There's no separate scheduled auto-open, only
    // auto-close (setAutoClose below).
    data: { status, ...(status === 'OPEN' && { openedAt: new Date() }) },
  });
}

// Opt-in scheduled close, toggled independently of the status itself —
// autoCloseAt: null disables it. autoCloseDispatcher.js's poller flips the
// drive to CLOSED once it passes.
async function setAutoClose(driveId, universityId, autoCloseAt) {
  await requireScoped(driveId, universityId);

  if (autoCloseAt !== null) {
    if (!autoCloseAt || Number.isNaN(new Date(autoCloseAt).getTime())) {
      throw ApiError.badRequest('autoCloseAt must be a valid date, or null to disable');
    }
    if (new Date(autoCloseAt).getTime() <= Date.now()) {
      throw ApiError.badRequest('autoCloseAt must be in the future');
    }
  }

  return prisma.drive.update({
    where: { id: driveId },
    data: { autoCloseAt: autoCloseAt === null ? null : new Date(autoCloseAt) },
  });
}

// A deliberate, separate step from closing — an admin can close a drive and
// still choose not to reveal who got selected until later.
async function declareResults(driveId, universityId) {
  const drive = await requireScoped(driveId, universityId);
  if (drive.status !== 'CLOSED') {
    throw ApiError.badRequest('Results can only be declared once the drive is closed');
  }
  if (drive.resultsDeclared) {
    throw ApiError.conflict('Results have already been declared for this drive');
  }

  return prisma.drive.update({
    where: { id: driveId },
    data: { resultsDeclared: true, resultsDeclaredAt: new Date() },
  });
}

async function getApplicationForm(driveId, universityId) {
  const drive = await requireScoped(driveId, universityId);

  const form = await prisma.applicationForm.findUnique({ where: { driveId: drive.id } });
  if (!form) throw ApiError.notFound('No application form set for this drive yet');
  return form;
}

// Same data as getApplicationForm, but a drive with no custom questions
// returns an empty list instead of 404ing — used by export.service.js, which
// treats "no form" as "zero question columns" rather than an error.
async function getApplicationFormOrEmpty(driveId, universityId) {
  const drive = await requireScoped(driveId, universityId);
  const form = await prisma.applicationForm.findUnique({ where: { driveId: drive.id } });
  return form ? form.questions : [];
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
  searchDrives,
  create,
  updateDetails,
  updateStatus,
  setAutoClose,
  declareResults,
  getApplicationForm,
  getApplicationFormOrEmpty,
  setApplicationForm,
  getEligiblePrograms,
  setEligiblePrograms,
  setRoles,
};
