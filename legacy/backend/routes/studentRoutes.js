const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');
const { getProfile, updateProfile } = require('../controllers/studentController');

router.use(protect, requireRole('student'));

router.get('/profile', getProfile);
router.put('/profile', upload.single('resume'), updateProfile);

module.exports = router;
