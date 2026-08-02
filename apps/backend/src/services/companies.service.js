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

async function update(id, { name, industry, contactEmail, contactPhone }) {
  await getById(id);
  if (name !== undefined && !name) throw ApiError.badRequest('name cannot be empty');

  return prisma.company.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(industry !== undefined && { industry }),
      ...(contactEmail !== undefined && { contactEmail }),
      ...(contactPhone !== undefined && { contactPhone }),
    },
  });
}

module.exports = { list, getById, create, update };
