require('./env');
const request = require('supertest');
const app = require('../../src/app');
const { prisma } = require('./db');
const mailer = require('../../src/lib/mailer');

let counter = 0;
const unique = () => `${Date.now()}-${++counter}`;

const api = () => request(app);
const auth = (token) => ['Authorization', `Bearer ${token}`];

function createUniversity(overrides = {}) {
  const n = unique();
  return prisma.university.create({
    data: { name: `Test University ${n}`, domain: `test-${n}.edu`, verified: true, ...overrides },
  });
}

// Drives the real OTP endpoints end-to-end, pulling the code out of the fake
// mail transport (mailer.js) instead of a real inbox — same flow a real
// signup goes through, just without a network hop.
async function requestAndVerifyOtp(email) {
  const requested = await api().post('/api/auth/otp/request').send({ email });
  if (requested.status !== 200) {
    throw new Error(`OTP request failed for ${email}: ${JSON.stringify(requested.body)}`);
  }

  const message = mailer.getLastTestMessage();
  const code = message?.text?.match(/\d{6}/)?.[0];
  if (!code) throw new Error('Could not read OTP code from the captured test message');

  const verified = await api().post('/api/auth/otp/verify').send({ email, code });
  if (verified.status !== 200) {
    throw new Error(`OTP verify failed for ${email}: ${JSON.stringify(verified.body)}`);
  }
  return verified.body.verificationToken;
}

function createProgram(overrides = {}) {
  return prisma.program.create({ data: { name: `Program ${unique()}`, ...overrides } });
}

function createCompany(overrides = {}) {
  return prisma.company.create({ data: { name: `Company ${unique()}`, ...overrides } });
}

async function registerAdmin(universityId, overrides = {}) {
  const university = await prisma.university.findUniqueOrThrow({ where: { id: universityId } });
  const email = overrides.email || `admin-${unique()}@${university.domain}`;
  const verificationToken =
    overrides.verificationToken || (await requestAndVerifyOtp(email));

  const res = await api()
    .post('/api/auth/register/admin')
    .send({
      verificationToken,
      email,
      password: 'secret123',
      name: 'Test Admin',
      ...overrides,
    });
  return { token: res.body.token, user: res.body.user, res };
}

async function registerStudent(universityId, programId, overrides = {}) {
  const university = await prisma.university.findUniqueOrThrow({ where: { id: universityId } });
  const email = overrides.email || `student-${unique()}@${university.domain}`;
  const verificationToken =
    overrides.verificationToken || (await requestAndVerifyOtp(email));

  const res = await api()
    .post('/api/auth/register/student')
    .send({
      verificationToken,
      programId,
      email,
      password: 'secret123',
      name: 'Test Student',
      cgpa: 8.5,
      ...overrides,
    });
  return { token: res.body.token, user: res.body.user, res };
}

function createUniversityProgram(universityId, programId) {
  return prisma.universityProgram.create({ data: { universityId, programId } });
}

function createDrive(universityId, companyId, overrides = {}) {
  return prisma.drive.create({
    data: { universityId, companyId, title: `Drive ${unique()}`, ...overrides },
  });
}

function createDriveRole(driveId, overrides = {}) {
  return prisma.driveRole.create({
    data: {
      driveId,
      title: `Role ${unique()}`,
      offerType: 'JOB',
      description: 'Job description',
      ctcAmount: 1200000,
      ...overrides,
    },
  });
}

/** University + admin + student + company + one OPEN drive. */
async function seedScenario({ drive: driveOverrides = {}, student: studentOverrides = {} } = {}) {
  const university = await createUniversity();
  const program = await createProgram();
  const company = await createCompany();
  const admin = await registerAdmin(university.id);
  const student = await registerStudent(university.id, program.id, studentOverrides);
  const drive = await createDrive(university.id, company.id, {
    status: 'OPEN',
    ...driveOverrides,
  });

  return { university, program, company, admin, student, drive };
}

module.exports = {
  api,
  auth,
  unique,
  createUniversity,
  createProgram,
  createCompany,
  createUniversityProgram,
  createDrive,
  createDriveRole,
  requestAndVerifyOtp,
  registerAdmin,
  registerStudent,
  seedScenario,
};
