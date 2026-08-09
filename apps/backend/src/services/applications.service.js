const prisma = require('../lib/prisma');
const ApiError = require('../lib/ApiError');
const drivesService = require('./drives.service');
const notificationsService = require('./notifications.service');

const APPLICATION_STATUSES = [
  'APPLIED',
  'SHORTLISTED',
  'OA_TEST',
  'INTERVIEW',
  'SELECTED',
  'NOT_SELECTED',
];

// Interview slot/venue only make sense once an applicant has actually
// reached the OA/Test or Interview stage.
const SLOT_ALLOWED_STATUSES = ['OA_TEST', 'INTERVIEW'];

// A student's ranked role preferences, plus whichever one they were finally
// placed into (set by updateStatus when moving to SELECTED).
const ROLE_PREFERENCES_INCLUDE = {
  rolePreferences: {
    include: { driveRole: true },
    orderBy: { rank: 'asc' },
  },
  selectedRole: true,
};

const APPLICANT_INCLUDE = {
  studentProfile: {
    include: {
      user: { select: { id: true, name: true, email: true } },
      program: true,
    },
  },
  ...ROLE_PREFERENCES_INCLUDE,
};

// Plan §4: eligibility is checked automatically against the student's stored
// profile. A null criterion on the drive means "no restriction on that
// dimension". Returns the profile so callers (applyToDrive) don't need a
// second fetch just to read resumeUrl.
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

  if (!profile.resumeUrl) {
    throw ApiError.badRequest('Upload a resume to your profile before applying');
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

  return profile;
}

// Shared by applyToDrive and updateMyApplication — required whenever the
// drive actually has roles defined (legacy drives with none skip this). If
// rolePreferences is provided at all, it's always validated against this
// drive's actual roles, so a stray id from some other drive is rejected
// rather than silently ignored.
async function validateRolePreferences(drive, rolePreferences) {
  const roles = await prisma.driveRole.findMany({ where: { driveId: drive.id } });
  if (roles.length > 0 && (!Array.isArray(rolePreferences) || rolePreferences.length === 0)) {
    throw ApiError.badRequest('rolePreferences is required for this drive');
  }
  if (rolePreferences !== undefined) {
    if (!Array.isArray(rolePreferences)) {
      throw ApiError.badRequest('rolePreferences must be an array');
    }
    if (new Set(rolePreferences).size !== rolePreferences.length) {
      throw ApiError.badRequest('rolePreferences cannot contain duplicates');
    }
    const roleIds = new Set(roles.map((r) => r.id));
    if (rolePreferences.some((id) => !roleIds.has(id))) {
      throw ApiError.badRequest('One or more rolePreferences do not belong to this drive');
    }
  }
}

