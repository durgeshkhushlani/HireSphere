const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { signToken } = require('../lib/jwt');
const ApiError = require('../lib/ApiError');

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

async function registerAdmin({ universityId, email, password, name }) {
  if (!universityId || !email || !password || !name) {
    throw ApiError.badRequest('universityId, email, password and name are required');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    const user = await prisma.user.create({
      data: { universityId, email, passwordHash, name, role: 'ADMIN' },
    });
    return authPayload(user);
  } catch (err) {
    if (err.code === 'P2002') throw ApiError.conflict('Email already registered');
    if (err.code === 'P2003') throw ApiError.badRequest('universityId does not exist');
    throw err;
  }
}

async function registerStudent({ universityId, programId, email, password, name, cgpa }) {
  if (!universityId || !programId || !email || !password || !name || cgpa === undefined) {
    throw ApiError.badRequest(
      'universityId, programId, email, password, name and cgpa are required'
    );
  }

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
    if (err.code === 'P2003') throw ApiError.badRequest('universityId or programId does not exist');
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

async function getPublicUser(id) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw ApiError.notFound('User not found');
  return toPublicUser(user);
}

module.exports = { registerAdmin, registerStudent, login, getPublicUser };
