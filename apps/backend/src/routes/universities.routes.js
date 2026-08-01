const express = require('express');
const prisma = require('../lib/prisma');

const router = express.Router();

router.get('/', async (req, res) => {
  const universities = await prisma.university.findMany();
  res.json(universities);
});

router.post('/', async (req, res) => {
  const { name, domain } = req.body;

  if (!name || !domain) {
    return res.status(400).json({ error: 'name and domain are required' });
  }

  const university = await prisma.university.create({
    data: { name, domain },
  });

  res.status(201).json(university);
});

module.exports = router;
