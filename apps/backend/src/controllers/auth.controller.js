const authService = require('../services/auth.service');
const otpService = require('../services/otp.service');

async function requestOtp(req, res) {
  res.json(await otpService.requestOtp(req.body.email));
}

async function verifyOtp(req, res) {
  res.json(await otpService.verifyOtp(req.body.email, req.body.code));
}

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

module.exports = { requestOtp, verifyOtp, registerAdmin, registerStudent, login, me };
