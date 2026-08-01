require('./env');
const request = require('supertest');
const app = require('../../src/app');
const { prisma } = require('./db');

let counter = 0;
const unique = () => `${Date.now()}-${++counter}`;

const api = () => request(app);
const auth = (token) => ['Authorization', `Bearer ${token}`];

function createUniversity(overrides = {}) {
  const n = unique();
  return prisma.university.create({
    data: { name: `Test University ${n}`, domain: `test-${n}.edu`, ...overrides },
  });
}

function createProgram(overrides = {}) {
  return prisma.program.create({ data: { name: `Program ${unique()}`, ...overrides } });
}

function createCompany(overrides = {}) {
  return prisma.company.create({ data: { name: `Company ${unique()}`, ...overrides } });
}

async function registerAdmin(universityId, overrides = {}) {
  const res = await api()
    .post('/api/auth/register/admin')
    .send({
      universityId,
      email: `admin-${unique()}@test.edu`,
      password: 'secret123',
      name: 'Test Admin',
      ...overrides,
    });
  return { token: res.body.token, user: res.body.user, res };
}

async function registerStudent(universityId, programId, overrides = {}) {
  const res = await api()
    .post('/api/auth/register/student')
    .send({
      universityId,
      programId,
      email: `student-${unique()}@test.edu`,
      password: 'secret123',
      name: 'Test Student',
      cgpa: 8.5,
      ...overrides,
    });
  return { token: res.body.token, user: res.body.user, res };
}

function createDrive(universityId, companyId, overrides = {}) {
  return prisma.drive.create({
    data: { universityId, companyId, title: `Drive ${unique()}`, ...overrides },
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
  createDrive,
  registerAdmin,
  registerStudent,
  seedScenario,
};
