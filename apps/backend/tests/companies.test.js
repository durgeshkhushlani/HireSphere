const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { resetDb, disconnect } = require('./helpers/db');
const { api, auth, createUniversity, createCompany, registerAdmin, registerStudent, createProgram } = require('./helpers/factories');

beforeEach(resetDb);
after(disconnect);

describe('GET /api/companies', () => {
  test('lists companies', async () => {
    const company = await createCompany();
    const university = await createUniversity();
    const admin = await registerAdmin(university.id);

    const res = await api().get('/api/companies').set(...auth(admin.token));

    assert.equal(res.status, 200);
    assert.ok(res.body.some((c) => c.id === company.id));
  });

  test('requires authentication', async () => {
    const res = await api().get('/api/companies');
    assert.equal(res.status, 401);
  });
});

describe('POST /api/companies', () => {
  test('lets an admin create a company with full details', async () => {
    const university = await createUniversity();
    const admin = await registerAdmin(university.id);

    const res = await api()
      .post('/api/companies')
      .set(...auth(admin.token))
      .send({
        name: 'TechNova Systems',
        industry: 'Software',
        contactEmail: 'hiring@technova.test',
        contactPhone: '1234567890',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.name, 'TechNova Systems');
    assert.equal(res.body.industry, 'Software');
  });

  test('forbids a student', async () => {
    const university = await createUniversity();
    const program = await createProgram();
    const student = await registerStudent(university.id, program.id);

    const res = await api()
      .post('/api/companies')
      .set(...auth(student.token))
      .send({ name: 'TechNova Systems' });

    assert.equal(res.status, 403);
  });
});

describe('PATCH /api/companies/:id', () => {
  test('lets an admin update a company', async () => {
    const company = await createCompany({ name: 'Old Name' });
    const university = await createUniversity();
    const admin = await registerAdmin(university.id);

    const res = await api()
      .patch(`/api/companies/${company.id}`)
      .set(...auth(admin.token))
      .send({ name: 'New Name', contactEmail: 'contact@new.test' });

    assert.equal(res.status, 200);
    assert.equal(res.body.name, 'New Name');
    assert.equal(res.body.contactEmail, 'contact@new.test');
  });

  test('leaves fields untouched when omitted', async () => {
    const company = await createCompany({ name: 'Keep Name', industry: 'Keep Industry' });
    const university = await createUniversity();
    const admin = await registerAdmin(university.id);

    const res = await api()
      .patch(`/api/companies/${company.id}`)
      .set(...auth(admin.token))
      .send({ contactPhone: '9998887777' });

    assert.equal(res.status, 200);
    assert.equal(res.body.name, 'Keep Name');
    assert.equal(res.body.industry, 'Keep Industry');
    assert.equal(res.body.contactPhone, '9998887777');
  });

  test('forbids a student', async () => {
    const company = await createCompany();
    const university = await createUniversity();
    const program = await createProgram();
    const student = await registerStudent(university.id, program.id);

    const res = await api()
      .patch(`/api/companies/${company.id}`)
      .set(...auth(student.token))
      .send({ name: 'New Name' });

    assert.equal(res.status, 403);
  });

  test('requires authentication', async () => {
    const company = await createCompany();

    const res = await api().patch(`/api/companies/${company.id}`).send({ name: 'New Name' });

    assert.equal(res.status, 401);
  });

  test('404s for an unknown company', async () => {
    const university = await createUniversity();
    const admin = await registerAdmin(university.id);

    const res = await api()
      .patch('/api/companies/00000000-0000-0000-0000-000000000000')
      .set(...auth(admin.token))
      .send({ name: 'New Name' });

    assert.equal(res.status, 404);
  });

  test('rejects an empty name with 400', async () => {
    const company = await createCompany();
    const university = await createUniversity();
    const admin = await registerAdmin(university.id);

    const res = await api()
      .patch(`/api/companies/${company.id}`)
      .set(...auth(admin.token))
      .send({ name: '' });

    assert.equal(res.status, 400);
  });
});
