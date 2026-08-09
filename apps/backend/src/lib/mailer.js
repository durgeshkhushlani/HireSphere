// Brevo (formerly Sendinblue) transactional email API — plain HTTPS (port
// 443), not SMTP. Switched from Gmail SMTP because Render's free tier
// blocks outbound traffic to SMTP ports (25/465/587) entirely: every
// email-sending feature (OTP signup, notifications, bug reports, adoption
// requests, resume delivery, company-portal credentials) silently hung
// until the SMTP connection timed out — discovered in production, not in
// testing, since local dev and CI never went through Render's network.
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

let lastTestMessage = null;

function toRecipientList(value) {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  return list.map((email) => ({ email }));
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Every caller in this codebase authors plain text — Brevo's API rejects a
// request with no htmlContent at all, so this generates a minimal HTML
// version instead of touching every caller. Escaped since some of this text
// includes public, unauthenticated user input (e.g. adoption-requests.service.js's
// name/message fields).
function textToHtml(text) {
  return `<div style="white-space: pre-wrap; font-family: sans-serif;">${escapeHtml(text)}</div>`;
}

// `bcc` is for sending one message to several recipients without exposing
// their addresses to each other (used by notifications.service.js's
// distribution lists) — `to` stays optional in that case, but Brevo's API
// requires a non-empty `to` regardless, so a bcc-only send falls back to
// the sender's own address as the nominal "to".
async function sendMail({ to, bcc, subject, text }) {
  const fromEmail = process.env.BREVO_FROM_EMAIL || process.env.SMTP_FROM;

  if (process.env.NODE_ENV === 'test') {
    lastTestMessage = {
      from: fromEmail,
      to: toRecipientList(to).map((r) => ({ address: r.email })),
      bcc: toRecipientList(bcc).map((r) => ({ address: r.email })),
      subject,
      text,
    };
    return { messageId: 'test-message-id' };
  }

  if (!process.env.BREVO_API_KEY) {
    throw new Error('Email sending is not configured (BREVO_API_KEY missing)');
  }

  const toList = toRecipientList(to);
  const bccList = toRecipientList(bcc);
  if (toList.length === 0 && bccList.length === 0) {
    throw new Error('sendMail requires at least one of to/bcc');
  }

  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'HireSphere', email: fromEmail },
      to: toList.length > 0 ? toList : [{ email: fromEmail }],
      ...(bccList.length > 0 && { bcc: bccList }),
      subject,
      textContent: text,
      htmlContent: textToHtml(text),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Brevo API error ${res.status}: ${body}`);
  }

  return res.json();
}

function getLastTestMessage() {
  return lastTestMessage;
}

// Test-only — lets a test assert "nothing was sent" instead of only being
// able to inspect the last message an earlier test happened to leave behind.
function _resetLastTestMessage() {
  lastTestMessage = null;
}

module.exports = { sendMail, getLastTestMessage, _resetLastTestMessage };
