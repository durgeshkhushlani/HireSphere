const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { resetDb, disconnect } = require('./helpers/db');
const { api } = require('./helpers/factories');
const mailer = require('../src/lib/mailer');
const adoptionRequestsController = require('../src/controllers/adoption-requests.controller');

beforeEach(async () => {
  await resetDb();
  adoptionRequestsController._resetRateLimitForTests();
});
after(disconnect);

const submit = (body) => api().post('/api/adoption-requests/submit').send(body);

describe('POST /api/adoption-requests/submit', () => {
  test('sends an email to the fixed recipient with the request details', async () => {
    const res = await submit({
      name: 'Priya Sharma',
      email: 'priya@iitb.ac.in',
      universityName: 'IIT Bombay',
      message: 'We have about 3000 final-year students.',
    });

    assert.equal(res.status, 201);
    const message = mailer.getLastTestMessage();
    assert.equal(message.to[0].address, 'durgeshkhushlani@gmail.com');
    assert.match(message.subject, /IIT Bombay/);
    assert.match(message.text, /Priya Sharma/);
    assert.match(message.text, /priya@iitb\.ac\.in/);
    assert.match(message.text, /3000 final-year students/);
  });

  test('message is optional', async () => {
    const res = await submit({
      name: 'Priya Sharma',
      email: 'priya@iitb.ac.in',
      universityName: 'IIT Bombay',
    });

    assert.equal(res.status, 201);
    const message = mailer.getLastTestMessage();
    assert.match(message.text, /not provided/);
  });

  test('rejects a missing name', async () => {
    const res = await submit({ email: 'priya@iitb.ac.in', universityName: 'IIT Bombay' });
    assert.equal(res.status, 400);
  });

  test('rejects a missing email', async () => {
    const res = await submit({ name: 'Priya Sharma', universityName: 'IIT Bombay' });
    assert.equal(res.status, 400);
  });

  test('rejects a malformed email', async () => {
    const res = await submit({
      name: 'Priya Sharma',
      email: 'not-an-email',
      universityName: 'IIT Bombay',
    });
    assert.equal(res.status, 400);
  });

  test('rejects a missing university name', async () => {
    const res = await submit({ name: 'Priya Sharma', email: 'priya@iitb.ac.in' });
    assert.equal(res.status, 400);
  });

  test('rate-limits repeated submissions from the same caller', async () => {
    for (let i = 0; i < 10; i++) {
      const res = await submit({
        name: 'Priya Sharma',
        email: 'priya@iitb.ac.in',
        universityName: 'IIT Bombay',
      });
      assert.equal(res.status, 201);
    }
    const res = await submit({
      name: 'Priya Sharma',
      email: 'priya@iitb.ac.in',
      universityName: 'IIT Bombay',
    });
    assert.equal(res.status, 429);
  });
});
