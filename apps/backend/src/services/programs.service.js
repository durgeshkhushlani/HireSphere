const prisma = require('../lib/prisma');
const ApiError = require('../lib/ApiError');

function list() {
  return prisma.program.findMany({ orderBy: { name: 'asc' } });
}

async function create({ name }) {
  if (!name) throw ApiError.badRequest('name is required');

  try {
    return await prisma.program.create({ data: { name } });
  } catch (err) {
    if (err.code === 'P2002') throw ApiError.conflict('A program with this name already exists');
    throw err;
  }
}

module.exports = { list, create };
