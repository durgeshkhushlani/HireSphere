const placementsService = require('../services/placements.service');

async function list(req, res) {
  res.json(await placementsService.listForUniversity(req.user.universityId));
}

async function listMine(req, res) {
  res.json(await placementsService.listForStudent(req.user.id));
}

module.exports = { list, listMine };
