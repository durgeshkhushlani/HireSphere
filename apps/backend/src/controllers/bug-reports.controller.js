const ApiError = require('../lib/ApiError');
const bugReportsService = require('../services/bug-reports.service');

// Same in-memory sliding-window pattern as demo.controller.js — this is a
// public, unauthenticated endpoint that sends real email, so it needs its
// own throttle independent of any per-user limit.
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX_REPORTS = 10;
const reportTimestamps = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const recent = (reportTimestamps.get(ip) || []).filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS
  );
  if (recent.length >= RATE_LIMIT_MAX_REPORTS) {
    throw ApiError.tooManyRequests('Too many bug reports submitted — try again later');
  }
  recent.push(now);
  reportTimestamps.set(ip, recent);
}

async function submit(req, res) {
  checkRateLimit(req.ip);
  const result = await bugReportsService.submitReport(req.body);
  res.status(201).json(result);
}

function _resetRateLimitForTests() {
  reportTimestamps.clear();
}

module.exports = { submit, _resetRateLimitForTests };
