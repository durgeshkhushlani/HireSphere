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

module.exports = { list, create };
