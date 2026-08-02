const express = require('express');
const universityProgramsController = require('../controllers/university-programs.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.use(requireAuth);

router.post('/', requireRole('ADMIN'), universityProgramsController.create);

module.exports = router;
