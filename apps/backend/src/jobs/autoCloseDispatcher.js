// Same in-process poller pattern as resumeDispatcher.js — started only from
// server.js, never from app.js (so it never runs during the test suite).
const prisma = require('../lib/prisma');

const POLL_INTERVAL_MS = 60 * 1000;

async function autoCloseDueDrives() {
  const due = await prisma.drive.findMany({
    where: { status: 'OPEN', autoCloseAt: { lte: new Date() } },
    select: { id: true },
  });

  for (const drive of due) {
    // Atomic claim, same guard as resumeDispatcher.js's send-claim — only
    // one poll tick actually flips a given drive even if two ticks overlap.
    await prisma.drive.updateMany({
      where: { id: drive.id, status: 'OPEN' },
      data: { status: 'CLOSED' },
    });
  }
}

function startAutoCloseDispatcher() {
  return setInterval(() => {
    autoCloseDueDrives().catch((err) => console.error('Auto-close dispatcher tick failed:', err));
  }, POLL_INTERVAL_MS);
}

module.exports = { autoCloseDueDrives, startAutoCloseDispatcher };
