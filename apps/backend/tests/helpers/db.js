require('./env');
const prisma = require('../../src/lib/prisma');

// Children before parents so foreign keys never block the truncate.
const TABLES = [
  'email_otps',
  'application_role_preferences',
  'placements',
  'applications',
  'application_forms',
  'drive_eligible_programs',
  'drive_company_access',
  'drive_roles',
  'drives',
  'student_custom_field_values',
  'student_custom_field_definitions',
  'student_profiles',
  'users',
  'university_programs',
  'programs',
  'companies',
  'notification_recipients',
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
