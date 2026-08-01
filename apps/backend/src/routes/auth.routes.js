const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { signToken } = require('../lib/jwt');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();
const SALT_ROUNDS = 10;

function toToken(user) {
  return signToken({ sub: user.id, role: user.role, universityId: user.universityId });
}

function toPublicUser(user) {
  const { passwordHash, ...publicUser } = user;
  return publicUser;
}

router.post('/register/admin', async (req, res) => {
  const { universityId, email, password, name } = req.body;

  if (!universityId || !email || !password || !name) {
    return res.status(400).json({ error: 'universityId, email, password and name are required' });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    const user = await prisma.user.create({
      data: { universityId, email, passwordHash, name, role: 'ADMIN' },
    });
    res.status(201).json({ token: toToken(user), user: toPublicUser(user) });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    if (err.code === 'P2003') {
      return res.status(400).json({ error: 'universityId does not exist' });
    }
    throw err;
  }
});

router.post('/register/student', async (req, res) => {
  const { universityId, programId, email, password, name, cgpa } = req.body;

  if (!universityId || !programId || !email || !password || !name || cgpa === undefined) {
    return res
      .status(400)
      .json({ error: 'universityId, programId, email, password, name and cgpa are required' });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { universityId, email, passwordHash, name, role: 'STUDENT' },
      });
      await tx.studentProfile.create({
        data: { userId: created.id, programId, cgpa },
      });
      return created;
    });
    res.status(201).json({ token: toToken(user), user: toPublicUser(user) });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    if (err.code === 'P2003') {
      return res.status(400).json({ error: 'universityId or programId does not exist' });
    }
    throw err;
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  res.json({ token: toToken(user), user: toPublicUser(user) });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(toPublicUser(user));
});

module.exports = router;
