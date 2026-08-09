const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { signToken } = require('../lib/jwt');

const SALT_ROUNDS = 10;
const DEMO_LIFETIME_MS = 4 * 60 * 60 * 1000;
const DEMO_TOKEN_EXPIRES_IN = '4h';

// Company/Program are global catalogs, not scoped to any one university —
// the same convention real universities already share them under. Demo
// drives reuse a small fixed set of these instead of creating (and having
// to track/clean up) their own, so cleanup only ever has to touch rows that
// actually belong to the demo university.
const DEMO_COMPANIES = [
  { name: 'NovaTech Solutions', industry: 'Software' },
  { name: 'BrightPath Analytics', industry: 'Data & Analytics' },
  { name: 'CloudSphere Systems', industry: 'Cloud Infrastructure' },
];

const DEMO_PROGRAMS = ['B.Tech Computer Science', 'B.Tech Electronics & Communication'];

async function ensureTemplateCatalog() {
  const companies = [];
  for (const c of DEMO_COMPANIES) {
    let company = await prisma.company.findFirst({ where: { name: c.name } });
    if (!company) company = await prisma.company.create({ data: c });
    companies.push(company);
  }

  const programs = [];
  for (const name of DEMO_PROGRAMS) {
    let program = await prisma.program.findUnique({ where: { name } });
    if (!program) program = await prisma.program.create({ data: { name } });
    programs.push(program);
  }

  return { companies, programs };
}

// Deletes every demo university whose demoExpiresAt has passed, along with
// everything scoped to it — in explicit FK-safe (children-before-parents)
// order rather than relying on schema-level cascade deletes, so this is the
// only place that can ever remove a university's data in bulk. Companies and
// Programs are never touched here since demo sessions only ever reuse the
// shared catalog rows, never create their own.
async function cleanupExpired() {
  const expired = await prisma.university.findMany({
    where: { isDemo: true, demoExpiresAt: { lt: new Date() } },
    select: { id: true },
  });

  for (const { id: universityId } of expired) {
    await prisma.$transaction(async (tx) => {
      const studentProfileIds = (
        await tx.studentProfile.findMany({
          where: { user: { universityId } },
          select: { userId: true },
        })
      ).map((p) => p.userId);
      const driveIds = (
        await tx.drive.findMany({ where: { universityId }, select: { id: true } })
      ).map((d) => d.id);
      const driveRoleIds = (
        await tx.driveRole.findMany({ where: { driveId: { in: driveIds } }, select: { id: true } })
      ).map((r) => r.id);
      const applicationIds = (
        await tx.application.findMany({ where: { driveId: { in: driveIds } }, select: { id: true } })
      ).map((a) => a.id);

      await tx.studentCustomFieldValue.deleteMany({
        where: { studentProfileId: { in: studentProfileIds } },
      });
      await tx.applicationRolePreference.deleteMany({
        where: { applicationId: { in: applicationIds } },
      });
      await tx.application.deleteMany({ where: { id: { in: applicationIds } } });
      await tx.placement.deleteMany({ where: { universityId } });
      await tx.applicationForm.deleteMany({ where: { driveId: { in: driveIds } } });
      await tx.driveEligibleProgram.deleteMany({ where: { driveId: { in: driveIds } } });
      await tx.driveRole.deleteMany({ where: { id: { in: driveRoleIds } } });
      await tx.drive.deleteMany({ where: { universityId } });
      await tx.studentCustomFieldDefinition.deleteMany({ where: { universityId } });
      await tx.studentProfile.deleteMany({ where: { userId: { in: studentProfileIds } } });
      await tx.universityProgram.deleteMany({ where: { universityId } });
      await tx.user.deleteMany({ where: { universityId } });
      await tx.university.delete({ where: { id: universityId } });
    });
  }

  return expired.length;
}

function toPublicUser(user) {
  const { passwordHash, ...publicUser } = user;
  return publicUser;
}

function demoAuthPayload(user) {
  return {
    token: signToken(
      { sub: user.id, role: user.role, universityId: user.universityId },
      { expiresIn: DEMO_TOKEN_EXPIRES_IN }
    ),
    user: toPublicUser(user),
  };
}

const daysFromNow = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