// resumeUrl is never client-supplied — it's a snapshot of whatever's on the
// student's profile at the moment they apply, taken automatically so a
// later profile update doesn't retroactively change what a company already
// received for a past application.
async function applyToDrive({ driveId, universityId, studentProfileId, responses, rolePreferences }) {
  if (responses === undefined) {
    throw ApiError.badRequest('responses is required');
  }

  const drive = await drivesService.requireScoped(driveId, universityId);
  if (drive.status !== 'OPEN') {
    throw ApiError.badRequest('This drive is not currently open for applications');
  }

  const profile = await assertEligible(drive, studentProfileId);
  await validateRolePreferences(drive, rolePreferences);

  try {
    return await prisma.$transaction(async (tx) => {
      const application = await tx.application.create({
        data: { driveId: drive.id, studentProfileId, responses, resumeUrl: profile.resumeUrl },
      });
      if (Array.isArray(rolePreferences) && rolePreferences.length > 0) {
        await tx.applicationRolePreference.createMany({
          data: rolePreferences.map((driveRoleId, index) => ({
            applicationId: application.id,
            driveRoleId,
            rank: index + 1,
          })),
        });
      }
      return application;
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

// Same as listForDrive, but restricted to the given statuses — backs the
// Excel export, where an admin can choose which stages to include.
async function listForDriveByStatus(driveId, universityId, statuses) {
  const drive = await drivesService.requireScoped(driveId, universityId);

  return prisma.application.findMany({
    where: {
      driveId: drive.id,
      ...(Array.isArray(statuses) && statuses.length > 0 && { status: { in: statuses } }),
    },
    include: APPLICANT_INCLUDE,
    orderBy: { createdAt: 'asc' },
  });
}

// Chat-assistant lookup only — backs the admin-only find_applicants tool.
// Scoped by universityId via the drive relation, never a client-supplied id.
async function searchForUniversity(universityId, { query, applicationId, driveQuery } = {}) {
  return prisma.application.findMany({
    where: {
      drive: {
        universityId,
        ...(driveQuery && {
          OR: [
            { title: { contains: driveQuery, mode: 'insensitive' } },
            { company: { name: { contains: driveQuery, mode: 'insensitive' } } },
          ],
        }),
      },
      ...(applicationId && { id: applicationId }),
      ...(query && {
        studentProfile: {
          user: {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
            ],
          },
        },
      }),
    },
    include: { ...APPLICANT_INCLUDE, drive: { include: { company: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

function listForStudent(studentProfileId) {
  return prisma.application.findMany({
    where: { studentProfileId },
    include: { drive: { include: { company: true } }, ...ROLE_PREFERENCES_INCLUDE },
    orderBy: { createdAt: 'desc' },
  });
}

// Visible to the owning student, or to any admin of the same university.
// Cross-university reads 404 rather than 403 so they don't leak existence.
async function getForUser(id, user) {
  const application = await prisma.application.findUnique({
    where: { id },
    include: { drive: { include: { company: true } }, ...ROLE_PREFERENCES_INCLUDE },
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

// The one gate shared by withdraw and self-edit: a student may only change
// their mind while the drive is still accepting applications (OPEN, or
// auto-closed out from under it — same check either way) and before an
// admin has moved them past the initial APPLIED stage.
async function requireEditableByStudent(applicationId, studentProfileId) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { drive: true },
  });
  if (!application || application.studentProfileId !== studentProfileId) {
    throw ApiError.notFound('Application not found');
  }
  if (application.status !== 'APPLIED' || application.drive.status !== 'OPEN') {
    throw ApiError.badRequest(
      'This application can no longer be withdrawn or edited — the drive has closed or your status has changed'
    );
  }
  return application;
}

// Deletes the row entirely rather than a WITHDRAWN status — the student can
// cleanly re-apply later while the drive is still open, same as if they'd
// never applied. Role preferences have no cascade delete at the schema
// level (children-before-parents is explicit everywhere in this codebase,
// see demo.service.js's cleanup), so they're removed first or the
// application delete fails on the foreign key.
async function withdraw(applicationId, studentProfileId) {
  const application = await requireEditableByStudent(applicationId, studentProfileId);
  await prisma.$transaction([
    prisma.applicationRolePreference.deleteMany({ where: { applicationId: application.id } }),
    prisma.application.delete({ where: { id: application.id } }),
  ]);
}

// responses/rolePreferences are each independently optional — a student
// might only be changing their question answers, or only re-ranking roles.
async function updateMyApplication(applicationId, studentProfileId, { responses, rolePreferences }) {
  const application = await requireEditableByStudent(applicationId, studentProfileId);

  if (rolePreferences !== undefined) {
    await validateRolePreferences(application.drive, rolePreferences);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.application.update({
      where: { id: application.id },
      data: { ...(responses !== undefined && { responses }) },
    });
    if (rolePreferences !== undefined) {
      await tx.applicationRolePreference.deleteMany({ where: { applicationId: application.id } });
      if (rolePreferences.length > 0) {
        await tx.applicationRolePreference.createMany({
          data: rolePreferences.map((driveRoleId, index) => ({
            applicationId: application.id,
            driveRoleId,
            rank: index + 1,
          })),
        });
      }
    }
    return updated;
  });
}

// callerDriveId is only set for a COMPANY-role caller (from their JWT) —
// scopes them to just their own drive's applications, on top of the usual
// university scoping every caller gets.
async function updateStatus(
  id,
  universityId,
  { status, interviewSlot, interviewVenue, packageAmount, selectedRoleId },
  callerDriveId
) {
  if (!APPLICATION_STATUSES.includes(status)) {
    throw ApiError.badRequest(`status must be one of: ${APPLICATION_STATUSES.join(', ')}`);
  }

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      drive: { include: { company: true } },
      rolePreferences: true,
      studentProfile: { include: { user: { select: { name: true } } } },
    },
  });
  if (!application || application.drive.universityId !== universityId) {
    throw ApiError.notFound('Application not found');
  }
  if (callerDriveId !== undefined && application.driveId !== callerDriveId) {
    throw ApiError.notFound('Application not found');
  }

  if ((interviewSlot !== undefined || interviewVenue !== undefined) && !SLOT_ALLOWED_STATUSES.includes(status)) {
    throw ApiError.badRequest('Interview slot/venue can only be set when status is OA/Test or Interview');
  }
  if (SLOT_ALLOWED_STATUSES.includes(status) && interviewSlot === undefined && !application.interviewSlot) {
    throw ApiError.badRequest('An interview slot is required for OA/Test or Interview status');
  }
  const finalVenue = interviewVenue !== undefined ? interviewVenue : application.interviewVenue;
  if (SLOT_ALLOWED_STATUSES.includes(status) && !finalVenue?.trim()) {
    throw ApiError.badRequest('An interview venue is required for OA/Test or Interview status');
  }

  const wasSelected = application.status === 'SELECTED';
  const nowSelected = status === 'SELECTED';

  // Only required when the applicant actually ranked roles — legacy
  // drives/applications with none skip this and behave as before.
  let resolvedRole = null;
  if (nowSelected && !wasSelected && application.rolePreferences.length > 0) {
    if (!selectedRoleId) {
      throw ApiError.badRequest(
        "selectedRoleId is required — pick one of the applicant's preferred roles"
      );
    }
    const preferred = application.rolePreferences.some((p) => p.driveRoleId === selectedRoleId);
    if (!preferred) {
      throw ApiError.badRequest("selectedRoleId must be one of the applicant's preferred roles");
    }
    resolvedRole = await prisma.driveRole.findUnique({ where: { id: selectedRoleId } });
  }

  // Status change and placement record move together — a partial write here
  // would record a placement with no matching status, or vice versa. The
  // placement *lock* is deliberately not touched here — see
  // students.service.js's setPlacementLock: whether a placed student is
  // locked out of further applications is now an explicit, separate admin
  // decision (and only usable at all if the university has enabled it), not
  // an automatic side effect of a status change.
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.application.update({
      where: { id },
      data: {
        status,
        ...(interviewSlot !== undefined && { interviewSlot: new Date(interviewSlot) }),
        ...(interviewVenue !== undefined && { interviewVenue }),
        ...(resolvedRole && { selectedRoleId: resolvedRole.id }),
        ...(wasSelected && !nowSelected && { selectedRoleId: null }),
      },
    });

    if (nowSelected && !wasSelected) {
      const defaultPackage = resolvedRole
        ? resolvedRole.offerType === 'JOB'
          ? resolvedRole.ctcAmount
          : resolvedRole.stipendAmount
        : undefined;
      const packageAmountToSet = packageAmount !== undefined ? packageAmount : defaultPackage;

      await tx.placement.create({
        data: {
          universityId: application.drive.universityId,
          userId: application.studentProfileId,
          companyId: application.drive.companyId,
          driveId: application.drive.id,
          ...(resolvedRole && { driveRoleId: resolvedRole.id }),
          ...(packageAmountToSet != null && { packageAmount: packageAmountToSet }),
        },
      });
    } else if (wasSelected && !nowSelected) {
      // Admin undoing a selection — remove the placement record it created.
      // The placement lock (if the admin had separately set one) is left
      // alone; unlocking is now that same explicit admin decision too.
      await tx.placement.deleteMany({
        where: { driveId: application.driveId, userId: application.studentProfileId },
      });
    }

    return updated;
  });

  if (nowSelected && !wasSelected) {
    try {
      await notificationsService.notify(universityId, 'STUDENT_SELECTED', {
        subject: `Student selected: ${application.studentProfile.user.name}`,
        text: [
          `A student was marked Selected on HireSphere.`,
          '',
          `Student: ${application.studentProfile.user.name}`,
          `Drive: ${application.drive.title}`,
          `Company: ${application.drive.company.name}`,
        ].join('\n'),
      });
    } catch (err) {
      console.error('Failed to send student-selected notification:', err);
    }
  }

  return result;
}

// Plan §4: "a global apply toggle lets admin apply the same slot/venue setup
// across all shortlisted candidates at once, or set individually" — this is
// the bulk path; updateStatus above remains the individual one. Validates
// every id belongs to this drive *before* writing anything, so a mixed
// valid/invalid batch fails cleanly instead of partially applying.
async function bulkSetInterviewSchedule(
  driveId,
  universityId,
  { applicationIds, interviewSlot, interviewVenue, status, selectedRoleId }
) {
  if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
    throw ApiError.badRequest('applicationIds must be a non-empty array');
  }
  if (interviewSlot === undefined && interviewVenue === undefined && status === undefined) {
    throw ApiError.badRequest('interviewSlot, interviewVenue, or status is required');
  }
  if (status !== undefined && !APPLICATION_STATUSES.includes(status)) {
    throw ApiError.badRequest(`status must be one of: ${APPLICATION_STATUSES.join(', ')}`);
  }

  const drive = await drivesService.requireScoped(driveId, universityId);
  const uniqueIds = [...new Set(applicationIds)];

  const applications = await prisma.application.findMany({
    where: { id: { in: uniqueIds }, driveId: drive.id },
    include: { rolePreferences: true, studentProfile: { include: { user: { select: { name: true } } } } },
  });
  if (applications.length !== uniqueIds.length) {
    throw ApiError.badRequest('One or more applicationIds do not belong to this drive');
  }
  if (status !== undefined && applications.some((a) => a.status === 'SELECTED')) {
    throw ApiError.badRequest(
      'One or more selected applicants are already Selected — change their status individually so the placement lock releases correctly'
    );
  }

  // Bulk-selecting a whole batch into the *same* role at once (e.g. 10
  // candidates all hired as "Software Engineer" in one go) — every applicant
  // in the batch must have actually ranked that role themselves, so this can
  // never place someone into a role they never applied for. Moving *off*
  // SELECTED in bulk still isn't supported, since releasing the placement
  // lock correctly needs the individual-row flow.
  let resolvedRole = null;
  if (status === 'SELECTED') {
    const roleCount = await prisma.driveRole.count({ where: { driveId: drive.id } });
    if (roleCount > 0) {
      if (!selectedRoleId) {
        throw ApiError.badRequest(
          'selectedRoleId is required to bulk-select — pick the role every applicant in this batch is being placed into'
        );
      }
      const missingPreference = applications.find(
        (a) => !a.rolePreferences.some((p) => p.driveRoleId === selectedRoleId)
      );
      if (missingPreference) {
        throw ApiError.badRequest(
          'Every applicant in the batch must have ranked the selected role as a preference'
        );
      }
      resolvedRole = await prisma.driveRole.findUnique({ where: { id: selectedRoleId } });
    }
  }

  if (interviewSlot !== undefined || interviewVenue !== undefined) {
    const effectiveStatuses = status !== undefined ? [status] : applications.map((a) => a.status);
    if (effectiveStatuses.some((s) => !SLOT_ALLOWED_STATUSES.includes(s))) {
      throw ApiError.badRequest('Interview slot/venue can only be set when status is OA/Test or Interview');
    }
  }
  if (
    status !== undefined &&
    SLOT_ALLOWED_STATUSES.includes(status) &&
    interviewSlot === undefined &&
    applications.some((a) => !a.interviewSlot)
  ) {
    throw ApiError.badRequest('An interview slot is required for OA/Test or Interview status');
  }
  if (status !== undefined && SLOT_ALLOWED_STATUSES.includes(status)) {
    const venueMissing =
      interviewVenue !== undefined
        ? !interviewVenue.trim()
        : applications.some((a) => !a.interviewVenue);
    if (venueMissing) {
      throw ApiError.badRequest('An interview venue is required for OA/Test or Interview status');
    }
  }

  const defaultPackage = resolvedRole
    ? resolvedRole.offerType === 'JOB'
      ? resolvedRole.ctcAmount
      : resolvedRole.stipendAmount
    : undefined;

  await prisma.$transaction(async (tx) => {
    await tx.application.updateMany({
      where: { id: { in: uniqueIds } },
      data: {
        ...(interviewSlot !== undefined && { interviewSlot: new Date(interviewSlot) }),
        ...(interviewVenue !== undefined && { interviewVenue }),
        ...(status !== undefined && { status }),
        ...(resolvedRole && { selectedRoleId: resolvedRole.id }),
      },
    });

    if (status === 'SELECTED') {
      await tx.placement.createMany({
        data: applications.map((a) => ({
          universityId,
          userId: a.studentProfileId,
          companyId: drive.companyId,
          driveId: drive.id,
          ...(resolvedRole && { driveRoleId: resolvedRole.id }),
          ...(defaultPackage != null && { packageAmount: defaultPackage }),
        })),
      });
    }
  });

  if (status === 'SELECTED') {
    const company = await prisma.company.findUnique({
      where: { id: drive.companyId },
      select: { name: true },
    });
    for (const a of applications) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await notificationsService.notify(universityId, 'STUDENT_SELECTED', {
          subject: `Student selected: ${a.studentProfile.user.name}`,
          text: [
            'A student was marked Selected on HireSphere.',
            '',
            `Student: ${a.studentProfile.user.name}`,
            `Drive: ${drive.title}`,
            `Company: ${company?.name ?? '(unknown)'}`,
          ].join('\n'),
        });
      } catch (err) {
        console.error('Failed to send student-selected notification:', err);
      }
    }
  }

  return prisma.application.findMany({
    where: { id: { in: uniqueIds } },
    include: APPLICANT_INCLUDE,
    orderBy: { createdAt: 'asc' },
  });
}

