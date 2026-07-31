const express = require('express');
const router = express.Router();
const { adminSignup, adminLogin, studentSignup, studentLogin } = require('../controllers/authController');

router.post('/admin/signup', adminSignup);
router.post('/admin/login', adminLogin);
router.post('/student/signup', studentSignup);
router.post('/student/login', studentLogin);

module.exports = router;
