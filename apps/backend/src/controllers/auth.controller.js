const authService = require('../services/auth.service');

async function registerAdmin(req, res) {
  res.status(201).json(await authService.registerAdmin(req.body));
}

async function registerStudent(req, res) {
  res.status(201).json(await authService.registerStudent(req.body));
}

async function login(req, res) {
  res.json(await authService.login(req.body));
}

async function me(req, res) {
  res.json(await authService.getPublicUser(req.user.id));
}

module.exports = { registerAdmin, registerStudent, login, me };
