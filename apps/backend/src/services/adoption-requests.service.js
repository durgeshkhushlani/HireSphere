const ApiError = require('../lib/ApiError');
const mailer = require('../lib/mailer');

const REQUEST_RECIPIENT = 'durgeshkhushlani@gmail.com';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public (no auth) — this is a pre-registration interest form for a
// university that doesn't have a HireSphere account yet, not the actual
// self-serve /register-university flow. Every submission just emails the
// platform owner directly (same pattern as bug-reports.service.js) rather
// than creating any account or DB row — there's no admin dashboard to view
// these yet, and a personal follow-up is the whole point given the current
// free-tier hosting may not fit every university's size.
async function submitRequest({ name, email, universityName, message }) {
  if (!name || !name.trim()) {
    throw ApiError.badRequest('name is required');
  }
  if (!email || !EMAIL_PATTERN.test(email)) {
    throw ApiError.badRequest('A valid email is required');
  }
  if (!universityName || !universityName.trim()) {
    throw ApiError.badRequest('universityName is required');
  }

  const lines = [
    `Name: ${name.trim()}`,
    `Email: ${email}`,
    `University: ${universityName.trim()}`,
    '',
    'More info:',
    message && message.trim() ? message.trim() : '(not provided)',
  ];

  try {
    await mailer.sendMail({
      to: REQUEST_RECIPIENT,
      subject: `[HireSphere] Adoption request from ${universityName.trim()}`,
      text: lines.join('\n'),
    });
  } catch (err) {
    throw ApiError.badGateway(`Could not send your request: ${err.message}`);
  }

  return { message: 'Request sent' };
}

module.exports = { submitRequest };
