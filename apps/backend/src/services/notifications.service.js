const prisma = require('../lib/prisma');
const ApiError = require('../lib/ApiError');
const mailer = require('../lib/mailer');

const EVENTS = ['NEW_COMPANY', 'NEW_DRIVE', 'STUDENT_SELECTED'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function listRecipients(universityId) {
  return prisma.notificationRecipient.findMany({
    where: { universityId },
    orderBy: [{ event: 'asc' }, { email: 'asc' }],
  });
}

async function addRecipient(universityId, { event, email }) {
  if (!EVENTS.includes(event)) {
    throw ApiError.badRequest(`event must be one of: ${EVENTS.join(', ')}`);
  }
  const normalizedEmail = email ? email.trim().toLowerCase() : '';
  if (!normalizedEmail || !EMAIL_PATTERN.test(normalizedEmail)) {
    throw ApiError.badRequest('A valid email is required');
  }

  try {
    return await prisma.notificationRecipient.create({
      data: { universityId, event, email: normalizedEmail },
    });
  } catch (err) {
    if (err.code === 'P2002') {
      throw ApiError.conflict('That email is already subscribed to this event');
    }
    throw err;
  }
}

async function removeRecipient(id, universityId) {
  const recipient = await prisma.notificationRecipient.findFirst({ where: { id, universityId } });
  if (!recipient) throw ApiError.notFound('Recipient not found');
  await prisma.notificationRecipient.delete({ where: { id } });
}

// Every call site wraps this in try/catch (or awaits it fire-and-forget) —
// a mail outage should never block the primary action (creating a company/
// drive, selecting a student). Recipients are bcc'd so they don't see each
// other's addresses.
async function notify(universityId, event, { subject, text }) {
  const recipients = await listRecipients(universityId);
  const emails = recipients.filter((r) => r.event === event).map((r) => r.email);
  if (emails.length === 0) return;
  await mailer.sendMail({ bcc: emails, subject, text });
}

module.exports = { EVENTS, listRecipients, addRecipient, removeRecipient, notify };
