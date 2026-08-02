require('./env');
const prisma = require('../../src/lib/prisma');

// Children before parents so foreign keys never block the truncate.
const TABLES = [
  'email_otps',
  'placements',
  'applications',
  'application_forms',
  'drive_eligible_programs',
  'drives',
  'student_profiles',
  'users',
  'university_programs',
  'programs',
  'companies',
  'universities',
];

async function resetDb() {
  const list = TABLES.map((t) => `"${t}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

function disconnect() {
  return prisma.$disconnect();
}

module.exports = { resetDb, disconnect, prisma };
