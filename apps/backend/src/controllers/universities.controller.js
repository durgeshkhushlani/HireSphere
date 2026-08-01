const universitiesService = require('../services/universities.service');

async function list(req, res) {
  res.json(await universitiesService.list());
}

async function create(req, res) {
  res.status(201).json(await universitiesService.create(req.body));
}

module.exports = { list, create };
