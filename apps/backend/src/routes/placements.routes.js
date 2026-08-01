const express = require('express');
const placementsController = require('../controllers/placements.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.use(requireAuth);

// Must stay above '/:id'-style routes if any are added later.
router.get('/me', requireRole('STUDENT'), placementsController.listMine);
router.get('/', requireRole('ADMIN'), placementsController.list);

module.exports = router;
