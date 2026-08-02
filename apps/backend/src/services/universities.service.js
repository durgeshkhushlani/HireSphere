const prisma = require('../lib/prisma');
const ApiError = require('../lib/ApiError');

function list() {
  return prisma.university.findMany();
}

function create({ name, domain }) {
  if (!name || !domain) {
    throw ApiError.badRequest('name and domain are required');
  }
  return prisma.university.create({ data: { name, domain } });
}

async function listPrograms(universityId) {
  const university = await prisma.university.findUnique({ where: { id: universityId } });
  if (!university) throw ApiError.notFound('University not found');

  const rows = await prisma.universityProgram.findMany({
    where: { universityId },
    include: { program: true },
    orderBy: { program: { name: 'asc' } },
  });
  return rows.map((row) => row.program);
}

module.exports = { list, create, listPrograms };
