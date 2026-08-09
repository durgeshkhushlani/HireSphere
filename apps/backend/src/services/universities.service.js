const prisma = require('../lib/prisma');
const ApiError = require('../lib/ApiError');
const mailer = require('../lib/mailer');

// Same fixed recipient as bug-reports.service.js/adoption-requests.service.js
// — there's no platform-operator role/dashboard yet, so a direct email is
// how the person doing manual verification actually finds out a new
// registration is waiting on them.
const VERIFICATION_RECIPIENT = 'durgeshkhushlani@gmail.com';

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

  let university;
  try {
    university = await prisma.university.create({ data: { name, domain, contactName, contactEmail } });
  } catch (err) {
    if (err.code === 'P2002') {
      throw ApiError.conflict('A university with this domain already exists');
    }
    throw err;
  }

  // Best-effort — a failed notification shouldn't fail the registration
  // itself, same reasoning as every other notify-on-event call in this
  // codebase (see companies.service.js, drives.service.js).
  try {
    await mailer.sendMail({
      to: VERIFICATION_RECIPIENT,
      subject: `[HireSphere] New university registration: ${name}`,
      text: [
        'A new university registration is waiting on manual verification.',
        '',
        `Name: ${name}`,
        `Domain: ${domain}`,
        `Contact name: ${contactName}`,
        `Contact email: ${contactEmail}`,
      ].join('\n'),
    });
  } catch (err) {
    console.error('Failed to send university-registration notification:', err);
  }

  return university;
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

function isValidTimeZone(tz) {
  try {
    // eslint-disable-next-line no-new
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// Admin self-service: only these fields, since nothing else about a
// university (name, domain, verified status) should be editable by its own
// admin. contactPhone has no format validation (international numbers vary
// too much to police usefully); contactEmail keeps the same domain-match
// rule as registration. placementLockEnabled gates whether the admin can use
// the manual per-student placement lock at all (see students.service.js's
// setPlacementLock) — off by default has no meaning here since it defaults
// to true; this just lets a university that allows placed students to keep
// applying elsewhere turn the whole mechanism off.
async function updateMine(universityId, { contactEmail, contactPhone, timezone, placementLockEnabled }) {
  const university = await prisma.university.findUnique({ where: { id: universityId } });
  if (!university) throw ApiError.notFound('University not found');

  if (contactEmail !== undefined) {
    const contactDomain = contactEmail.split('@')[1]?.toLowerCase();
    if (contactDomain !== university.domain.toLowerCase()) {
      throw ApiError.badRequest('Contact email must be at the same domain as the university');
    }
  }
  if (timezone !== undefined && !isValidTimeZone(timezone)) {
    throw ApiError.badRequest('timezone must be a valid IANA time zone id, e.g. "Asia/Kolkata"');
  }
  if (placementLockEnabled !== undefined && typeof placementLockEnabled !== 'boolean') {
    throw ApiError.badRequest('placementLockEnabled must be a boolean');
  }

  return prisma.university.update({
    where: { id: universityId },
    data: {
      ...(contactEmail !== undefined && { contactEmail }),
      ...(contactPhone !== undefined && { contactPhone }),
      ...(timezone !== undefined && { timezone }),
      ...(placementLockEnabled !== undefined && { placementLockEnabled }),
    },
  });
}

module.exports = { list, listPending, create, listPrograms, updateMine };
