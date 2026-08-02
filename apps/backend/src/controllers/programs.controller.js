const programsService = require('../services/programs.service');

async function list(req, res) {
  res.json(await programsService.list());
}

async function create(req, res) {
  res.status(201).json(await programsService.create(req.body));
}

module.exports = { list, create };
