const express = require('express');
const universitiesController = require('../controllers/universities.controller');

const router = express.Router();

// Intentionally unauthenticated: a university must exist before its first
// admin can register against it. Treat as a seed/onboarding endpoint.
// Only verified universities are returned here (real pre-registration
// discovery, e.g. a signup dropdown) — see listPending for requests
// awaiting the manual verification step.
router.get('/', universitiesController.list);
router.post('/', universitiesController.create);

// Also unauthenticated for now — no platform-operator role exists yet to
// gate this behind, which means the contact info here is publicly listable
// until that role is built. Flagged as a real tradeoff, not an oversight.
router.get('/pending', universitiesController.listPending);

// Also unauthenticated: a student needs to see which programs their
// university offers before they have any account/token to register with.
router.get('/:universityId/programs', universitiesController.listPrograms);

module.exports = router;
