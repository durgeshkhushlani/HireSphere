const ApiError = require('../lib/ApiError');
const demoService = require('../services/demo.service');

// In-memory sliding window, same pattern as chat.service.js's rate limiter —
// good enough for a single-process deploy, and demo-abuse only needs to be
// throttled, not perfectly enforced across a fleet.
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX_STARTS = 5;
const startTimestamps = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const recent = (startTimestamps.get(ip) || []).filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS
  );
  if (recent.length >= RATE_LIMIT_MAX_STARTS) {
    throw ApiError.tooManyRequests('Too many demo sessions started — try again later');
  }
  recent.push(now);
  startTimestamps.set(ip, recent);
}

async function start(req, res) {
  checkRateLimit(req.ip);
  const session = await demoService.startDemo();
  res.status(201).json(session);
}

// Test-only escape hatch — the rate-limit Map is module-level state that
// would otherwise leak across test cases sharing the same supertest IP.
function _resetRateLimitForTests() {
  startTimestamps.clear();
}

module.exports = { start, _resetRateLimitForTests };
