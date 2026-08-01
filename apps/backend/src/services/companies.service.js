const prisma = require('../lib/prisma');
const ApiError = require('../lib/ApiError');

function list() {
  return prisma.company.findMany({ orderBy: { name: 'asc' } });
}

async function getById(id) {
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) throw ApiError.notFound('Company not found');
  return company;
}

function create({ name, industry, contactEmail, contactPhone }) {
  if (!name) throw ApiError.badRequest('name is required');
  return prisma.company.create({ data: { name, industry, contactEmail, contactPhone } });
}

module.exports = { list, getById, create };
