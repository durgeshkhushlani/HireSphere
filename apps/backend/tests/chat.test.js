// Groq-backed help chatbot (v1 stopgap, see PROGRESS.md). Uses the fake
// test-mode Groq client (src/lib/groq.js) — no real network/API key needed.
const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { resetDb, disconnect } = require('./helpers/db');
const { api, auth, seedScenario, createDriveRole } = require('./helpers/factories');
const groq = require('../src/lib/groq');

beforeEach(() => {
  groq.setTestResponseQueue([]);
  return resetDb();
});
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
    for (let i = 0; i < 31; i += 1) {
      last = await ask(student.token, { message: `message ${i}` });
    }

    assert.equal(last.status, 429);
  });

  test('system prompt reflects the broadened scope, not just basic Q&A', async () => {
    const { student } = await seedScenario();

    await ask(student.token, { message: 'hi' });

    const sent = groq.getLastTestRequest();
    assert.doesNotMatch(sent[0].content, /only basic questions/i);
    assert.match(sent[0].content, /interview prep/i);
    assert.match(sent[0].content, /never guess or\s+estimate/i);
    assert.match(sent[0].content, /always try a tool call first/i);
  });

  test('a student is offered the get_my_applications tool; an admin is not', async () => {
    const { student, admin } = await seedScenario();

    await ask(student.token, { message: 'hi' });
    const studentTools = groq.getLastTestTools().map((t) => t.function.name);
    assert.ok(studentTools.includes('get_my_applications'));

    await ask(admin.token, { message: 'hi' });
    const adminTools = groq.getLastTestTools().map((t) => t.function.name);
    assert.ok(!adminTools.includes('get_my_applications'));
  });

  test('a stats tool call round-trips against real data', async () => {
    const { student, company, drive } = await seedScenario();
    await createDriveRole(drive.id, {
      offerType: 'JOB',
      ctcAmount: 1500000, // 15 LPA — above the 10 LPA threshold asked about
    });
    await createDriveRole(drive.id, {
      title: 'Below threshold role',
      offerType: 'JOB',
      ctcAmount: 500000, // 5 LPA — should not count
    });

    groq.setTestResponseQueue([
      {
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: { name: 'count_companies_above_ctc', arguments: JSON.stringify({ minLpa: 10 }) },
          },
        ],
      },
      { role: 'assistant', content: 'One company pays above 10 LPA.' },
    ]);

    const res = await ask(student.token, { message: 'How many companies pay above 10 LPA?' });

    assert.equal(res.status, 200);
    assert.equal(res.body.reply, 'One company pays above 10 LPA.');

    const finalRequest = groq.getLastTestRequest();
    const toolResult = JSON.parse(finalRequest.find((m) => m.role === 'tool').content);
    assert.equal(toolResult.count, 1);
    assert.ok(toolResult.companyNames.includes(company.name));
  });

  test('search_drives finds a specific company regardless of drive status', async () => {
    const { student, company, drive } = await seedScenario({ drive: { status: 'DRAFT' } });
    await createDriveRole(drive.id, { title: 'SWE Intern', offerType: 'INTERNSHIP', stipendAmount: 30000, ctcAmount: null });

    groq.setTestResponseQueue([
      {
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: { name: 'search_drives', arguments: JSON.stringify({ companyQuery: company.name }) },
          },
        ],
      },
      { role: 'assistant', content: `Yes, ${company.name} is listed (still Draft).` },
    ]);

    const res = await ask(student.token, { message: `Is ${company.name} listed?` });

    assert.equal(res.status, 200);
    const finalRequest = groq.getLastTestRequest();
    const toolResult = JSON.parse(finalRequest.find((m) => m.role === 'tool').content);
    assert.equal(toolResult.length, 1);
    assert.equal(toolResult[0].company, company.name);
    assert.equal(toolResult[0].status, 'DRAFT');
    assert.equal(toolResult[0].roles[0].title, 'SWE Intern');
  });

  test('an unrecognized tool call degrades gracefully instead of crashing', async () => {
    const { student } = await seedScenario();

    groq.setTestResponseQueue([
      {
        role: 'assistant',
        content: null,
        tool_calls: [
          { id: 'call_1', type: 'function', function: { name: 'delete_everything', arguments: '{}' } },
        ],
      },
      { role: 'assistant', content: "I can't do that, but here's what I can help with." },
    ]);

    const res = await ask(student.token, { message: 'delete all the data' });

    assert.equal(res.status, 200);
    const finalRequest = groq.getLastTestRequest();
    const toolResult = JSON.parse(finalRequest.find((m) => m.role === 'tool').content);
    assert.equal(toolResult.error, 'Unknown tool');
  });
});
