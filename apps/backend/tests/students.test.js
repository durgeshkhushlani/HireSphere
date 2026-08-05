const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { resetDb, disconnect } = require('./helpers/db');
const { api, auth, createUniversity, createProgram, registerStudent, registerAdmin } = require('./helpers/factories');

beforeEach(resetDb);
after(disconnect);

async function seed() {
  const university = await createUniversity();
  const program = await createProgram();
  const admin = await registerAdmin(university.id);
  const student = await registerStudent(university.id, program.id);
  return { university, program, admin, student };
}

// All 5 fixed fields are required together — tests that only care about
// something else (custom fields, verification locking) need a complete
// baseline first, same as a real student would fill in before an admin ever
// verifies them.
const COMPLETE_FIXED_FIELDS = {
  studentId: 'TEST-001',
  tenthPercentage: 90,
  twelfthPercentage: 85,
  bloodGroup: 'O+',
  address: '221B Baker St',
  phone: '9999999999',
};

function fillFixedFields(token) {
  return api().patch('/api/students/me').set(...auth(token)).send(COMPLETE_FIXED_FIELDS);
}

describe('GET /api/students/me', () => {
  test('returns the student\'s own profile with no custom fields defined yet', async () => {
    const { student } = await seed();

    const res = await api().get('/api/students/me').set(...auth(student.token));

    assert.equal(res.status, 200);
    assert.equal(res.body.verified, false);
    assert.deepEqual(res.body.customFields, []);
  });

  test('is forbidden to admins', async () => {
    const { admin } = await seed();
    const res = await api().get('/api/students/me').set(...auth(admin.token));
    assert.equal(res.status, 403);
  });
});

describe('PATCH /api/students/me', () => {
  test('a student can update core fields while unverified', async () => {
    const { student } = await seed();

    const res = await api()
      .patch('/api/students/me')
      .set(...auth(student.token))
      .send({ ...COMPLETE_FIXED_FIELDS, tenthPercentage: 92.5 });

    assert.equal(res.status, 200);
    assert.equal(Number(res.body.tenthPercentage), 92.5);
    assert.equal(res.body.bloodGroup, 'O+');
  });

  test('rejects a blanked required field instead of silently keeping the old value', async () => {
    const { student } = await seed();
    await fillFixedFields(student.token);

    const res = await api()
      .patch('/api/students/me')
      .set(...auth(student.token))
      .send({ ...COMPLETE_FIXED_FIELDS, bloodGroup: null });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /Blood group/);

    const unchanged = await api().get('/api/students/me').set(...auth(student.token));
    assert.equal(unchanged.body.bloodGroup, 'O+');
  });

  test('rejects an out-of-range percentage', async () => {
    const { student } = await seed();
    const res = await api()
      .patch('/api/students/me')
      .set(...auth(student.token))
      .send({ tenthPercentage: 150 });
    assert.equal(res.status, 400);
  });

  test('once verified, only address/phone remain editable', async () => {
    const { student, admin } = await seed();
    await fillFixedFields(student.token);

    const verifyRes = await api()
      .patch(`/api/students/${student.user.id}/verify`)
      .set(...auth(admin.token))
      .send({ verified: true });
    assert.equal(verifyRes.status, 200);

    const blocked = await api()
      .patch('/api/students/me')
      .set(...auth(student.token))
      .send({ bloodGroup: 'AB+' });
    assert.equal(blocked.status, 403);

    const allowed = await api()
      .patch('/api/students/me')
      .set(...auth(student.token))
      .send({ address: 'New address', phone: '8888888888' });
    assert.equal(allowed.status, 200);
    assert.equal(allowed.body.address, 'New address');
  });
});

describe('PATCH /api/students/:userId/verify', () => {
  test('404s for a student in a different university', async () => {
    const { admin } = await seed();
    const otherUniversity = await createUniversity();
    const otherProgram = await createProgram();
    const otherStudent = await registerStudent(otherUniversity.id, otherProgram.id);

    const res = await api()
      .patch(`/api/students/${otherStudent.user.id}/verify`)
      .set(...auth(admin.token))
      .send({ verified: true });

    assert.equal(res.status, 404);
  });

  test('is forbidden to students', async () => {
    const { student } = await seed();
    const res = await api()
      .patch(`/api/students/${student.user.id}/verify`)
      .set(...auth(student.token))
      .send({ verified: true });
    assert.equal(res.status, 403);
  });
});

