const prisma = require('../lib/prisma');
const ApiError = require('../lib/ApiError');

const FIELD_TYPES = ['TEXT', 'NUMBER', 'DROPDOWN', 'DATE'];

function listForUniversity(universityId) {
  return prisma.studentCustomFieldDefinition.findMany({
    where: { universityId },
    orderBy: { createdAt: 'asc' },
  });
}

async function create(universityId, { label, fieldType, required, options }) {
  if (!label || !label.trim()) {
    throw ApiError.badRequest('label is required');
  }
  if (!FIELD_TYPES.includes(fieldType)) {
    throw ApiError.badRequest(`fieldType must be one of: ${FIELD_TYPES.join(', ')}`);
  }
  if (fieldType === 'DROPDOWN') {
    if (!Array.isArray(options) || options.length === 0 || options.some((o) => typeof o !== 'string' || !o.trim())) {
      throw ApiError.badRequest('A dropdown field needs a non-empty list of string options');
    }
  }

  return prisma.$transaction(async (tx) => {
    const definition = await tx.studentCustomFieldDefinition.create({
      data: {
        universityId,
        label: label.trim(),
        fieldType,
        required: Boolean(required),
        options: fieldType === 'DROPDOWN' ? options : undefined,
      },
    });

    // A new required field means every already-verified profile is now
    // incomplete against it (nobody could have filled in a field that
    // didn't exist yet) — send them back to unverified so an admin
    // re-reviews once the student fills it in, same as any other required
    // field being missing at verification time.
    if (definition.required) {
      await tx.studentProfile.updateMany({
        where: { verified: true, user: { universityId } },
        data: { verified: false },
      });
    }

    return definition;
  });
}

// Removing a definition also removes any values students already stored
// against it — an admin removing a field is assumed to mean "we don't want
// this data anymore", same spirit as drives.service.js's role deletion, just
// without the "already in use" guard since profile data isn't downstream of
// anything else the way role preferences are.
async function remove(id, universityId) {
  const def = await prisma.studentCustomFieldDefinition.findFirst({ where: { id, universityId } });
  if (!def) throw ApiError.notFound('Field not found');

  await prisma.$transaction([
    prisma.studentCustomFieldValue.deleteMany({ where: { fieldDefinitionId: id } }),
    prisma.studentCustomFieldDefinition.delete({ where: { id } }),
  ]);
}

module.exports = { FIELD_TYPES, listForUniversity, create, remove };
