const express = require('express');
const prisma = require('../lib/prisma');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();
const DRIVE_STATUSES = ['DRAFT', 'OPEN', 'CLOSED'];

router.use(requireAuth);

// Students and admins only ever see drives for their own university.
router.get('/', async (req, res) => {
  const drives = await prisma.drive.findMany({
    where: { universityId: req.user.universityId },
    include: { company: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(drives);
});

router.get('/:id', async (req, res) => {
  const drive = await prisma.drive.findFirst({
    where: { id: req.params.id, universityId: req.user.universityId },
    include: { company: true, eligiblePrograms: true },
  });
  if (!drive) {
    return res.status(404).json({ error: 'Drive not found' });
  }
  res.json(drive);
});

router.post('/', requireRole('ADMIN'), async (req, res) => {
  const { companyId, title, description } = req.body;

  if (!companyId || !title) {
    return res.status(400).json({ error: 'companyId and title are required' });
  }

  try {
    const drive = await prisma.drive.create({
      data: {
        companyId,
        title,
        description,
        universityId: req.user.universityId,
      },
    });
    res.status(201).json(drive);
  } catch (err) {
    if (err.code === 'P2003') {
      return res.status(400).json({ error: 'companyId does not exist' });
    }
    throw err;
  }
});

router.patch('/:id/status', requireRole('ADMIN'), async (req, res) => {
  const { status } = req.body;

  if (!DRIVE_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${DRIVE_STATUSES.join(', ')}` });
  }

  const existing = await prisma.drive.findFirst({
    where: { id: req.params.id, universityId: req.user.universityId },
  });
  if (!existing) {
    return res.status(404).json({ error: 'Drive not found' });
  }

  const drive = await prisma.drive.update({
    where: { id: req.params.id },
    data: { status },
  });
  res.json(drive);
});

module.exports = router;
