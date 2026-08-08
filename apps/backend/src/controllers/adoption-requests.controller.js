const ApiError = require('../lib/ApiError');
const adoptionRequestsService = require('../services/adoption-requests.service');

// Same in-memory sliding-window pattern as bug-reports.controller.js — this
// is a public, unauthenticated endpoint that sends real email, so it needs
// its own throttle independent of any per-user limit.
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const requestTimestamps = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const recent = (requestTimestamps.get(ip) || []).filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS
  );
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    throw ApiError.tooManyRequests('Too many requests submitted — try again later');
  }
  recent.push(now);
  requestTimestamps.set(ip, recent);
}

async function submit(req, res) {
  checkRateLimit(req.ip);
  const result = await adoptionRequestsService.submitRequest(req.body);
  res.status(201).json(result);
}

function _resetRateLimitForTests() {
  requestTimestamps.clear();
}

module.exports = { submit, _resetRateLimitForTests };
