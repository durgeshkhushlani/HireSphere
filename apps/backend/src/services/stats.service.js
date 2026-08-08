const prisma = require('../lib/prisma');

// Aggregate queries backing the chat assistant's stats tools (see
// chat-tools.js). Every function is scoped by universityId, sourced by the
// caller from req.user — never a client/model-supplied value — same rule as
// every other service in this codebase.

async function getPlacementStats(universityId) {
  const [totalStudents, placedUsers, packageAgg, placements] = await Promise.all([
    prisma.studentProfile.count({ where: { user: { universityId } } }),
    // "Placed" means having a placement record — no longer the same thing
    // as placementLocked, which is now a separate, admin-governed toggle
    // (see students.service.js's setPlacementLock) rather than something
    // that's automatically true for every selected student.
    prisma.placement.findMany({ where: { universityId }, select: { userId: true }, distinct: ['userId'] }),
    prisma.placement.aggregate({
      where: { universityId, packageAmount: { not: null } },
      _avg: { packageAmount: true },
    }),
    prisma.placement.findMany({ where: { universityId }, select: { companyId: true }, distinct: ['companyId'] }),
  ]);
  const studentsPlaced = placedUsers.length;

  return {
    totalStudents,
    studentsPlaced,
    placementRate: totalStudents > 0 ? Math.round((studentsPlaced / totalStudents) * 1000) / 10 : 0,
    averagePackage: packageAgg._avg.packageAmount != null ? Number(packageAgg._avg.packageAmount) : null,
    companiesHired: placements.length,
  };
}

const LPA_TO_RUPEES = 100000;

// No status filter: GET /drives has no role/status gate (drives.routes.js),
// and the frontend renders every drive regardless of status to both roles —
// only *applying* is status-gated (server-side, in applications.service.js).
// So "companies above X LPA" must include Draft/Closed drives too, or it
// disagrees with what's already on the user's own screen.
async function countCompaniesAboveCtc(universityId, minLpa, offerType = 'JOB') {
  const amountField = offerType === 'JOB' ? 'ctcAmount' : 'stipendAmount';

  const roles = await prisma.driveRole.findMany({
    where: {
      drive: { universityId },
      offerType,
      [amountField]: { gte: minLpa * LPA_TO_RUPEES },
    },
    include: { drive: { include: { company: true } } },
  });

  const companyNames = [...new Set(roles.map((r) => r.drive.company.name))];
  return { count: companyNames.length, companyNames };
}

function countDrivesByStatus(universityId, status) {
  return prisma.drive.count({ where: { universityId, status } });
}

module.exports = { getPlacementStats, countCompaniesAboveCtc, countDrivesByStatus };
