const express = require('express');
const studentsController = require('../controllers/students.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.use(requireAuth);

router.get('/me', requireRole('STUDENT'), studentsController.getMe);
router.patch('/me', requireRole('STUDENT'), studentsController.updateMe);
router.post(
  '/me/resume-upload-signature',
  requireRole('STUDENT'),
  studentsController.getResumeUploadSignature
);

// Both roles: a student needs to know which fields to fill in, an admin
// needs to manage them. Write operations stay admin-only.
router.get('/field-definitions', studentsController.listFieldDefinitions);
router.post('/field-definitions', requireRole('ADMIN'), studentsController.createFieldDefinition);
router.delete('/field-definitions/:id', requireRole('ADMIN'), studentsController.deleteFieldDefinition);

router.get('/', requireRole('ADMIN'), studentsController.list);
// Registered after /me and /field-definitions — GET /:userId would
// otherwise swallow those exact-path routes first.
router.get('/:userId', requireRole('ADMIN'), studentsController.getById);
router.patch('/:userId/verify', requireRole('ADMIN'), studentsController.setVerified);

module.exports = router;
