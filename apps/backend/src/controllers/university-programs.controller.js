const universityProgramsService = require('../services/university-programs.service');

async function create(req, res) {
  res.status(201).json(await universityProgramsService.create(req.user.universityId, req.body));
}

module.exports = { create };
