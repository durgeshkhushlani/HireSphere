// Plan §4: resumes are dispatched at a scheduled datetime, not immediately.
// No queue/worker infra exists yet — this is an in-process poller, started
// only from server.js (never from app.js, which is what tests exercise), so
// it never runs during the test suite.
const prisma = require('../lib/prisma');
const mailer = require('../lib/mailer');

const POLL_INTERVAL_MS = 60 * 1000;

async function dispatchDueResumes() {
  const due = await prisma.application.findMany({
    where: { resumeSentAt: null, resumeDispatchAt: { lte: new Date() } },
    include: {
      drive: { include: { company: true } },
      studentProfile: { include: { user: true } },
    },
  });

  for (const application of due) {
    // Atomic claim: an UPDATE with this WHERE guard only succeeds for one
    // poll tick even if a previous tick's send is still in flight — the
    // "no duplicate sends" half of the plan's "safety buffer" requirement.
    const claimed = await prisma.application.updateMany({
      where: { id: application.id, resumeSentAt: null },
      data: { resumeSentAt: new Date() },
    });
    if (claimed.count === 0) continue;

    try {
      await mailer.sendMail({
        to: application.drive.company.contactEmail,
        subject: `Resume — ${application.studentProfile.user.name} (${application.drive.title})`,
        text: `Resume for ${application.studentProfile.user.name}: ${application.resumeUrl}`,
      });
    } catch (err) {
      // Left marked as sent rather than rolled back — retrying automatically
      // risks emailing the company twice if the first attempt actually went
      // through but the response was lost. A real failure here needs a human
      // to notice (server logs) and manually re-schedule; not building
      // automated retry/backoff for v1 (see PROGRESS.md).
      console.error(`Resume delivery failed for application ${application.id}:`, err);
    }
  }
}

function startResumeDispatcher() {
  return setInterval(() => {
    dispatchDueResumes().catch((err) => console.error('Resume dispatcher tick failed:', err));
  }, POLL_INTERVAL_MS);
}

module.exports = { dispatchDueResumes, startResumeDispatcher };
