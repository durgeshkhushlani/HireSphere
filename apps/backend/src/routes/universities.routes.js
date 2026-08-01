const express = require('express');
const universitiesController = require('../controllers/universities.controller');

const router = express.Router();

// Intentionally unauthenticated: a university must exist before its first
// admin can register against it. Treat as a seed/onboarding endpoint.
router.get('/', universitiesController.list);
router.post('/', universitiesController.create);

module.exports = router;
