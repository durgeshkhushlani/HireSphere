const nodemailer = require('nodemailer');

// Under test, swap the real Gmail transport for one that never touches the
// network — captures the message locally so tests can read the OTP code out
// of it, the same way a real test would read a test inbox.
let lastTestMessage = null;

function buildTransport() {
  if (process.env.NODE_ENV === 'test') {
    return nodemailer.createTransport({ jsonTransport: true });
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

const transport = buildTransport();

// `bcc` is for sending one message to several recipients without exposing
// their addresses to each other (used by notifications.service.js's
// distribution lists) — `to` stays optional in that case since nodemailer
// only requires at least one of to/cc/bcc to be set.
async function sendMail({ to, bcc, subject, text }) {
  // Fail fast with a normal, catchable rejection instead of letting
  // nodemailer attempt the Gmail connection: an auth failure there surfaces
  // as an unhandled error event on the underlying SMTP socket rather than a
  // clean promise rejection, so it bypasses a caller's try/catch entirely.
  if (process.env.NODE_ENV !== 'test' && (!process.env.SMTP_USER || !process.env.SMTP_PASS)) {
    throw new Error('Email sending is not configured (SMTP_USER/SMTP_PASS missing)');
  }

  const info = await transport.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    bcc,
    subject,
    text,
  });
  if (process.env.NODE_ENV === 'test') {
    lastTestMessage = JSON.parse(info.message.toString());
  }
  return info;
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
