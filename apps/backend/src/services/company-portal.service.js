const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const ApiError = require('../lib/ApiError');
const { signToken } = require('../lib/jwt');
const mailer = require('../lib/mailer');

const SALT_ROUNDS = 10;
// No 0/O/1/I/L — avoids a code that's ambiguous when read aloud or typed by
// hand from an email.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const TOKEN_EXPIRES_IN = '12h';

function portalUrl(universityDomain, accessCode) {
  const base = process.env.FRONTEND_URL || 'http://127.0.0.1:3000';
  return `${base}/${universityDomain}/${accessCode}`;
}

function generateCode() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

function generatePassword() {
  return crypto.randomBytes(9).toString('base64url');
}

async function uniqueCode() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCode();
    const existing = await prisma.driveCompanyAccess.findUnique({ where: { accessCode: code } });
    if (!existing) return code;
  }
  throw new Error('Could not generate a unique company-portal access code');
}

// Called once, at drive-creation time. Returns the plaintext password —
// the only moment it will ever exist outside the admin's screen/inbox.
async function createAccess(driveId) {
  const accessCode = await uniqueCode();
  const password = generatePassword();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  await prisma.driveCompanyAccess.create({ data: { driveId, accessCode, passwordHash } });

  return { accessCode, password };
}

// Non-secret info an admin can see any time: the code needed to build the
// portal URL, never the password (hashed, not recoverable) or its hash.
async function getAccessInfo(driveId) {
  return prisma.driveCompanyAccess.findUnique({
    where: { driveId },
    select: { accessCode: true, createdAt: true, updatedAt: true },
  });
}

// A forgotten password can only be replaced, never recovered — this mints a
// fresh one, invalidating the old one immediately.
async function regeneratePassword(driveId, universityId) {
  const drive = await prisma.drive.findFirst({ where: { id: driveId, universityId } });
  if (!drive) throw ApiError.notFound('Drive not found');

  const access = await prisma.driveCompanyAccess.findUnique({ where: { driveId } });
  if (!access) throw ApiError.notFound('No company portal access exists for this drive yet');

  const password = generatePassword();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  await prisma.driveCompanyAccess.update({ where: { driveId }, data: { passwordHash } });

  return { accessCode: access.accessCode, password };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Regenerates the password and emails it to the given recipients in one
// step — sending an *existing* password back out isn't possible (it's
// never stored recoverable), so "send credentials" always issues a fresh
// one. Returns the same shape as regeneratePassword so the admin UI can
// also show it inline.
async function regenerateAndSend(driveId, universityId, emails) {
  if (!Array.isArray(emails) || emails.length === 0) {
    throw ApiError.badRequest('At least one recipient email is required');
  }
  const invalid = emails.find((e) => !EMAIL_PATTERN.test(e));
  if (invalid) throw ApiError.badRequest(`Not a valid email: ${invalid}`);

  const drive = await prisma.drive.findFirst({
    where: { id: driveId, universityId },
    include: { company: true, university: true },
  });
  if (!drive) throw ApiError.notFound('Drive not found');

  const { accessCode, password } = await regeneratePassword(driveId, universityId);

  try {
    await mailer.sendMail({
      bcc: emails,
      subject: `HireSphere company portal access — ${drive.title}`,
      text: [
        `You've been given access to review applicants for "${drive.title}" (${drive.company.name}) on HireSphere.`,
        '',
        `Portal link: ${portalUrl(drive.university.domain, accessCode)}`,
        `Password: ${password}`,
        '',
        'This link only shows applicants for this specific drive.',
      ].join('\n'),
    });
  } catch (err) {
    console.error('Failed to send company-portal credentials email:', err);
  }

  return { accessCode, password };
}

async function login({ universityDomain, accessCode, password }) {
  if (!universityDomain || !accessCode || !password) {
    throw ApiError.badRequest('universityDomain, accessCode and password are required');
  }

  const access = await prisma.driveCompanyAccess.findUnique({
    where: { accessCode },
    include: { drive: { include: { university: true, company: true } } },
  });
  if (!access || access.drive.university.domain !== universityDomain) {
    throw ApiError.unauthorized('Invalid credentials');
  }

  const valid = await bcrypt.compare(password, access.passwordHash);
  if (!valid) throw ApiError.unauthorized('Invalid credentials');

  return {
    token: signToken(
      {
        sub: access.id,
        role: 'COMPANY',
        driveId: access.driveId,
        universityId: access.drive.universityId,
      },
      { expiresIn: TOKEN_EXPIRES_IN }
    ),
    drive: {
      id: access.drive.id,
      title: access.drive.title,
      companyName: access.drive.company.name,
      universityTimezone: access.drive.university.timezone,
    },
  };
}

module.exports = {
  createAccess,
  getAccessInfo,
  regeneratePassword,
  regenerateAndSend,
  login,
  portalUrl,
};
