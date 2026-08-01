const express = require('express');
const authController = require('../controllers/auth.controller');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.post('/register/admin', authController.registerAdmin);
router.post('/register/student', authController.registerStudent);
router.post('/login', authController.login);
router.get('/me', requireAuth, authController.me);

module.exports = router;
