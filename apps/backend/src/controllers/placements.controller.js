const placementsService = require('../services/placements.service');

async function list(req, res) {
  res.json(await placementsService.listForUniversity(req.user.universityId, req.query.academicYear));
}

async function listMine(req, res) {
  res.json(await placementsService.listForStudent(req.user.id));
}

module.exports = { list, listMine };
