const prisma = require('../lib/prisma');

const PLACEMENT_INCLUDE = {
  company: true,
  drive: { select: { id: true, title: true } },
};

// user.placementLocked is flattened out of the studentProfile relation here
// so callers don't need to know about that join — it's the same "is this
// student currently locked out of further applications" flag shown/toggled
// on the placements-overview admin screen.
async function listForUniversity(universityId) {
  const placements = await prisma.placement.findMany({
    where: { universityId },
    include: {
      ...PLACEMENT_INCLUDE,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          studentProfile: { select: { placementLocked: true } },
        },
      },
    },
    orderBy: { placedAt: 'desc' },
  });
  return placements.map((p) => ({
    ...p,
    user: {
      id: p.user.id,
      name: p.user.name,
      email: p.user.email,
      placementLocked: p.user.studentProfile?.placementLocked ?? false,
    },
  }));
}

function listForStudent(userId) {
  return prisma.placement.findMany({
    where: { userId },
    include: PLACEMENT_INCLUDE,
    orderBy: { placedAt: 'desc' },
  });
}

module.exports = { listForUniversity, listForStudent };
