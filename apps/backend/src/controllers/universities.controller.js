const universitiesService = require('../services/universities.service');

async function list(req, res) {
  res.json(await universitiesService.list());
}

async function listPending(req, res) {
  res.json(await universitiesService.listPending());
}

async function create(req, res) {
  res.status(201).json(await universitiesService.create(req.body));
}

async function listPrograms(req, res) {
  res.json(await universitiesService.listPrograms(req.params.universityId));
}

module.exports = { list, listPending, create, listPrograms };
