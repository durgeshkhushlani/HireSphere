const express = require('express');
const programsController = require('../controllers/programs.controller');

const router = express.Router();

// Intentionally unauthenticated, same reasoning as /api/universities: a
// student picking a program has no account/token yet, and the global catalog
// (shared across all universities, see schema §5) has no owning admin to gate
// writes behind until there's a real platform-operator role.
router.get('/', programsController.list);
router.post('/', programsController.create);

module.exports = router;
