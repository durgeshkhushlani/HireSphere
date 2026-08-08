// Direct unit tests for the chat assistant's tool layer — bypasses the LLM
// entirely (no HTTP, no Groq) so the security-critical role checks are
// verified deterministically, not through a non-deterministic model round
// trip. See chat.test.js for the end-to-end HTTP-level coverage.
const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { resetDb, disconnect, prisma } = require('./helpers/db');
const {
  createUniversity,
  createProgram,
  createCompany,
  createDrive,
  registerStudent,
  registerAdmin,
} = require('./helpers/factories');
const chatTools = require('../src/services/chat-tools');

beforeEach(resetDb);
after(disconnect);

function contextFor(user) {
  return { userId: user.id, universityId: user.universityId, role: user.role };
}

describe('chat-tools role gating', () => {
  test('get_my_profile denies a caller whose role is ADMIN', async () => {
    const university = await createUniversity();
    const admin = await registerAdmin(university.id);

    const result = await chatTools.executeTool('get_my_profile', {}, contextFor(admin.user));

    assert.equal(result.error, 'Only available to students');
  });

  test('get_my_profile returns the real profile for a STUDENT caller', async () => {
    const university = await createUniversity();
    const program = await createProgram();
    const student = await registerStudent(university.id, program.id, { cgpa: 8.7 });

    const result = await chatTools.executeTool('get_my_profile', {}, contextFor(student.user));

    assert.equal(result.email, student.user.email);
    assert.equal(result.program, program.name);
    assert.equal(Number(result.cgpa), 8.7);
    assert.equal(result.placementLocked, false);
  });

  test('find_applicants denies a caller whose role is STUDENT', async () => {
    const university = await createUniversity();
    const program = await createProgram();
    const student = await registerStudent(university.id, program.id);

    const result = await chatTools.executeTool(
      'find_applicants',
      { query: 'anyone' },
      contextFor(student.user)
    );

    assert.equal(result.error, 'Only available to admins');
  });

  test("find_applicants never returns another university's applicant, even by exact applicationId", async () => {
    // University A: the admin who will run the lookup.
    const uniA = await createUniversity();
    const adminA = await registerAdmin(uniA.id);

    // University B: a real applicant, real drive, completely separate tenant.
    const uniB = await createUniversity();
    const programB = await createProgram();
    const companyB = await createCompany();
    const driveB = await createDrive(uniB.id, companyB.id, { status: 'OPEN' });
    const studentB = await registerStudent(uniB.id, programB.id);
    const application = await prisma.application.create({
      data: { driveId: driveB.id, studentProfileId: studentB.user.id, responses: {} },
    });

    const result = await chatTools.executeTool(
      'find_applicants',
      { applicationId: application.id },
      contextFor(adminA.user)
    );

    assert.deepEqual(result, []);
  });

  test('find_applicants finds a real applicant within the caller\'s own university', async () => {
    const university = await createUniversity();
    const program = await createProgram();
    const company = await createCompany();
    const drive = await createDrive(university.id, company.id, { status: 'OPEN' });
    const admin = await registerAdmin(university.id);
    const student = await registerStudent(university.id, program.id, { name: 'Priya Sharma' });
    await prisma.application.create({
      data: { driveId: drive.id, studentProfileId: student.user.id, responses: {} },
    });

    const result = await chatTools.executeTool(
      'find_applicants',
      { query: 'Priya' },
      contextFor(admin.user)
    );

    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'Priya Sharma');
    assert.equal(result[0].company, company.name);
  });

  test('search_drives returns drives of every status, not just OPEN', async () => {
    const university = await createUniversity();
    const company = await createCompany();
    const admin = await registerAdmin(university.id);
    await createDrive(university.id, company.id, { status: 'DRAFT' });

    const result = await chatTools.executeTool(
      'search_drives',
      { companyQuery: company.name },
      contextFor(admin.user)
    );

    assert.equal(result.length, 1);
    assert.equal(result[0].status, 'DRAFT');
  });
});
