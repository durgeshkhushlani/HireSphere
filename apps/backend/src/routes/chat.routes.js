const express = require('express');
const chatController = require('../controllers/chat.controller');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

// Authenticated (any role) — not public, since every request costs money
// against a paid external API. requireRole not needed: both Admin and
// Student should be able to ask basic questions.
router.use(requireAuth);
router.post('/', chatController.ask);

module.exports = router;
