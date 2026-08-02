// Must be required before anything that touches src/ — src/lib/prisma.js reads
// DATABASE_URL at require time.
//
// Deliberately does NOT fall back to an existing DATABASE_URL: if the dev URL
// were already exported in the shell, the suite would truncate the dev database.
const DEFAULT_TEST_URL =
  'postgresql://hiresphere_user:hiresphere_pass@localhost:5433/hiresphere_test';

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || DEFAULT_TEST_URL;
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
// Switches src/lib/mailer.js to a fake transport that never sends real email.
process.env.NODE_ENV = 'test';

if (!/test/i.test(process.env.DATABASE_URL)) {
  throw new Error(
    `Refusing to run tests: DATABASE_URL is not a test database (${process.env.DATABASE_URL}). ` +
      'The suite truncates every table, so this guard prevents wiping real data.'
  );
}
