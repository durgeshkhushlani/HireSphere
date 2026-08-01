const express = require('express');
const prisma = require('../lib/prisma');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();
const APPLICATION_STATUSES = [
  'APPLIED',
  'SHORTLISTED',
  'OA_TEST',
  'INTERVIEW',
  'SELECTED',
  'NOT_SELECTED',
];

router.use(requireAuth);

router.get('/me', requireRole('STUDENT'), async (req, res) => {
  const applications = await prisma.application.findMany({
    where: { studentProfileId: req.user.id },
    include: { drive: { include: { company: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(applications);
});

router.get('/:id', async (req, res) => {
  const application = await prisma.application.findUnique({
    where: { id: req.params.id },
    include: { drive: { include: { company: true } } },
  });

  if (!application || application.drive.universityId !== req.user.universityId) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const isOwner = req.user.role === 'STUDENT' && application.studentProfileId === req.user.id;
  const isAdmin = req.user.role === 'ADMIN';
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  res.json(application);
});

router.patch('/:id/status', requireRole('ADMIN'), async (req, res) => {
  const { status, interviewSlot, interviewVenue } = req.body;

  if (!APPLICATION_STATUSES.includes(status)) {
    return res
      .status(400)
      .json({ error: `status must be one of: ${APPLICATION_STATUSES.join(', ')}` });
  }

  const application = await prisma.application.findUnique({
    where: { id: req.params.id },
    include: { drive: true },
  });
  if (!application || application.drive.universityId !== req.user.universityId) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const updated = await prisma.application.update({
    where: { id: req.params.id },
    data: {
      status,
      ...(interviewSlot !== undefined && { interviewSlot: new Date(interviewSlot) }),
      ...(interviewVenue !== undefined && { interviewVenue }),
    },
  });
  res.json(updated);
});

module.exports = router;
