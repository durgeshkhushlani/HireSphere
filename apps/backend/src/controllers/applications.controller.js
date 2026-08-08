const applicationsService = require('../services/applications.service');

async function applyToDrive(req, res) {
  const application = await applicationsService.applyToDrive({
    driveId: req.params.driveId,
    universityId: req.user.universityId,
    studentProfileId: req.user.id,
    responses: req.body.responses,
    rolePreferences: req.body.rolePreferences,
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

async function withdraw(req, res) {
  await applicationsService.withdraw(req.params.id, req.user.id);
  res.status(204).end();
}

async function updateMyApplication(req, res) {
  const application = await applicationsService.updateMyApplication(req.params.id, req.user.id, {
    responses: req.body.responses,
    rolePreferences: req.body.rolePreferences,
  });
  res.json(application);
}

async function updateStatus(req, res) {
  const callerDriveId = req.user.role === 'COMPANY' ? req.user.driveId : undefined;
  const application = await applicationsService.updateStatus(
    req.params.id,
    req.user.universityId,
    req.body,
    callerDriveId
  );
  res.json(application);
}

async function bulkSetInterviewSchedule(req, res) {
  const applications = await applicationsService.bulkSetInterviewSchedule(
    req.params.driveId,
    req.user.universityId,
    req.body
  );
  res.json(applications);
}

async function scheduleResumeDelivery(req, res) {
  const application = await applicationsService.scheduleResumeDelivery(
    req.params.id,
    req.user.universityId,
    req.body
  );
  res.json(application);
}

module.exports = {
  applyToDrive,
  listForDrive,
  listMine,
  getById,
  withdraw,
  updateMyApplication,
  updateStatus,
  bulkSetInterviewSchedule,
  scheduleResumeDelivery,
};