async function startDemo() {
  await cleanupExpired();

  const { companies, programs } = await ensureTemplateCatalog();
  const [novaTech, brightPath, cloudSphere] = companies;
  const [csProgram, eceProgram] = programs;

  // 8 bytes (64 bits) keeps collisions on the globally-unique User.email/
  // University.domain columns astronomically unlikely even at high volume.
  const slug = crypto.randomBytes(8).toString('hex');
  const expiresAt = new Date(Date.now() + DEMO_LIFETIME_MS);
  const passwordHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), SALT_ROUNDS);

  const result = await prisma.$transaction(async (tx) => {
    const university = await tx.university.create({
      data: {
        name: 'Demo University',
        domain: `demo-${slug}.hiresphere.demo`,
        verified: true,
        contactName: 'Demo Admin',
        contactEmail: `admin@demo-${slug}.hiresphere.demo`,
        isDemo: true,
        demoExpiresAt: expiresAt,
      },
    });

    const [csLink, eceLink] = await Promise.all([
      tx.universityProgram.create({
        data: { universityId: university.id, programId: csProgram.id },
      }),
      tx.universityProgram.create({
        data: { universityId: university.id, programId: eceProgram.id },
      }),
    ]);

    const admin = await tx.user.create({
      data: {
        universityId: university.id,
        role: 'ADMIN',
        email: `admin@demo-${slug}.hiresphere.demo`,
        passwordHash,
        name: 'Priya Sharma',
      },
    });

    // Every verified student has a fully filled-out profile — an admin
    // browsing the Students tab in the demo shouldn't see a wall of blanks,
    // since that's not representative of what a real, in-use HireSphere
    // looks like. Rohan is the deliberate exception: he's unverified, and an
    // empty profile is exactly what "hasn't finished filling this in yet"
    // should look like, so his fields are left blank on purpose.
    const studentSeeds = [
      {
        name: 'Aarav Mehta',
        cgpa: '8.70',
        backlogCount: 0,
        verified: true,
        tenthPercentage: '92.40',
        twelfthPercentage: '89.20',
        bloodGroup: 'O+',
        address: 'Sector 15, Rohini, New Delhi',
        phone: '9876500001',
      },
      {
        name: 'Diya Kapoor',
        cgpa: '7.90',
        backlogCount: 0,
        verified: true,
        tenthPercentage: '90.10',
        twelfthPercentage: '87.60',
        bloodGroup: 'A+',
        address: 'Koramangala, Bengaluru',
        phone: '9876500002',
      },
      { name: 'Rohan Iyer', cgpa: '6.80', backlogCount: 1, verified: false },
      {
        name: 'Sneha Reddy',
        cgpa: '9.10',
        backlogCount: 0,
        verified: true,
        tenthPercentage: '95.30',
        twelfthPercentage: '91.80',
        bloodGroup: 'B+',
        address: 'Banjara Hills, Hyderabad',
        phone: '9876500004',
      },
      // Handed to the visitor as the "Continue as Student" login — unlike
      // the four above, this one is unlocked and has no applications yet,
      // so the demo can actually be used to try the apply flow, not just
      // view a pre-filled history.
      {
        name: 'Kabir Nair',
        cgpa: '8.20',
        backlogCount: 0,
        verified: true,
        tenthPercentage: '88.70',
        twelfthPercentage: '85.40',
        bloodGroup: 'AB+',
        address: 'Panampilly Nagar, Kochi',
        phone: '9876500005',
      },
    ];
    const students = [];
    for (const [i, s] of studentSeeds.entries()) {
      const user = await tx.user.create({
        data: {
          universityId: university.id,
          role: 'STUDENT',
          email: `student${i + 1}@demo-${slug}.hiresphere.demo`,
          passwordHash,
          name: s.name,
        },
      });
      const profile = await tx.studentProfile.create({
        data: {
          userId: user.id,
          programId: csProgram.id,
          cgpa: s.cgpa,
          backlogCount: s.backlogCount,
          verified: s.verified,
          studentId: `DEMO${String(i + 1).padStart(3, '0')}`,
          ...(s.tenthPercentage && {
            tenthPercentage: s.tenthPercentage,
            twelfthPercentage: s.twelfthPercentage,
            bloodGroup: s.bloodGroup,
            address: s.address,
            phone: s.phone,
          }),
          // Applying to a drive now requires a resume on file — without
          // this, the demo student handed to a "Continue as Student"
          // visitor couldn't actually use the apply flow.
          resumeUrl: 'https://example.com/demo-resume.pdf',
        },
      });
      students.push({ user, profile });
    }
    const [aarav, diya, rohan, sneha, kabir] = students;

    const sdeDrive = await tx.drive.create({
      data: {
        universityId: university.id,
        companyId: novaTech.id,
        title: 'NovaTech Solutions — SDE Hiring 2026',
        description: 'Full-time Software Development Engineer hiring drive.',
        status: 'OPEN',
        minCgpa: '7.00',
      },
    });
    const sdeRole = await tx.driveRole.create({
      data: {
        driveId: sdeDrive.id,
        title: 'Software Development Engineer',
        offerType: 'JOB',
        description: 'Build and ship product features across the stack.',
        ctcAmount: '1200000',
      },
    });
    await tx.applicationForm.create({
      data: {
        driveId: sdeDrive.id,
        questions: [
          { id: 'q1', label: 'Why do you want to join us?' },
          { id: 'q2', label: 'Any relevant projects?' },
        ],
      },
    });
    await tx.driveEligibleProgram.createMany({
      data: [
        { driveId: sdeDrive.id, universityProgramId: csLink.id },
        { driveId: sdeDrive.id, universityProgramId: eceLink.id },
      ],
    });

    const dataInternDrive = await tx.drive.create({
      data: {
        universityId: university.id,
        companyId: brightPath.id,
        title: 'BrightPath Analytics — Data Intern',
        description: 'Summer data analytics internship.',
        status: 'OPEN',
      },
    });
    const dataInternRole = await tx.driveRole.create({
      data: {
        driveId: dataInternDrive.id,
        title: 'Data Analyst Intern',
        offerType: 'INTERNSHIP',
        description: 'Work with the analytics team on real dashboards.',
        stipendAmount: '25000',
      },
    });
    await tx.applicationForm.create({
      data: {
        driveId: dataInternDrive.id,
        questions: [{ id: 'q1', label: 'What interests you about analytics?' }],
      },
    });

    await tx.drive.create({
      data: {
        universityId: university.id,
        companyId: cloudSphere.id,
        title: 'CloudSphere Systems — Full Stack Hiring',
        description: 'Backend and frontend engineering roles — details still being finalized.',
        status: 'DRAFT',
      },
    });

    await tx.drive.create({
      data: {
        universityId: university.id,
        companyId: novaTech.id,
        title: 'NovaTech Solutions — Winter Internship',
        description: 'Winter internship cohort — applications closed.',
        status: 'CLOSED',
      },
    });

    async function createApplication(student, drive, role, status, extra = {}) {
      return tx.application.create({
        data: {
          driveId: drive.id,
          studentProfileId: student.profile.userId,
          responses: extra.responses ?? { q1: 'Sample answer for the demo.' },
          resumeUrl: 'https://example.com/resume.pdf',
          status,
          ...(role && {
            rolePreferences: { create: [{ driveRoleId: role.id, rank: 1 }] },
          }),
          ...extra.fields,
        },
      });
    }

    await createApplication(aarav, sdeDrive, sdeRole, 'SELECTED', {
      fields: { selectedRoleId: sdeRole.id },
      responses: {
        q1: "I'd love to build products used by thousands of people.",
        q2: 'Built a full-stack expense tracker with React and Node.',
      },
    });
    await tx.placement.create({
      data: {
        universityId: university.id,
        userId: aarav.user.id,
        companyId: novaTech.id,
        driveId: sdeDrive.id,
        driveRoleId: sdeRole.id,
        packageAmount: '1200000',
      },
    });
    await tx.studentProfile.update({
      where: { userId: aarav.user.id },
      data: { placementLocked: true },
    });

    await createApplication(diya, sdeDrive, sdeRole, 'SHORTLISTED', {
      responses: { q1: 'Excited about the engineering culture here.', q2: 'Contributed to two open-source libraries.' },
    });

    await createApplication(rohan, sdeDrive, sdeRole, 'OA_TEST', {
      fields: {
        interviewSlot: daysFromNow(2),
        interviewVenue: 'Online — link shared via email',
      },
      responses: { q1: 'Looking to grow as a backend engineer.', q2: 'Built a URL shortener with Redis caching.' },
    });

    await createApplication(sneha, sdeDrive, sdeRole, 'NOT_SELECTED', {
      responses: { q1: 'Interested in systems-level work.', q2: 'Worked on a distributed task queue.' },
    });
    await createApplication(sneha, dataInternDrive, dataInternRole, 'APPLIED', {
      responses: { q1: 'I enjoy turning raw data into decisions.' },
    });

    return { admin, students: { aarav, diya, rohan, sneha, kabir }, expiresAt };
  });

  return {
    admin: demoAuthPayload(result.admin),
    student: demoAuthPayload(result.students.kabir.user),
    expiresAt: result.expiresAt,
  };
}

module.exports = { startDemo, cleanupExpired, ensureTemplateCatalog };
