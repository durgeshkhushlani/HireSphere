const express = require('express');
const prisma = require('../lib/prisma');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();
const DRIVE_STATUSES = ['DRAFT', 'OPEN', 'CLOSED'];

router.use(requireAuth);

function getScopedDrive(driveId, universityId) {
  return prisma.drive.findFirst({ where: { id: driveId, universityId } });
}

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

// Application form: the per-drive question set a student fills out when applying.
router.get('/:driveId/application-form', async (req, res) => {
  const drive = await getScopedDrive(req.params.driveId, req.user.universityId);
  if (!drive) {
    return res.status(404).json({ error: 'Drive not found' });
  }

  const form = await prisma.applicationForm.findUnique({ where: { driveId: drive.id } });
  if (!form) {
    return res.status(404).json({ error: 'No application form set for this drive yet' });
  }
  res.json(form);
});

router.put('/:driveId/application-form', requireRole('ADMIN'), async (req, res) => {
  const { questions } = req.body;

  if (!Array.isArray(questions)) {
    return res.status(400).json({ error: 'questions must be an array' });
  }

  const drive = await getScopedDrive(req.params.driveId, req.user.universityId);
  if (!drive) {
    return res.status(404).json({ error: 'Drive not found' });
  }

  const form = await prisma.applicationForm.upsert({
    where: { driveId: drive.id },
    update: { questions },
    create: { driveId: drive.id, questions },
  });
  res.json(form);
});

// Applications: a student applying to a drive, and admins reviewing who applied.
router.post('/:driveId/applications', requireRole('STUDENT'), async (req, res) => {
  const { responses, resumeUrl } = req.body;

  if (responses === undefined) {
    return res.status(400).json({ error: 'responses is required' });
  }

  const drive = await getScopedDrive(req.params.driveId, req.user.universityId);
  if (!drive) {
    return res.status(404).json({ error: 'Drive not found' });
  }
  if (drive.status !== 'OPEN') {
    return res.status(400).json({ error: 'This drive is not currently open for applications' });
  }

  try {
    const application = await prisma.application.create({
      data: {
        driveId: drive.id,
        studentProfileId: req.user.id,
        responses,
        resumeUrl,
      },
    });
    res.status(201).json(application);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'You have already applied to this drive' });
    }
    throw err;
  }
});

router.get('/:driveId/applications', requireRole('ADMIN'), async (req, res) => {
  const drive = await getScopedDrive(req.params.driveId, req.user.universityId);
  if (!drive) {
    return res.status(404).json({ error: 'Drive not found' });
  }

  const applications = await prisma.application.findMany({
    where: { driveId: drive.id },
    include: {
      studentProfile: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          program: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
  res.json(applications);
});

module.exports = router;
