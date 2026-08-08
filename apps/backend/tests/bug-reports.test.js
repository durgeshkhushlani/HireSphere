const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { resetDb, disconnect } = require('./helpers/db');
const { api } = require('./helpers/factories');
const mailer = require('../src/lib/mailer');
const bugReportsController = require('../src/controllers/bug-reports.controller');

beforeEach(async () => {
  await resetDb();
  bugReportsController._resetRateLimitForTests();
});
after(disconnect);

const submit = (body) => api().post('/api/bug-reports/submit').send(body);

describe('POST /api/bug-reports/submit', () => {
  test('sends an email to the fixed recipient with the report details', async () => {
    const res = await submit({
      name: 'Jane Doe',
      email: 'jane@example.com',
      description: 'The apply button does nothing on Safari.',
      category: 'STUDENT_VIEW',
    });

    assert.equal(res.status, 201);
    const message = mailer.getLastTestMessage();
    assert.equal(message.to[0].address, 'durgeshkhushlani@gmail.com');
    assert.match(message.subject, /Student view/);
    assert.match(message.text, /Jane Doe/);
    assert.match(message.text, /jane@example.com/);
    assert.match(message.text, /The apply button does nothing on Safari\./);
  });

  test('name is optional', async () => {
    const res = await submit({
      email: 'anon@example.com',
      description: 'Something is broken.',
      category: 'OTHER',
    });

    assert.equal(res.status, 201);
    const message = mailer.getLastTestMessage();
    assert.match(message.text, /not provided/);
  });

  test('rejects a missing email', async () => {
    const res = await submit({
      description: 'Something is broken.',
      category: 'OTHER',
    });
    assert.equal(res.status, 400);
  });

  test('rejects a malformed email', async () => {
    const res = await submit({
      email: 'not-an-email',
      description: 'Something is broken.',
      category: 'OTHER',
    });
    assert.equal(res.status, 400);
  });

  test('rejects a missing description', async () => {
    const res = await submit({
      email: 'jane@example.com',
      category: 'OTHER',
    });
    assert.equal(res.status, 400);
  });

  test('rejects an invalid category', async () => {
    const res = await submit({
      email: 'jane@example.com',
      description: 'Something is broken.',
      category: 'NOT_A_CATEGORY',
    });
    assert.equal(res.status, 400);
  });

  test('rate-limits repeated submissions from the same caller', async () => {
    for (let i = 0; i < 10; i++) {
      const res = await submit({
        email: 'jane@example.com',
        description: 'Something is broken.',
        category: 'OTHER',
      });
      assert.equal(res.status, 201);
    }
    const res = await submit({
      email: 'jane@example.com',
      description: 'Something is broken.',
      category: 'OTHER',
    });
    assert.equal(res.status, 429);
  });
});
