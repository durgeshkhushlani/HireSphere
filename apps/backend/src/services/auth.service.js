const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { signToken } = require('../lib/jwt');
const ApiError = require('../lib/ApiError');
const otpService = require('./otp.service');

const SALT_ROUNDS = 10;

function toPublicUser(user) {
  const { passwordHash, ...publicUser } = user;
  return publicUser;
}

function authPayload(user) {
  return {
    token: signToken({ sub: user.id, role: user.role, universityId: user.universityId }),
    user: toPublicUser(user),
  };
}

async function registerAdmin({ verificationToken, email, password, name }) {
  if (!email || !password || !name) {
    throw ApiError.badRequest('email, password and name are required');
  }

  // universityId is derived from the OTP-verified token, never accepted
  // directly from the client — see otp.service.js.
  const universityId = otpService.resolveRegistration(verificationToken, email);

  // One admin per university for v1 — a second registration attempt should
  // fail clearly rather than silently creating a co-admin with no UI to
  // manage that yet.
  const existingAdmin = await prisma.user.findFirst({ where: { universityId, role: 'ADMIN' } });
  if (existingAdmin) {
    throw ApiError.conflict('This university already has a placement admin account');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    const user = await prisma.user.create({
      data: { universityId, email, passwordHash, name, role: 'ADMIN' },
    });
    return authPayload(user);
  } catch (err) {
    if (err.code === 'P2002') throw ApiError.conflict('Email already registered');
    throw err;
  }
}

async function registerStudent({ verificationToken, programId, email, password, name, cgpa }) {
  if (!programId || !email || !password || !name || cgpa === undefined) {
    throw ApiError.badRequest('programId, email, password, name and cgpa are required');
  }

  const universityId = otpService.resolveRegistration(verificationToken, email);
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { universityId, email, passwordHash, name, role: 'STUDENT' },
      });
      await tx.studentProfile.create({ data: { userId: created.id, programId, cgpa } });
      return created;
    });
    return authPayload(user);
  } catch (err) {
    if (err.code === 'P2002') throw ApiError.conflict('Email already registered');
    if (err.code === 'P2003') throw ApiError.badRequest('programId does not exist');
    throw err;
  }
}

async function login({ email, password }) {
  if (!email || !password) {
    throw ApiError.badRequest('email and password are required');
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw ApiError.unauthorized('Invalid email or password');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw ApiError.unauthorized('Invalid email or password');

  return authPayload(user);
}

// Includes the university relation so the profile menu (admin has no other
// self-profile view, unlike students) can show university name/domain/
// verification status alongside the registered contact name/email.
async function getPublicUser(id) {
  const user = await prisma.user.findUnique({ where: { id }, include: { university: true } });
  if (!user) throw ApiError.notFound('User not found');
  return toPublicUser(user);
}

module.exports = { registerAdmin, registerStudent, login, getPublicUser };
