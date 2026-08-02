const prisma = require('../lib/prisma');
const ApiError = require('../lib/ApiError');

// Scoped to the caller's own university, taken from their JWT — never from a
// client-supplied parameter (same rule as drives/companies).
async function create(universityId, { programId }) {
  if (!programId) throw ApiError.badRequest('programId is required');

  try {
    return await prisma.universityProgram.create({
      data: { universityId, programId },
      include: { program: true },
    });
  } catch (err) {
    if (err.code === 'P2002') {
      throw ApiError.conflict('This university already offers that program');
    }
    if (err.code === 'P2003') throw ApiError.badRequest('programId does not exist');
    throw err;
  }
}

module.exports = { create };
