const express = require('express');
const companiesController = require('../controllers/companies.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.use(requireAuth);

router.get('/', companiesController.list);
router.get('/:id', companiesController.getById);
router.post('/', requireRole('ADMIN'), companiesController.create);

module.exports = router;
