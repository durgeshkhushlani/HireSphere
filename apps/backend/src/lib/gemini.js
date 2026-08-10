// Thin client for Gemini's OpenAI-compatible chat completions endpoint — no
// SDK dependency. Same request/response contract (tools, tool_choice,
// tool_calls) as the OpenAI chat completions API, so callers never touch
// provider-specific shapes. Under NODE_ENV=test, returns a canned response
// instead of hitting the network, same reasoning as src/lib/mailer.js: tests
// and CI never need a real key or network access.
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

// Two free-tier keys, tried in order — GEMINI_KEY_1 is primary, GEMINI_KEY_2
// is only ever used after the current one comes back rate-limited.
// activeKeyIndex persists across requests in this process (not reset
// per-call) so a key that's already known to be exhausted isn't re-tried on
// every single message; it wraps back to the first key once every key has
// failed once in a given call, since an earlier key's per-minute budget may
// have reset by the time we cycle back to it.
const API_KEYS = [process.env.GEMINI_KEY_1, process.env.GEMINI_KEY_2].filter(Boolean);
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
    return { role: 'assistant', content: 'This is a test response from the fake Gemini client.' };
  }

  if (API_KEYS.length === 0) {
    // Without this, the retry loop below never runs (API_KEYS.length is the
    // loop bound), lastErr stays undefined, and `throw lastErr` throws
    // undefined — console.error(undefined) then logs nothing useful,
    // turning a one-line config fix into a real debugging session.
    throw new Error('No Gemini API key configured — set GEMINI_KEY_1 (and optionally GEMINI_KEY_2)');
  }

  const body = {
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
    messages,
    ...(tools && tools.length > 0 && { tools, tool_choice: 'auto' }),
  };

  // A malformed/unparseable tool call surfaces as a 400 on this endpoint —
  // the exact same request can succeed on a plain retry. Retry once with
  // tools intact (best chance of still getting a real, data-backed answer);
  // only if that retry also fails, fall back once more with tools stripped
  // so the user at least gets a plain-text reply instead of a raw error.
  const attempt = async (payload, apiKey) => {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      let retryAfterSeconds;
      try {
        const parsed = JSON.parse(text);
        // Some providers put the wait time in the message text ("...try
        // again in 11.59s..."), not a structured field — pull it out if
        // present so the caller can show a real countdown instead of a wall
        // of raw JSON. Harmless no-op if the message doesn't match.
        const match = /try again in ([\d.]+)s/i.exec(parsed?.error?.message || '');
        if (match) retryAfterSeconds = Math.ceil(Number(match[1]));
      } catch {
        // not JSON — leave retryAfterSeconds undefined
      }
      if (retryAfterSeconds === undefined) {
        const header = Number(res.headers.get('retry-after'));
        if (!Number.isNaN(header)) retryAfterSeconds = Math.ceil(header);
      }
      const err = new Error(`Gemini API error ${res.status}: ${text}`);
      err.apiStatus = res.status;
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
      if (err.apiStatus !== 400 || !body.tools) throw err;

      try {
        return await attempt(body, apiKey);
      } catch (retryErr) {
        if (retryErr.apiStatus !== 400) throw retryErr;
        const { tools: _tools, tool_choice: _toolChoice, ...withoutTools } = body;
        return attempt(withoutTools, apiKey);
      }
    }
  };

  // Key rotation: a 429 (rate limit) on the active key moves to the next
  // configured key rather than failing the request outright — each key has
  // its own independent per-minute/day quota. Tries every configured key at
  // most once per call; a single-key setup behaves exactly as before (throws
  // immediately, no rotation possible).
  let lastErr;
  for (let i = 0; i < API_KEYS.length; i += 1) {
    const apiKey = API_KEYS[activeKeyIndex];
    try {
      return await attemptWithToolFallback(apiKey);
    } catch (err) {
      lastErr = err;
      if (err.apiStatus !== 429 || API_KEYS.length <= 1) throw err;
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
