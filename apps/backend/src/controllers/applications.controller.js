const applicationsService = require('../services/applications.service');

async function applyToDrive(req, res) {
  const application = await applicationsService.applyToDrive({
    driveId: req.params.driveId,
    universityId: req.user.universityId,
    studentProfileId: req.user.id,
    responses: req.body.responses,
    resumeUrl: req.body.resumeUrl,
  });
  res.status(201).json(application);
}

async function listForDrive(req, res) {
  res.json(await applicationsService.listForDrive(req.params.driveId, req.user.universityId));
}

async function listMine(req, res) {
  res.json(await applicationsService.listForStudent(req.user.id));
}

async function getById(req, res) {
  res.json(await applicationsService.getForUser(req.params.id, req.user));
}

async function updateStatus(req, res) {
  const application = await applicationsService.updateStatus(
    req.params.id,
    req.user.universityId,
    req.body
  );
  res.json(application);
}

module.exports = { applyToDrive, listForDrive, listMine, getById, updateStatus };
