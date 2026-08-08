const prisma = require('../lib/prisma');
const ApiError = require('../lib/ApiError');
const notificationsService = require('./notifications.service');

function list() {
  return prisma.company.findMany({ orderBy: { name: 'asc' } });
}

async function getById(id) {
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) throw ApiError.notFound('Company not found');
  return company;
}

// universityId is only used to route the "new company" notification to the
// calling admin's own distribution list — Company itself stays a global
// catalog with no university ownership, same as Program.
async function create({ name, industry, contactEmail, contactPhone }, universityId) {
  if (!name) throw ApiError.badRequest('name is required');
  const company = await prisma.company.create({
    data: { name, industry, contactEmail, contactPhone },
  });

  if (universityId) {
    try {
      await notificationsService.notify(universityId, 'NEW_COMPANY', {
        subject: `New company added: ${company.name}`,
        text: [
          `A new company was added to HireSphere.`,
          '',
          `Name: ${company.name}`,
          `Industry: ${company.industry || '(not set)'}`,
          `Contact email: ${company.contactEmail || '(not set)'}`,
        ].join('\n'),
      });
    } catch (err) {
      console.error('Failed to send new-company notification:', err);
    }
  }

  return company;
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
