const express = require('express');
const adoptionRequestsController = require('../controllers/adoption-requests.controller');

const router = express.Router();

// Deliberately not behind requireAuth — a university interested in
// HireSphere doesn't have an account yet.
router.post('/submit', adoptionRequestsController.submit);

module.exports = router;
