const express = require('express');
const companyPortalController = require('../controllers/company-portal.controller');

const router = express.Router();

// Public — this is the login endpoint itself, for a caller with no account.
router.post('/login', companyPortalController.login);

module.exports = router;
