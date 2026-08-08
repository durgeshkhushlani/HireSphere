const studentsService = require('../services/students.service');
const studentFieldsService = require('../services/student-fields.service');
const { generateResumeUploadSignature } = require('../lib/cloudinary');

async function getMe(req, res) {
  res.json(await studentsService.getFullProfile(req.user.id));
}

async function updateMe(req, res) {
  res.json(await studentsService.updateProfile(req.user.id, req.body));
}

async function getResumeUploadSignature(req, res) {
  res.json(generateResumeUploadSignature(req.user.id));
}

async function list(req, res) {
  res.json(await studentsService.listForUniversity(req.user.universityId));
}

async function getById(req, res) {
  res.json(await studentsService.getFullProfileForUniversity(req.params.userId, req.user.universityId));
}

async function setVerified(req, res) {
  const profile = await studentsService.setVerified(
    req.params.userId,
    req.user.universityId,
    req.body.verified
  );
  res.json(profile);
}

async function setPlacementLock(req, res) {
  const profile = await studentsService.setPlacementLock(
    req.params.userId,
    req.user.universityId,
    req.body.locked
  );
  res.json(profile);
}

async function listFieldDefinitions(req, res) {
  res.json(await studentFieldsService.listForUniversity(req.user.universityId));
}

async function createFieldDefinition(req, res) {
  const definition = await studentFieldsService.create(req.user.universityId, req.body);
  res.status(201).json(definition);
}

async function deleteFieldDefinition(req, res) {
  await studentFieldsService.remove(req.params.id, req.user.universityId);
  res.status(204).send();
}

module.exports = {
  getMe,
  updateMe,
  getResumeUploadSignature,
  list,
  getById,
  setVerified,
  setPlacementLock,
  listFieldDefinitions,
  createFieldDefinition,
  deleteFieldDefinition,
};
