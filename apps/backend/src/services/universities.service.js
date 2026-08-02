const prisma = require('../lib/prisma');
const ApiError = require('../lib/ApiError');

// Only verified universities are publicly discoverable — this list backs
// pre-registration dropdowns, and an unverified entry isn't real yet.
function list() {
  return prisma.university.findMany({ where: { verified: true } });
}

// Requests waiting on the manual verification step (plan §3). Not gated
// behind real auth — there's no platform-operator role to gate it behind
// yet — but this does mean the contact emails here are publicly listable
// for now. Revisit once that role exists.
function listPending() {
  return prisma.university.findMany({
    where: { verified: false },
    orderBy: { createdAt: 'asc' },
  });
}

async function create({ name, domain, contactName, contactEmail }) {
  if (!name || !domain || !contactName || !contactEmail) {
    throw ApiError.badRequest('name, domain, contactName and contactEmail are required');
  }
  try {
    return await prisma.university.create({ data: { name, domain, contactName, contactEmail } });
  } catch (err) {
    if (err.code === 'P2002') {
      throw ApiError.conflict('A university with this domain already exists');
    }
    throw err;
  }
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

module.exports = { list, listPending, create, listPrograms };
