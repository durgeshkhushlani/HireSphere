const companiesService = require('../services/companies.service');

async function list(req, res) {
  res.json(await companiesService.list());
}

async function getById(req, res) {
  res.json(await companiesService.getById(req.params.id));
}

async function create(req, res) {
  res.status(201).json(await companiesService.create(req.body));
}

async function update(req, res) {
  res.json(await companiesService.update(req.params.id, req.body));
}

module.exports = { list, getById, create, update };
