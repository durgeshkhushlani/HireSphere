const express = require('express');
const drivesController = require('../controllers/drives.controller');
const applicationsController = require('../controllers/applications.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.use(requireAuth);

router.get('/', drivesController.list);
router.get('/:id', drivesController.getById);
router.post('/', requireRole('ADMIN'), drivesController.create);
router.patch('/:id/status', requireRole('ADMIN'), drivesController.updateStatus);

// Per-drive application form (the question set students answer).
router.get('/:driveId/application-form', drivesController.getApplicationForm);
router.put(
  '/:driveId/application-form',
  requireRole('ADMIN'),
  drivesController.setApplicationForm
);

// Per-drive program eligibility restriction.
router.get('/:driveId/eligible-programs', drivesController.getEligiblePrograms);
router.put(
  '/:driveId/eligible-programs',
  requireRole('ADMIN'),
  drivesController.setEligiblePrograms
);

// Applications nested under a drive.
router.post('/:driveId/applications', requireRole('STUDENT'), applicationsController.applyToDrive);
router.get('/:driveId/applications', requireRole('ADMIN'), applicationsController.listForDrive);

module.exports = router;
