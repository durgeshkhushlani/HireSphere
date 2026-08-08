const ApiError = require('../lib/ApiError');
const mailer = require('../lib/mailer');

const REPORT_RECIPIENT = 'durgeshkhushlani@gmail.com';

const CATEGORY_LABELS = {
  ADMIN_VIEW: 'Admin view',
  STUDENT_VIEW: 'Student view',
  HOME_PAGE: 'Home page',
  AUTH_FLOW: 'Signup or login flow',
  OTHER: 'Other',
};
const CATEGORIES = Object.keys(CATEGORY_LABELS);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public (no auth) so a logged-out visitor on the landing/auth pages can
// still report a bug — email is required specifically so the report isn't
// fully anonymous, which is the main deterrent against abuse here (paired
// with IP rate-limiting in the controller).
async function submitReport({ name, email, description, category }) {
  if (!email || !EMAIL_PATTERN.test(email)) {
    throw ApiError.badRequest('A valid email is required');
  }
  if (!description || !description.trim()) {
    throw ApiError.badRequest('description is required');
  }
  if (!CATEGORIES.includes(category)) {
    throw ApiError.badRequest(`category must be one of: ${CATEGORIES.join(', ')}`);
  }

  const lines = [
    `Category: ${CATEGORY_LABELS[category]}`,
    `Reporter name: ${name && name.trim() ? name.trim() : '(not provided)'}`,
    `Reporter email: ${email}`,
    '',
    'Description:',
    description.trim(),
  ];

  try {
    await mailer.sendMail({
      to: REPORT_RECIPIENT,
      subject: `[HireSphere bug report] ${CATEGORY_LABELS[category]}`,
      text: lines.join('\n'),
    });
  } catch (err) {
    throw ApiError.badGateway(`Could not send the bug report: ${err.message}`);
  }

  return { message: 'Bug report sent' };
}

module.exports = { submitReport, CATEGORIES, CATEGORY_LABELS };
