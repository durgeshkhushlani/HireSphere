// Global Program catalog + per-university UniversityProgram links. Both were
// previously only creatable by hand via a throwaway script.
const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { resetDb, disconnect } = require('./helpers/db');
const {
  api,
  auth,
  createUniversity,
  createProgram,
  createUniversityProgram,
  registerAdmin,
} = require('./helpers/factories');

beforeEach(resetDb);
after(disconnect);

describe('GET /api/programs', () => {
  test('requires no authentication', async () => {
    const res = await api().get('/api/programs');
    assert.equal(res.status, 200);
  });

  test('lists the global catalog', async () => {
    const program = await createProgram();

    const res = await api().get('/api/programs');

    assert.ok(res.body.some((p) => p.id === program.id));
  });
});

describe('POST /api/programs', () => {
  test('requires no authentication and creates a program', async () => {
    const res = await api().post('/api/programs').send({ name: 'Electrical Engineering' });

    assert.equal(res.status, 201);
    assert.equal(res.body.name, 'Electrical Engineering');
  });

  test('rejects a missing name with 400', async () => {
    const res = await api().post('/api/programs').send({});
    assert.equal(res.status, 400);
  });

  test('rejects a duplicate name with 409', async () => {
    await api().post('/api/programs').send({ name: 'Mechanical Engineering' });

    const res = await api().post('/api/programs').send({ name: 'Mechanical Engineering' });

    assert.equal(res.status, 409);
  });
});

describe('GET /api/universities/:universityId/programs', () => {
  test('empty by default (no programs linked yet)', async () => {
    const university = await createUniversity();

    const res = await api().get(`/api/universities/${university.id}/programs`);

    assert.equal(res.status, 200);
    assert.deepEqual(res.body, []);
  });

  test('lists programs linked to that university, not others', async () => {
    const university = await createUniversity();
    const program = await createProgram();
    await createUniversityProgram(university.id, program.id);

    const other = await createUniversity();
    const otherProgram = await createProgram();
    await createUniversityProgram(other.id, otherProgram.id);

    const res = await api().get(`/api/universities/${university.id}/programs`);

    assert.equal(res.status, 200);
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].id, program.id);
  });

  test('requires no authentication', async () => {
    const university = await createUniversity();

    const res = await api().get(`/api/universities/${university.id}/programs`);

    assert.equal(res.status, 200);
  });

  test('404s for an unknown university', async () => {
    const res = await api().get(
      '/api/universities/00000000-0000-0000-0000-000000000000/programs'
    );

    assert.equal(res.status, 404);
  });
});

describe('POST /api/university-programs', () => {
  test('lets an admin link a program to their own university', async () => {
    const university = await createUniversity();
    const program = await createProgram();
    const admin = await registerAdmin(university.id);

    const res = await api()
      .post('/api/university-programs')
      .set(...auth(admin.token))
      .send({ programId: program.id });

    assert.equal(res.status, 201);
    assert.equal(res.body.universityId, university.id);
    assert.equal(res.body.programId, program.id);
    assert.equal(res.body.program.name, program.name);

    const list = await api().get(`/api/universities/${university.id}/programs`);
    assert.equal(list.body.length, 1);
    assert.equal(list.body[0].id, program.id);
  });

  test('requires authentication', async () => {
    const program = await createProgram();

    const res = await api().post('/api/university-programs').send({ programId: program.id });

    assert.equal(res.status, 401);
  });

  test('forbids a student', async () => {
    const university = await createUniversity();
    const program = await createProgram();
    const { registerStudent } = require('./helpers/factories');
    const studentProgram = await createProgram();
    await createUniversityProgram(university.id, studentProgram.id);
    const student = await registerStudent(university.id, studentProgram.id);

    const res = await api()
      .post('/api/university-programs')
      .set(...auth(student.token))
      .send({ programId: program.id });

    assert.equal(res.status, 403);
  });

  test('ignores a client-supplied universityId and scopes to the JWT', async () => {
    const university = await createUniversity();
    const other = await createUniversity();
    const program = await createProgram();
    const admin = await registerAdmin(university.id);

    const res = await api()
      .post('/api/university-programs')
      .set(...auth(admin.token))
      .send({ programId: program.id, universityId: other.id });

    assert.equal(res.status, 201);
    assert.equal(res.body.universityId, university.id, 'must use the JWT university, not the body');
  });

  test('rejects a missing programId with 400', async () => {
    const university = await createUniversity();
    const admin = await registerAdmin(university.id);

    const res = await api()
      .post('/api/university-programs')
      .set(...auth(admin.token))
      .send({});

    assert.equal(res.status, 400);
  });

  test('rejects an unknown programId with 400', async () => {
    const university = await createUniversity();
    const admin = await registerAdmin(university.id);

    const res = await api()
      .post('/api/university-programs')
      .set(...auth(admin.token))
      .send({ programId: '00000000-0000-0000-0000-000000000000' });

    assert.equal(res.status, 400);
  });

  test('rejects linking the same program twice with 409', async () => {
    const university = await createUniversity();
    const program = await createProgram();
    const admin = await registerAdmin(university.id);
    await createUniversityProgram(university.id, program.id);

    const res = await api()
      .post('/api/university-programs')
      .set(...auth(admin.token))
      .send({ programId: program.id });

    assert.equal(res.status, 409);
  });
});