// Plan §4: resume sent via Nodemailer at a scheduled datetime. Actual
// dispatch happens in src/jobs/resumeDispatcher.js; this just validates and
// records the requested time.
async function scheduleResumeDelivery(id, universityId, { dispatchAt }) {
  if (!dispatchAt) throw ApiError.badRequest('dispatchAt is required');

  const application = await prisma.application.findUnique({
    where: { id },
    include: { drive: { include: { company: true } } },
  });
  if (!application || application.drive.universityId !== universityId) {
    throw ApiError.notFound('Application not found');
  }
  if (application.resumeSentAt) {
    throw ApiError.badRequest('This resume has already been sent');
  }
  if (!application.resumeUrl) {
    throw ApiError.badRequest('This application has no resume to send');
  }
  if (!application.drive.company.contactEmail) {
    throw ApiError.badRequest("This drive's company has no contact email on file");
  }

  return prisma.application.update({
    where: { id },
    data: { resumeDispatchAt: new Date(dispatchAt) },
  });
}

module.exports = {
  APPLICATION_STATUSES,
  applyToDrive,
  listForDrive,
  listForDriveByStatus,
  searchForUniversity,
  listForStudent,
  getForUser,
  withdraw,
  updateMyApplication,
  updateStatus,
  bulkSetInterviewSchedule,
  scheduleResumeDelivery,
};
