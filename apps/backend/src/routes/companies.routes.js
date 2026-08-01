const express = require('express');
const prisma = require('../lib/prisma');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const companies = await prisma.company.findMany({ orderBy: { name: 'asc' } });
  res.json(companies);
});

router.get('/:id', async (req, res) => {
  const company = await prisma.company.findUnique({ where: { id: req.params.id } });
  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }
  res.json(company);
});

router.post('/', requireRole('ADMIN'), async (req, res) => {
  const { name, industry, contactEmail, contactPhone } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  const company = await prisma.company.create({
    data: { name, industry, contactEmail, contactPhone },
  });

  res.status(201).json(company);
});

module.exports = router;
