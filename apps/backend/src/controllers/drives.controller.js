const drivesService = require('../services/drives.service');

async function list(req, res) {
  res.json(await drivesService.listForUniversity(req.user.universityId));
}

async function getById(req, res) {
  res.json(await drivesService.getForUniversity(req.params.id, req.user.universityId));
}

async function create(req, res) {
  res.status(201).json(await drivesService.create(req.body, req.user.universityId));
}

async function updateStatus(req, res) {
  const drive = await drivesService.updateStatus(
    req.params.id,
    req.user.universityId,
    req.body.status
  );
  res.json(drive);
}

async function getApplicationForm(req, res) {
  res.json(await drivesService.getApplicationForm(req.params.driveId, req.user.universityId));
}

async function setApplicationForm(req, res) {
  const form = await drivesService.setApplicationForm(
    req.params.driveId,
    req.user.universityId,
    req.body.questions
  );
  res.json(form);
}

async function getEligiblePrograms(req, res) {
  res.json(await drivesService.getEligiblePrograms(req.params.driveId, req.user.universityId));
}

async function setEligiblePrograms(req, res) {
  const programs = await drivesService.setEligiblePrograms(
    req.params.driveId,
    req.user.universityId,
    req.body.programIds
  );
  res.json(programs);
}

async function setRoles(req, res) {
  const roles = await drivesService.setRoles(
    req.params.driveId,
    req.user.universityId,
    req.body.roles
  );
  res.json(roles);
}

module.exports = {
  list,
  getById,
  create,
  updateStatus,
  getApplicationForm,
  setApplicationForm,
  getEligiblePrograms,
  setEligiblePrograms,
  setRoles,
};
