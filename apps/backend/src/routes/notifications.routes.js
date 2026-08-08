const express = require('express');
const notificationsController = require('../controllers/notifications.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/', notificationsController.list);
router.post('/', notificationsController.add);
router.delete('/:id', notificationsController.remove);

module.exports = router;
