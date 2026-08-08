const statsService = require('./stats.service');
const applicationsService = require('./applications.service');
const drivesService = require('./drives.service');
const studentsService = require('./students.service');

// Groq (OpenAI-compatible) tool schemas. The model can only ever pick one of
// these fixed, pre-built functions — it never sees or writes SQL. Every
// executor scopes itself with callerContext (from the JWT), never from
// model-supplied args. Role gating happens TWICE, deliberately: once by
// which tools are even offered (getToolsForRole), and again inside
// executeTool itself — so a student can never reach an admin-only tool even
// if a bug or a manipulated pageContext somehow got it into the tool list.

const SHARED_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_placement_stats',
      description:
        "Get real, current placement statistics for the caller's own university: " +
        'total students, how many are placed, placement rate (%), average package, ' +
        'and number of distinct companies that have hired so far.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'count_companies_above_ctc',
      description:
        "Count distinct companies at the caller's own university whose drives offer at or " +
        'above a given pay threshold — e.g. "companies paying above 10 LPA". Includes drives ' +
        'of any status (Draft/Open/Closed), since all drives are visible to both roles.',
      parameters: {
        type: 'object',
        properties: {
          minLpa: {
            type: 'number',
            description:
              'Threshold in LPA (lakhs per annum, i.e. units of ₹1,00,000) — pass 10 for ' +
              '"10 LPA", never the raw rupee amount.',
          },
          offerType: {
            type: 'string',
            enum: ['JOB', 'INTERNSHIP'],
            description: 'Defaults to JOB (checks CTC). Use INTERNSHIP to check monthly stipend instead.',
          },
        },
        required: ['minLpa'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'count_drives_by_status',
      description:
        "Count drives at the caller's own university with a given status " +
        '(DRAFT, OPEN = accepting applications, CLOSED = no longer accepting).',
      parameters: {
        type: 'object',
        properties: { status: { type: 'string', enum: ['DRAFT', 'OPEN', 'CLOSED'] } },
        required: ['status'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_drives',
      description:
        "Look up drives at the caller's own university — use for \"is <company> listed?\", " +
        '"what is <company> hiring for?", or when page context gives a specific driveId. Returns ' +
        "each drive's company, title, status, description, and roles (title, offer type, CTC/stipend). " +
        'Includes drives of every status, not just Open — mention the status in your answer.',
      parameters: {
        type: 'object',
        properties: {
          companyQuery: { type: 'string', description: 'Company name or partial name, e.g. "OpsHub".' },
          driveId: { type: 'string', description: 'Exact drive id, e.g. from current page context.' },
        },
        required: [],
      },
    },
  },
];

const STUDENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_my_profile',
      description:
        "Get the calling student's own profile: program, CGPA, backlog count, and whether they're " +
        'already placement-locked (selected somewhere). Use before answering eligibility questions.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_applications',
      description:
        "Get the calling student's own applications — drive/company, status, and each ranked " +
        'preferred role with its real job description, offer type and pay. Use this before giving ' +
        "interview prep or role-specific advice, so it is grounded in the student's actual applications.",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
];

const ADMIN_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'find_applicants',
      description:
        'ADMIN ONLY. Look up applicants at your own university by student name/email, an exact ' +
        'applicationId (e.g. from current page context), and/or which drive/company they applied to. ' +
        'Provide at least one filter. Returns each match\'s name, email, program, CGPA, backlog count, ' +
        'drive/company, status, interview slot/venue, ranked role preferences, and selected role.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Student name or email (partial match).' },
          applicationId: { type: 'string', description: 'Exact application id.' },
          driveQuery: { type: 'string', description: 'Drive title or company name (partial match).' },
        },
        required: [],
      },
    },
  },
];

function getToolsForRole(role) {
  if (role === 'STUDENT') return [...SHARED_TOOLS, ...STUDENT_TOOLS];
  if (role === 'ADMIN') return [...SHARED_TOOLS, ...ADMIN_TOOLS];
  return SHARED_TOOLS;
}

async function executeTool(name, args, callerContext) {
  switch (name) {
    case 'get_placement_stats':
      return statsService.getPlacementStats(callerContext.universityId);

    case 'count_companies_above_ctc':
      if (typeof args.minLpa !== 'number') {
        return { error: 'minLpa (a number) is required' };
      }
      return statsService.countCompaniesAboveCtc(
        callerContext.universityId,
        args.minLpa,
        args.offerType === 'INTERNSHIP' ? 'INTERNSHIP' : 'JOB'
      );

    case 'count_drives_by_status': {
      const count = await statsService.countDrivesByStatus(callerContext.universityId, args.status);
      return { status: args.status, count };
    }

    case 'search_drives': {
      const drives = await drivesService.searchDrives(callerContext.universityId, {
        companyQuery: args.companyQuery,
        driveId: args.driveId,
      });
      return drives.map((d) => ({
        driveId: d.id,
        company: d.company.name,
        driveTitle: d.title,
        status: d.status,
        description: d.description,
        roles: d.roles.map((r) => ({
          title: r.title,
          offerType: r.offerType,
          ctcAmount: r.ctcAmount,
          stipendAmount: r.stipendAmount,
        })),
      }));
    }

    // Student-only — independently re-checked here, not just by tool-list filtering.
    case 'get_my_profile': {
      if (callerContext.role !== 'STUDENT') return { error: 'Only available to students' };
      const profile = await studentsService.getProfile(callerContext.userId);
      return {
        name: profile.user.name,
        email: profile.user.email,
        university: profile.user.university.name,
        program: profile.program.name,
        cgpa: profile.cgpa,
        backlogCount: profile.backlogCount,
        placementLocked: profile.placementLocked,
      };
    }

    case 'get_my_applications': {
      if (callerContext.role !== 'STUDENT') return { error: 'Only available to students' };
      const applications = await applicationsService.listForStudent(callerContext.userId);
      return applications.map((a) => ({
        driveTitle: a.drive.title,
        company: a.drive.company.name,
        status: a.status,
        rolePreferences: a.rolePreferences.map((p) => ({
          rank: p.rank,
          title: p.driveRole.title,
          offerType: p.driveRole.offerType,
          description: p.driveRole.description,
          ctcAmount: p.driveRole.ctcAmount,
          stipendAmount: p.driveRole.stipendAmount,
        })),
        selectedRole: a.selectedRole ? { title: a.selectedRole.title, description: a.selectedRole.description } : null,
      }));
    }

    // Admin-only — independently re-checked here, not just by tool-list filtering.
    // This is the one tool surface that exposes other people's data, so the
    // role check happens before any DB call, not after.
    case 'find_applicants': {
      if (callerContext.role !== 'ADMIN') return { error: 'Only available to admins' };
      const applications = await applicationsService.searchForUniversity(callerContext.universityId, {
        query: args.query,
        applicationId: args.applicationId,
        driveQuery: args.driveQuery,
      });
      return applications.map((a) => ({
        applicationId: a.id,
        name: a.studentProfile.user.name,
        email: a.studentProfile.user.email,
        program: a.studentProfile.program.name,
        cgpa: a.studentProfile.cgpa,
        backlogCount: a.studentProfile.backlogCount,
        driveTitle: a.drive.title,
        company: a.drive.company.name,
        status: a.status,
        interviewSlot: a.interviewSlot,
        interviewVenue: a.interviewVenue,
        rolePreferences: a.rolePreferences.map((p) => ({ rank: p.rank, title: p.driveRole.title })),
        selectedRole: a.selectedRole ? a.selectedRole.title : null,
      }));
    }

    default:
      return { error: 'Unknown tool' };
  }
}

module.exports = { getToolsForRole, executeTool };
