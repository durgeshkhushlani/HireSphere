const express = require('express');
const applicationsController = require('../controllers/applications.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.use(requireAuth);

// Must stay above '/:id' so 'me' isn't swallowed as an id.
router.get('/me', requireRole('STUDENT'), applicationsController.listMine);
router.get('/:id', applicationsController.getById);
// Withdraw/edit are student-only and self-scoped (via req.user.id, not a
// param) — requireEditableByStudent in the service enforces the
// APPLIED + drive-still-OPEN gate.
router.delete('/:id', requireRole('STUDENT'), applicationsController.withdraw);
router.patch('/:id', requireRole('STUDENT'), applicationsController.updateMyApplication);
// A COMPANY caller may only update statuses for their own drive's
// applications — enforced in applications.service.js's updateStatus, since
// the application's driveId isn't known until it's fetched there.
router.patch(
  '/:id/status',
  requireRole('ADMIN', 'COMPANY'),
  applicationsController.updateStatus
);
router.patch(
  '/:id/schedule-resume',
  requireRole('ADMIN'),
  applicationsController.scheduleResumeDelivery
);

module.exports = router;
