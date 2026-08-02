// Groq-backed help chatbot (v1 stopgap, see PROGRESS.md). Uses the fake
// test-mode Groq client (src/lib/groq.js) — no real network/API key needed.
const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { resetDb, disconnect } = require('./helpers/db');
const { api, auth, seedScenario } = require('./helpers/factories');
const groq = require('../src/lib/groq');

beforeEach(resetDb);
after(disconnect);

const ask = (token, body) =>
  api()
    .post('/api/chat')
    .set(...auth(token))
    .send(body);

describe('POST /api/chat', () => {
  test('requires authentication', async () => {
    const res = await api().post('/api/chat').send({ message: 'hi' });
    assert.equal(res.status, 401);
  });

  test('a student gets a reply', async () => {
    const { student } = await seedScenario();

    const res = await ask(student.token, { message: 'What does OPEN mean for a drive?' });

    assert.equal(res.status, 200);
    assert.ok(res.body.reply);
  });

  test('an admin gets a reply', async () => {
    const { admin } = await seedScenario();

    const res = await ask(admin.token, { message: 'How does the placement lock work?' });

    assert.equal(res.status, 200);
    assert.ok(res.body.reply);
  });

  test('rejects a missing message with 400', async () => {
    const { student } = await seedScenario();

    const res = await ask(student.token, {});

    assert.equal(res.status, 400);
  });

  test('includes the system prompt and the message in the request sent to Groq', async () => {
    const { student } = await seedScenario();

    await ask(student.token, { message: 'How do I apply to a drive?' });

    const sent = groq.getLastTestRequest();
    assert.equal(sent[0].role, 'system');
    assert.match(sent[0].content, /HireSphere/);
    assert.deepEqual(sent.at(-1), { role: 'user', content: 'How do I apply to a drive?' });
  });

  test('forwards prior history in order before the new message', async () => {
    const { student } = await seedScenario();
    const history = [
      { role: 'user', content: 'What is HireSphere?' },
      { role: 'assistant', content: 'A campus placement platform.' },
    ];

    await ask(student.token, { message: 'follow-up question', history });

    const sent = groq.getLastTestRequest();
    // system, then the two history turns, then the new user message.
    assert.equal(sent.length, 4);
    assert.deepEqual(sent[1], history[0]);
    assert.deepEqual(sent[2], history[1]);
    assert.deepEqual(sent[3], { role: 'user', content: 'follow-up question' });
  });

  test('rejects a non-array history with 400', async () => {
    const { student } = await seedScenario();

    const res = await ask(student.token, { message: 'hi', history: 'not-an-array' });

    assert.equal(res.status, 400);
  });

  test('drops malformed entries out of history instead of erroring', async () => {
    const { student } = await seedScenario();
    const history = [
      { role: 'user', content: 'ok' },
      { role: 'system', content: 'not allowed to be spoofed' },
      { notRole: 'x' },
      'just a string',
    ];

    const res = await ask(student.token, { message: 'hi', history });

    assert.equal(res.status, 200);
    const sent = groq.getLastTestRequest();
    // system + the one valid history turn + the new user message.
    assert.equal(sent.length, 3);
  });

  test('rate-limits after too many requests in a short window', async () => {
    const { student } = await seedScenario();

    let last;
    for (let i = 0; i < 11; i += 1) {
      last = await ask(student.token, { message: `message ${i}` });
    }

    assert.equal(last.status, 429);
  });
});
