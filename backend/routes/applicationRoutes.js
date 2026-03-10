const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');
const {
  submitApplication,
  getApplicationsByCompany,
  downloadResumes,
  getStudentApplications,
} = require('../controllers/applicationController');

router.use(protect);

router.post('/', requireRole('student'), upload.single('resume'), submitApplication);
router.get('/student', requireRole('student'), getStudentApplications);
router.get('/company/:companyId', requireRole('admin'), getApplicationsByCompany);
router.get('/company/:companyId/download', requireRole('admin'), downloadResumes);

module.exports = router;