describe('Custom field definitions', () => {
  test('a dropdown field requires a non-empty options list', async () => {
    const { admin } = await seed();
    const res = await api()
      .post('/api/students/field-definitions')
      .set(...auth(admin.token))
      .send({ label: 'T-shirt size', fieldType: 'DROPDOWN', required: false, options: [] });
    assert.equal(res.status, 400);
  });

  test('creating a field is forbidden to students', async () => {
    const { student } = await seed();
    const res = await api()
      .post('/api/students/field-definitions')
      .set(...auth(student.token))
      .send({ label: 'Hostel', fieldType: 'TEXT' });
    assert.equal(res.status, 403);
  });

  test('a student rejects a dropdown value outside the defined options', async () => {
    const { admin, student } = await seed();
    await fillFixedFields(student.token);
    const def = await api()
      .post('/api/students/field-definitions')
      .set(...auth(admin.token))
      .send({ label: 'T-shirt size', fieldType: 'DROPDOWN', required: false, options: ['S', 'M', 'L'] });
    assert.equal(def.status, 201);

    const bad = await api()
      .patch('/api/students/me')
      .set(...auth(student.token))
      .send({ customFieldValues: { [def.body.id]: 'XL' } });
    assert.equal(bad.status, 400);

    const good = await api()
      .patch('/api/students/me')
      .set(...auth(student.token))
      .send({ customFieldValues: { [def.body.id]: 'M' } });
    assert.equal(good.status, 200);
    assert.equal(good.body.customFields[0].value, 'M');
  });

  test('a required field must be set before other custom-field updates are accepted', async () => {
    const { admin, student } = await seed();
    await fillFixedFields(student.token);
    const def = await api()
      .post('/api/students/field-definitions')
      .set(...auth(admin.token))
      .send({ label: 'Hostel name', fieldType: 'TEXT', required: true });
    assert.equal(def.status, 201);

    // Submitting a different field's value without also satisfying the
    // required one should still fail.
    const otherDef = await api()
      .post('/api/students/field-definitions')
      .set(...auth(admin.token))
      .send({ label: 'Nickname', fieldType: 'TEXT', required: false });

    const missing = await api()
      .patch('/api/students/me')
      .set(...auth(student.token))
      .send({ customFieldValues: { [otherDef.body.id]: 'Foo' } });
    assert.equal(missing.status, 400);
    assert.match(missing.body.error, /Hostel name/);

    const satisfied = await api()
      .patch('/api/students/me')
      .set(...auth(student.token))
      .send({ customFieldValues: { [def.body.id]: 'Sunrise Hostel', [otherDef.body.id]: 'Foo' } });
    assert.equal(satisfied.status, 200);
  });

  test('deleting a field removes it and any stored values', async () => {
    const { admin, student } = await seed();
    await fillFixedFields(student.token);
    const def = await api()
      .post('/api/students/field-definitions')
      .set(...auth(admin.token))
      .send({ label: 'Nickname', fieldType: 'TEXT', required: false });
    const setValue = await api()
      .patch('/api/students/me')
      .set(...auth(student.token))
      .send({ customFieldValues: { [def.body.id]: 'Foo' } });
    assert.equal(setValue.status, 200);

    const del = await api()
      .delete(`/api/students/field-definitions/${def.body.id}`)
      .set(...auth(admin.token));
    assert.equal(del.status, 204);

    const profile = await api().get('/api/students/me').set(...auth(student.token));
    assert.deepEqual(profile.body.customFields, []);
  });
});

describe('GET /api/students', () => {
  test('lists students at the admin\'s own university', async () => {
    const { admin, student } = await seed();
    const res = await api().get('/api/students').set(...auth(admin.token));
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].userId, student.user.id);
  });

  test('is forbidden to students', async () => {
    const { student } = await seed();
    const res = await api().get('/api/students').set(...auth(student.token));
    assert.equal(res.status, 403);
  });
});

describe('GET /api/students/:userId', () => {
  test('returns the full profile (including custom fields) for review before verifying', async () => {
    const { admin, student } = await seed();
    await api()
      .post('/api/students/field-definitions')
      .set(...auth(admin.token))
      .send({ label: 'Nickname', fieldType: 'TEXT', required: false });
    await api()
      .patch('/api/students/me')
      .set(...auth(student.token))
      .send({ ...COMPLETE_FIXED_FIELDS, bloodGroup: 'B+' });

    const res = await api().get(`/api/students/${student.user.id}`).set(...auth(admin.token));

    assert.equal(res.status, 200);
    assert.equal(res.body.bloodGroup, 'B+');
    assert.equal(res.body.customFields.length, 1);
    assert.equal(res.body.customFields[0].label, 'Nickname');
  });

  test('404s for a student in a different university', async () => {
    const { admin } = await seed();
    const otherUniversity = await createUniversity();
    const otherProgram = await createProgram();
    const otherStudent = await registerStudent(otherUniversity.id, otherProgram.id);

    const res = await api().get(`/api/students/${otherStudent.user.id}`).set(...auth(admin.token));
    assert.equal(res.status, 404);
  });

  test('is forbidden to students', async () => {
    const { student } = await seed();
    const res = await api().get(`/api/students/${student.user.id}`).set(...auth(student.token));
    assert.equal(res.status, 403);
  });
});
