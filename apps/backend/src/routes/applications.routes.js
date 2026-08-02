const express = require('express');
const applicationsController = require('../controllers/applications.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.use(requireAuth);

// Must stay above '/:id' so 'me' isn't swallowed as an id.
router.get('/me', requireRole('STUDENT'), applicationsController.listMine);
router.get('/:id', applicationsController.getById);
router.patch('/:id/status', requireRole('ADMIN'), applicationsController.updateStatus);
router.patch(
  '/:id/schedule-resume',
  requireRole('ADMIN'),
  applicationsController.scheduleResumeDelivery
);

module.exports = router;
