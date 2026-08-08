const notificationsService = require('../services/notifications.service');

async function list(req, res) {
  res.json(await notificationsService.listRecipients(req.user.universityId));
}

async function add(req, res) {
  const recipient = await notificationsService.addRecipient(req.user.universityId, req.body);
  res.status(201).json(recipient);
}

async function remove(req, res) {
  await notificationsService.removeRecipient(req.params.id, req.user.universityId);
  res.status(204).end();
}

module.exports = { list, add, remove };
