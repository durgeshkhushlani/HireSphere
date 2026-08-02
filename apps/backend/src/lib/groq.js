// Thin client for Groq's OpenAI-compatible chat completions endpoint — no
// SDK dependency, this is a v1 stopgap (see PROGRESS.md) likely to be
// reworked in v2. Under NODE_ENV=test, returns a canned response instead of
// hitting the network, same reasoning as src/lib/mailer.js: tests and CI
// never need a real key or network access.
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

let lastTestRequest = null;

async function chatCompletion(messages) {
  if (process.env.NODE_ENV === 'test') {
    lastTestRequest = messages;
    return { role: 'assistant', content: 'This is a test response from the fake Groq client.' };
  }

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      messages,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Groq API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.choices[0].message;
}

function getLastTestRequest() {
  return lastTestRequest;
}

module.exports = { chatCompletion, getLastTestRequest };
