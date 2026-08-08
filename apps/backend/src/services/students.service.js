const prisma = require('../lib/prisma');
const ApiError = require('../lib/ApiError');

// Backs the chat assistant's "what's my CGPA / am I eligible / am I placed"
// self-lookup — always scoped to the caller's own userId (from the JWT),
// never a client-supplied id. There's no cross-student read path here at all.
async function getProfile(userId) {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    include: { user: { include: { university: true } }, program: true },
  });
  if (!profile) throw ApiError.notFound('Student profile not found');
  return profile;
}

const FULL_PROFILE_INCLUDE = {
  user: { include: { university: true } },
  program: true,
  customFieldValues: true,
};

// Shared by getFullProfile/getFullProfileForUniversity: merges every custom
// field currently defined for the university with whatever value the
// student has stored (or null if never set) — so a field an admin just
// added shows up immediately, not just ones the student already filled.
async function attachCustomFields(profile) {
  const definitions = await prisma.studentCustomFieldDefinition.findMany({
    where: { universityId: profile.user.universityId },
    orderBy: { createdAt: 'asc' },
  });

  const valueByDefId = new Map(profile.customFieldValues.map((v) => [v.fieldDefinitionId, v.value]));
  const customFields = definitions.map((def) => ({
    id: def.id,
    label: def.label,
    fieldType: def.fieldType,
    required: def.required,
    options: def.options,
    value: valueByDefId.get(def.id) ?? null,
  }));

  const { customFieldValues, ...rest } = profile;
  return { ...rest, customFields };
}

// Full profile for the student-facing profile view — always the caller's own.
async function getFullProfile(userId) {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    include: FULL_PROFILE_INCLUDE,
  });
  if (!profile) throw ApiError.notFound('Student profile not found');
  return attachCustomFields(profile);
}

// Same shape, for an admin looking up one specific student — scoped so a
// student id from another university 404s rather than leaking existence.
async function getFullProfileForUniversity(userId, universityId) {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    include: FULL_PROFILE_INCLUDE,
  });
  if (!profile || profile.user.universityId !== universityId) {
    throw ApiError.notFound('Student not found');
  }
  return attachCustomFields(profile);
}

// Editable while the profile is unverified; once an admin verifies it, only
// address/phone remain changeable (custom field values lock too). resumeUrl
// is the one exception that stays editable either way — a resume
// legitimately changes over time and isn't part of academic verification.
const EDITABLE_WHEN_UNVERIFIED = ['studentId', 'tenthPercentage', 'twelfthPercentage', 'bloodGroup', 'address', 'phone', 'resumeUrl'];
const EDITABLE_WHEN_VERIFIED = ['address', 'phone', 'resumeUrl'];

// All required — a student must fill in every one of these before an admin
// can meaningfully verify the profile.
const FIXED_REQUIRED_FIELDS = [
  { key: 'studentId', label: 'Student ID' },
  { key: 'tenthPercentage', label: '10th %' },
  { key: 'twelfthPercentage', label: '12th %' },
  { key: 'bloodGroup', label: 'Blood group' },
  { key: 'address', label: 'Address' },
  { key: 'phone', label: 'Phone' },
];

function validatePercentage(label, value) {
  if (value === undefined || value === null) return;
  const n = Number(value);
  if (Number.isNaN(n) || n < 0 || n > 100) {
    throw ApiError.badRequest(`${label} must be a number between 0 and 100`);
  }
}

