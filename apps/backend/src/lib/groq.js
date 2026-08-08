// Thin client for an OpenAI-compatible chat completions endpoint — no SDK
// dependency, this is a v1 stopgap (see PROGRESS.md) likely to be reworked
// in v2. Under NODE_ENV=test, returns a canned response instead of hitting
// the network, same reasoning as src/lib/mailer.js: tests and CI never need
// a real key or network access.
//
// Briefly tried swapping to Cerebras (2026-08-04) after exhausting Groq's
// 100K-token/day free quota mid-testing, but the new Cerebras account
// returned 402 payment_required on every model — account-level activation
// still pending on their end. Back on Groq for now; CEREBRAS_API_KEY/
// CEREBRAS_MODEL are still in .env, unused, ready to flip back once that's
// sorted (see PROGRESS.md).
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Multiple free-tier keys, tried in order — GROQ_API_KEY is primary,
// GROQ_API_KEY2/3 are only ever used after the current one comes back
// rate-limited. activeKeyIndex persists across requests in this process (not
// reset per-call) so a key that's already known to be exhausted isn't
// re-tried on every single message; it wraps back to the first key once
// every key has failed once in a given call, since an earlier key's
// per-minute budget may have reset by the time we cycle back to it.
const API_KEYS = [process.env.GROQ_API_KEY, process.env.GROQ_API_KEY2, process.env.GROQ_API_KEY3].filter(
  Boolean
);
let activeKeyIndex = 0;

let lastTestRequest = null;
let lastTestTools = null;
// Explicit test seam for tool-calling: tests queue up exactly what the fake
// client should return on successive calls (e.g. a tool_calls response, then
// a plain-text one). Empty queue = default canned reply, so every existing
// test that doesn't care about tool calls is unaffected.
let testResponseQueue = [];

async function chatCompletion(messages, tools) {
  if (process.env.NODE_ENV === 'test') {
    lastTestRequest = messages;
    lastTestTools = tools;
    if (testResponseQueue.length > 0) {
      return testResponseQueue.shift();
    }
    return { role: 'assistant', content: 'This is a test response from the fake Groq client.' };
  }

  const body = {
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    messages,
    ...(tools && tools.length > 0 && { tools, tool_choice: 'auto' }),
  };

  // tool_use_failed is a known, non-deterministic Groq failure mode (the
  // model's raw generation doesn't parse into a clean tool call) — the exact
  // same request can succeed on a plain retry. Retry once with tools intact
  // (best chance of still getting a real, data-backed answer); only if that
  // retry also fails, fall back once more with tools stripped so the user at
  // least gets a plain-text reply instead of a raw error.
  const attempt = async (payload, apiKey) => {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      let code;
      let retryAfterSeconds;
      try {
        const parsed = JSON.parse(text);
        code = parsed?.error?.code;
        // Groq puts the wait time in the message text ("...try again in
        // 11.59s..."), not a structured field — pull it out so the caller
        // can show a real countdown instead of a wall of raw JSON.
        const match = /try again in ([\d.]+)s/i.exec(parsed?.error?.message || '');
        if (match) retryAfterSeconds = Math.ceil(Number(match[1]));
      } catch {
        // not JSON — leave code/retryAfterSeconds undefined
      }
      if (retryAfterSeconds === undefined) {
        const header = Number(res.headers.get('retry-after'));
        if (!Number.isNaN(header)) retryAfterSeconds = Math.ceil(header);
      }
      const err = new Error(`Groq API error ${res.status}: ${text}`);
      err.groqCode = code;
      err.groqStatus = res.status;
      err.retryAfterSeconds = retryAfterSeconds;
      throw err;
    }

    const data = await res.json();
    return data.choices[0].message;
  };

  const attemptWithToolFallback = async (apiKey) => {
    try {
      return await attempt(body, apiKey);
    } catch (err) {
      if (err.groqCode !== 'tool_use_failed' || !body.tools) throw err;

      try {
        return await attempt(body, apiKey);
      } catch (retryErr) {
        if (retryErr.groqCode !== 'tool_use_failed') throw retryErr;
        const { tools: _tools, tool_choice: _toolChoice, ...withoutTools } = body;
        return attempt(withoutTools, apiKey);
      }
    }
  };

  // Key rotation: a 429 (rate_limit_exceeded) on the active key moves to the
  // next configured key rather than failing the request outright — each key
  // has its own independent per-minute/day quota. Tries every configured key
  // at most once per call; a single-key setup behaves exactly as before
  // (throws immediately, no rotation possible).
  let lastErr;
  for (let i = 0; i < API_KEYS.length; i += 1) {
    const apiKey = API_KEYS[activeKeyIndex];
    try {
      return await attemptWithToolFallback(apiKey);
    } catch (err) {
      lastErr = err;
      if (err.groqStatus !== 429 || API_KEYS.length <= 1) throw err;
      activeKeyIndex = (activeKeyIndex + 1) % API_KEYS.length;
    }
  }
  throw lastErr;
}

function getLastTestRequest() {
  return lastTestRequest;
}

function getLastTestTools() {
  return lastTestTools;
}

function setTestResponseQueue(responses) {
  testResponseQueue = [...responses];
}

module.exports = { chatCompletion, getLastTestRequest, getLastTestTools, setTestResponseQueue };
