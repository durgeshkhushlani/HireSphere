// University onboarding: creation captures a contact (so a pending request
// is actually actionable), the public list only surfaces verified entries,
// and /pending is where an outstanding request can be found and reviewed.
const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { resetDb, disconnect } = require('./helpers/db');
const { api, createUniversity } = require('./helpers/factories');

beforeEach(resetDb);
after(disconnect);

const validPayload = (overrides = {}) => ({
  name: 'DAU',
  domain: `dau-${Date.now()}.ac.in`,
  contactName: 'Placement Cell',
  contactEmail: 'placement@dau.ac.in',
  ...overrides,
});

describe('POST /api/universities', () => {
  test('requires no authentication and creates an unverified university', async () => {
    const res = await api().post('/api/universities').send(validPayload());

    assert.equal(res.status, 201);
    assert.equal(res.body.verified, false);
    assert.equal(res.body.contactName, 'Placement Cell');
    assert.equal(res.body.contactEmail, 'placement@dau.ac.in');
  });

  for (const missing of ['name', 'domain', 'contactName', 'contactEmail']) {
    test(`rejects a missing ${missing} with 400`, async () => {
      const payload = validPayload();
      delete payload[missing];

      const res = await api().post('/api/universities').send(payload);

      assert.equal(res.status, 400);
    });
  }

  test('rejects a duplicate domain with 409', async () => {
    const payload = validPayload();
    await api().post('/api/universities').send(payload);

    const res = await api().post('/api/universities').send(validPayload({ domain: payload.domain }));

    assert.equal(res.status, 409);
  });
});

describe('GET /api/universities', () => {
  test('requires no authentication', async () => {
    const res = await api().get('/api/universities');
    assert.equal(res.status, 200);
  });

  test('only lists verified universities', async () => {
    const verified = await createUniversity({ verified: true });
    const pending = await createUniversity({ verified: false });

    const res = await api().get('/api/universities');

    const ids = res.body.map((u) => u.id);
    assert.ok(ids.includes(verified.id));
    assert.ok(!ids.includes(pending.id));
  });
});

describe('GET /api/universities/pending', () => {
  test('only lists unverified universities, including contact info', async () => {
    const verified = await createUniversity({ verified: true });
    const pending = await createUniversity({
      verified: false,
      contactName: 'Placement Cell',
      contactEmail: 'placement@pending.edu',
    });

    const res = await api().get('/api/universities/pending');

    const ids = res.body.map((u) => u.id);
    assert.ok(ids.includes(pending.id));
    assert.ok(!ids.includes(verified.id));

    const entry = res.body.find((u) => u.id === pending.id);
    assert.equal(entry.contactEmail, 'placement@pending.edu');
  });

  test('is empty once everything is verified', async () => {
    await createUniversity({ verified: true });

    const res = await api().get('/api/universities/pending');

    assert.deepEqual(res.body, []);
  });
});
