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

async function sendMail({ to, subject, text }) {
  const info = await transport.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
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

module.exports = { sendMail, getLastTestMessage };