async function updateProfile(userId, patch) {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    include: { user: true },
  });
  if (!profile) throw ApiError.notFound('Student profile not found');

  const allowedFields = profile.verified ? EDITABLE_WHEN_VERIFIED : EDITABLE_WHEN_UNVERIFIED;
  const patchFields = Object.keys(patch).filter((k) => k !== 'customFieldValues');
  const disallowed = patchFields.filter((k) => !allowedFields.includes(k));
  if (disallowed.length > 0) {
    throw ApiError.forbidden(
      profile.verified
        ? `Profile is verified — only address and phone can be updated (rejected: ${disallowed.join(', ')})`
        : `Unknown or non-editable field(s): ${disallowed.join(', ')}`
    );
  }
  if (patch.customFieldValues !== undefined && profile.verified) {
    throw ApiError.forbidden('Profile is verified — custom fields can no longer be changed');
  }

  validatePercentage('tenthPercentage', patch.tenthPercentage);
  validatePercentage('twelfthPercentage', patch.twelfthPercentage);

  // All fixed profile fields are required, in both states — checked against
  // the final state (existing value unless this patch overrides it), same
  // pattern as the custom-field required check below. When verified, only
  // address/phone are ever in the patch, but re-checking all 5 is harmless:
  // the other 3 already have real values from before verification.
  const missingFixed = FIXED_REQUIRED_FIELDS.filter(({ key }) => {
    const incoming = patch[key];
    const finalValue = incoming !== undefined ? incoming : profile[key];
    return finalValue === undefined || finalValue === null || finalValue === '';
  });
  if (missingFixed.length > 0) {
    throw ApiError.badRequest(
      `Missing required field(s): ${missingFixed.map((f) => f.label).join(', ')}`
    );
  }

  const data = {};
  for (const key of allowedFields) {
    if (patch[key] !== undefined) data[key] = patch[key];
  }

  if (patch.customFieldValues !== undefined) {
    if (
      typeof patch.customFieldValues !== 'object' ||
      patch.customFieldValues === null ||
      Array.isArray(patch.customFieldValues)
    ) {
      throw ApiError.badRequest('customFieldValues must be an object keyed by field id');
    }

    const definitions = await prisma.studentCustomFieldDefinition.findMany({
      where: { universityId: profile.user.universityId },
    });
    const defById = new Map(definitions.map((d) => [d.id, d]));

    for (const [fieldId, value] of Object.entries(patch.customFieldValues)) {
      const def = defById.get(fieldId);
      if (!def) throw ApiError.badRequest(`Unknown field id: ${fieldId}`);
      if (value === null || value === '') continue;
      if (def.fieldType === 'DROPDOWN') {
        const options = Array.isArray(def.options) ? def.options : [];
        if (!options.includes(value)) {
          throw ApiError.badRequest(`"${value}" is not a valid option for "${def.label}"`);
        }
      }
      if (def.fieldType === 'NUMBER' && Number.isNaN(Number(value))) {
        throw ApiError.badRequest(`"${def.label}" must be a number`);
      }
    }

    // Required-field check against the resulting state (existing values
    // overridden by whatever this patch supplies), not just the patch alone.
    const existingValues = await prisma.studentCustomFieldValue.findMany({
      where: { studentProfileId: userId },
    });
    const existingByDefId = new Map(existingValues.map((v) => [v.fieldDefinitionId, v.value]));
    const missing = definitions.filter((def) => {
      if (!def.required) return false;
      const incoming = patch.customFieldValues[def.id];
      const finalValue = incoming !== undefined ? incoming : existingByDefId.get(def.id);
      return finalValue === undefined || finalValue === null || finalValue === '';
    });
    if (missing.length > 0) {
      throw ApiError.badRequest(`Missing required field(s): ${missing.map((d) => d.label).join(', ')}`);
    }
  }

  await prisma.$transaction(async (tx) => {
    if (Object.keys(data).length > 0) {
      await tx.studentProfile.update({ where: { userId }, data });
    }
    if (patch.customFieldValues !== undefined) {
      for (const [fieldId, value] of Object.entries(patch.customFieldValues)) {
        await tx.studentCustomFieldValue.upsert({
          where: { studentProfileId_fieldDefinitionId: { studentProfileId: userId, fieldDefinitionId: fieldId } },
          update: { value },
          create: { studentProfileId: userId, fieldDefinitionId: fieldId, value },
        });
      }
    }
  });

  return getFullProfile(userId);
}

function listForUniversity(universityId) {
  return prisma.studentProfile.findMany({
    where: { user: { universityId } },
    include: { user: true, program: true },
    orderBy: { user: { name: 'asc' } },
  });
}

// Admin-only, scoped: a studentId from another university 404s rather than
// silently succeeding or leaking existence.
async function setVerified(userId, universityId, verified) {
  if (typeof verified !== 'boolean') throw ApiError.badRequest('verified must be a boolean');

  const profile = await prisma.studentProfile.findUnique({ where: { userId }, include: { user: true } });
  if (!profile || profile.user.universityId !== universityId) {
    throw ApiError.notFound('Student not found');
  }

  return prisma.studentProfile.update({
    where: { userId },
    data: { verified },
    include: { user: true, program: true },
  });
}

module.exports = {
  getProfile,
  getFullProfile,
  getFullProfileForUniversity,
  updateProfile,
  listForUniversity,
  setVerified,
};
