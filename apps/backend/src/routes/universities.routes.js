const express = require('express');
const universitiesController = require('../controllers/universities.controller');

const router = express.Router();

// Intentionally unauthenticated: a university must exist before its first
// admin can register against it. Treat as a seed/onboarding endpoint.
router.get('/', universitiesController.list);
router.post('/', universitiesController.create);

// Also unauthenticated: a student needs to see which programs their
// university offers before they have any account/token to register with.
router.get('/:universityId/programs', universitiesController.listPrograms);

module.exports = router;
