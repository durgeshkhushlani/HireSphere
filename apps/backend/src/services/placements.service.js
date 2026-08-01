const prisma = require('../lib/prisma');

const PLACEMENT_INCLUDE = {
  company: true,
  drive: { select: { id: true, title: true } },
};

function listForUniversity(universityId) {
  return prisma.placement.findMany({
    where: { universityId },
    include: {
      ...PLACEMENT_INCLUDE,
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { placedAt: 'desc' },
  });
}

function listForStudent(userId) {
  return prisma.placement.findMany({
    where: { userId },
    include: PLACEMENT_INCLUDE,
    orderBy: { placedAt: 'desc' },
  });
}

module.exports = { listForUniversity, listForStudent };
