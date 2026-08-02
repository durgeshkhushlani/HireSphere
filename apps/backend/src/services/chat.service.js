const ApiError = require('../lib/ApiError');
const groq = require('../lib/groq');

const SYSTEM_PROMPT = `You are the HireSphere help assistant. HireSphere is a university campus
placement management platform. Answer only basic questions about how the platform works, in 2-4
short sentences. If asked something outside HireSphere's scope, say you can only help with
HireSphere questions.

Key facts about HireSphere:
- Two account roles: Admin (university placement cell staff) and Student. Companies are data,
  not accounts.
- Students register with their university email, verified via a one-time code sent to that
  email, before they can apply to anything.
- Admins post "drives" (a specific company's hiring opportunity) with a status of DRAFT, OPEN, or
  CLOSED. Students can only apply while a drive is OPEN.
- Each drive can have a custom application form and eligibility rules (minimum CGPA, maximum
  backlogs, and/or a restricted list of eligible degree programs).
- After applying, a student's application moves through a fixed pipeline: Applied, Shortlisted,
  OA/Test, Interview, Selected, or Not Selected. An admin manually updates this status.
- Once a student is marked Selected in any drive, they get a global placement lock and cannot
  apply to any other drive — this is the standard "already placed" rule for placement season.
- Resumes can be scheduled to be emailed to the hiring company at a specific date/time.`;

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const MAX_HISTORY_TURNS = 10;

// In-memory only — resets on restart, and won't work across multiple server
// instances. Fine for v1 single-process scope; not meant to survive a real
// multi-instance deployment. Purpose is just to cap cost exposure on a paid
// external API, not to be a bulletproof rate limiter.
const requestLog = new Map();

function checkRateLimit(userId) {
  const now = Date.now();
  const recent = (requestLog.get(userId) || []).filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS
  );
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    throw ApiError.tooManyRequests('Too many chat messages — please wait a moment and try again');
  }
  recent.push(now);
  requestLog.set(userId, recent);
}

function sanitizeHistory(history) {
  if (history === undefined) return [];
  if (!Array.isArray(history)) {
    throw ApiError.badRequest('history must be an array');
  }
  return history
    .filter(
      (turn) =>
        turn &&
        (turn.role === 'user' || turn.role === 'assistant') &&
        typeof turn.content === 'string'
    )
    .slice(-MAX_HISTORY_TURNS)
    .map((turn) => ({ role: turn.role, content: turn.content }));
}

async function askChat(userId, { message, history }) {
  if (!message || typeof message !== 'string') {
    throw ApiError.badRequest('message is required');
  }

  checkRateLimit(userId);
  const priorTurns = sanitizeHistory(history);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...priorTurns,
    { role: 'user', content: message },
  ];

  let reply;
  try {
    reply = await groq.chatCompletion(messages);
  } catch (err) {
    throw ApiError.badGateway(`Chat assistant is unavailable: ${err.message}`);
  }

  return { reply: reply.content };
}

module.exports = { askChat };
