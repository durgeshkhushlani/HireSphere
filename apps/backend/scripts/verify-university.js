// Manual v1 verification step (plan §3): after actually confirming a
// university owns its claimed domain (video call, for now), flip its
// `verified` flag so registration against it is allowed.
//
// Usage: npx tsx scripts/verify-university.js <domain-or-id>
require('dotenv').config();
const prisma = require('../src/lib/prisma');

async function main() {
  const identifier = process.argv[2];
  if (!identifier) {
    console.error('Usage: npx tsx scripts/verify-university.js <domain-or-id>');
    process.exit(1);
  }

  const university = await prisma.university.findFirst({
    where: { OR: [{ id: identifier }, { domain: identifier }] },
  });
  if (!university) {
    console.error(`No university found matching "${identifier}"`);
    process.exit(1);
  }
  const contact = university.contactEmail
    ? `${university.contactName || 'unnamed contact'} <${university.contactEmail}>`
    : 'no contact info on file';

  if (university.verified) {
    console.log(`Already verified: ${university.name} (${university.domain}) — ${contact}`);
    await prisma.$disconnect();
    return;
  }

  const updated = await prisma.university.update({
    where: { id: university.id },
    data: { verified: true },
  });
  console.log(`Verified: ${updated.name} (${updated.domain}) — ${contact}`);
  await prisma.$disconnect();
}

main();
