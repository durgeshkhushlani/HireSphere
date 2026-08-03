const prisma = require('../lib/prisma');
const ApiError = require('../lib/ApiError');

// Only verified universities are publicly discoverable — this list backs
// pre-registration dropdowns, and an unverified entry isn't real yet.
// `hasAdmin` lets the signup form reject a second admin registration for a
// university up front (before OTP is even sent), instead of only failing at
// the final register step — see auth.service.js's one-admin-per-university
// rule.
async function list() {
  const universities = await prisma.university.findMany({
    where: { verified: true },
    include: { _count: { select: { users: { where: { role: 'ADMIN' } } } } },
  });
  return universities.map(({ _count, ...university }) => ({
    ...university,
    hasAdmin: _count.users > 0,
  }));
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

  // Cheap sanity check, not real domain ownership proof (that's what the
  // manual video-call/DNS TXT verification step is for) — but it stops the
  // obvious case of registering someone else's domain with a throwaway
  // contact address. Whoever submits this must at least hold an address on
  // the domain they're claiming.
  const contactDomain = contactEmail.split('@')[1]?.toLowerCase();
  if (contactDomain !== domain.toLowerCase()) {
    throw ApiError.badRequest('Contact email must be at the same domain you are registering');
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
