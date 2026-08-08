const express = require('express');
const demoController = require('../controllers/demo.controller');

const router = express.Router();

// Deliberately not behind requireAuth — this is the entry point for
// visitors who have no account at all.
router.post('/start', demoController.start);

module.exports = router;
