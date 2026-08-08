const express = require('express');
const bugReportsController = require('../controllers/bug-reports.controller');

const router = express.Router();

// Deliberately not behind requireAuth — reportable from the logged-out
// landing/auth pages too.
router.post('/submit', bugReportsController.submit);

module.exports = router;
