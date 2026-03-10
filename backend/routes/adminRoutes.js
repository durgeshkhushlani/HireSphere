const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middlewares/authMiddleware');
const { getStudents, getProfile, updateProfile } = require('../controllers/adminController');

router.use(protect, requireRole('admin'));

router.get('/students', getStudents);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

module.exports = router;
