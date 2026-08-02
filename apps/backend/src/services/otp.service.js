const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const ApiError = require('../lib/ApiError');
const mailer = require('../lib/mailer');
const { signToken, verifyToken } = require('../lib/jwt');

const SALT_ROUNDS = 10;
const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;
const VERIFICATION_TOKEN_TTL = '15m';

function emailDomain(email) {
  return email.split('@')[1]?.toLowerCase();
}

// The domain->university mapping is the actual root of trust: it's only
// meaningful once someone has manually confirmed the university owns that
// domain (plan §3 — video call for v1) and flipped `verified` accordingly.
async function requireVerifiedUniversityForEmail(email) {
  const domain = emailDomain(email);
  const university = domain ? await prisma.university.findUnique({ where: { domain } }) : null;
  if (!university) {
    throw ApiError.badRequest('No university is registered for this email domain');
  }
  if (!university.verified) {
    throw ApiError.forbidden('This university has not been verified yet');
  }
  return university;
}

async function requestOtp(email) {
  if (!email) throw ApiError.badRequest('email is required');

  await requireVerifiedUniversityForEmail(email);

  // Cooldown only guards against spamming resends of a still-outstanding
  // code — once a code has been consumed, a fresh request is a new,
  // independent verification and shouldn't be blocked by the old timestamp.
  const existing = await prisma.emailOtp.findUnique({ where: { email } });
  if (
    existing &&
    !existing.consumedAt &&
    Date.now() - existing.createdAt.getTime() < RESEND_COOLDOWN_MS
  ) {
    throw ApiError.badRequest('Please wait before requesting another code');
  }

  const code = String(crypto.randomInt(100000, 1000000));
  const codeHash = await bcrypt.hash(code, SALT_ROUNDS);

  await prisma.emailOtp.upsert({
    where: { email },
    update: {
      codeHash,
      attempts: 0,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
      consumedAt: null,
    },
    create: { email, codeHash, expiresAt: new Date(Date.now() + CODE_TTL_MS) },
  });

  await mailer.sendMail({
    to: email,
    subject: 'Your HireSphere verification code',
    text: `Your verification code is ${code}. It expires in 10 minutes.`,
  });

  return { message: 'Verification code sent' };
}

async function verifyOtp(email, code) {
  if (!email || !code) throw ApiError.badRequest('email and code are required');

  const invalid = () => ApiError.badRequest('Invalid or expired code');
  const record = await prisma.emailOtp.findUnique({ where: { email } });

  if (!record || record.consumedAt || record.expiresAt < new Date()) {
    throw invalid();
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    throw ApiError.badRequest('Too many attempts — request a new code');
  }

  const match = await bcrypt.compare(code, record.codeHash);
  if (!match) {
    await prisma.emailOtp.update({ where: { email }, data: { attempts: { increment: 1 } } });
    throw invalid();
  }

  // Re-check rather than trust the state from requestOtp — the code lives
  // for up to 10 minutes, during which verification status could change.
  const university = await requireVerifiedUniversityForEmail(email);

  await prisma.emailOtp.update({ where: { email }, data: { consumedAt: new Date() } });

  const verificationToken = signToken(
    { email, universityId: university.id, purpose: 'registration' },
    { expiresIn: VERIFICATION_TOKEN_TTL }
  );
  return { verificationToken };
}

// Used by registerAdmin/registerStudent: derives universityId from the
// verified token instead of trusting a client-supplied field, and confirms
// the token was actually issued for the email being registered.
function resolveRegistration(verificationToken, email) {
  if (!verificationToken) throw ApiError.badRequest('verificationToken is required');

  let payload;
  try {
    payload = verifyToken(verificationToken);
  } catch {
    throw ApiError.badRequest('Invalid or expired verification token');
  }

  if (payload.purpose !== 'registration' || payload.email !== email) {
    throw ApiError.badRequest('Invalid or expired verification token');
  }

  return payload.universityId;
}

module.exports = { requestOtp, verifyOtp, resolveRegistration };
