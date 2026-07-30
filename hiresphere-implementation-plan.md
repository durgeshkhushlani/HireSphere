# HireSphere — Implementation Plan (v2 Redesign)

*Redesign of the original MERN-stack college project into a production-grade, cleaner-architected campus placement management platform.*

---

## 1. Purpose & Context

HireSphere is a university campus placement/recruitment management platform. The original version was built as a college project on the MERN stack. This redesign aims for:
- Cleaner architecture
- Better, more deliberate tech stack choices
- Production-grade quality (Docker, CI/CD, proper schema design)

**Key differentiator**: Custom-per-drive dynamic application forms — configurable per company/drive, stored flexibly via JSONB, without sacrificing relational integrity. Existing open-source alternatives in this space are all student-project tier; this is a genuine gap to fill.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js |
| Web framework | Express |
| ORM | Prisma |
| Database | PostgreSQL |
| Email | Nodemailer |
| Auth | JWT (role-based: Admin / Student) |
| Containerization | Docker + Docker Compose |
| CI/CD | GitHub Actions |
| Version control | Git + GitHub |
| Frontend | Deferred — Next.js planned for a later phase (post-placement-season) |
| Deployment target | Cloud Postgres (Railway/Supabase/Neon) + hosting platform (Railway/Render) |

---

## 3. Architecture Decisions

- **Monolith** — explicitly chosen over microservices. Microservices complexity is unnecessary for v1 scope; a well-structured monolith (thin controllers, logic in services, Prisma isolated) is both faster to build and easier to migrate later (e.g. to Nest.js, if ever desired, post-placement-season).
- **Multi-tenancy**: University-scoped tenants.
  - Students auto-join via domain-based email OTP (e.g. `@university.edu` verified via OTP).
  - University onboarding: DNS TXT record verification long-term; manual video-call verification for v1.
- **Account model**: Only **Admin** and **Student** roles in v1.
  - Companies are treated as **data**, not login accounts.
  - Faculty role deferred to a later version.

---

## 4. Placement Flow Logic

- **Eligibility checks**: Automatic, checked against structured student profile fields (e.g. CGPA, branch, backlog status) defined per drive.
- **Resume delivery**: Sent via Nodemailer, dispatched at a scheduled datetime with a safety buffer built in (to avoid premature/duplicate sends).
- **Shortlist status updates**: Admin manually marks statuses in v1. CSV bulk update planned for v2.
- **Placement lock**: Once a student is marked "selected" in any drive, they receive a **global placement lock** — preventing further applications platform-wide (standard placement-season rule).
- **Interview stages**: Require slot and venue fields. A **global apply toggle** lets admin apply the same slot/venue setup across all shortlisted candidates at once, or set individually.
- **Drive statuses** (fixed set for v1, no custom pipelines):
  1. Applied
  2. Shortlisted
  3. OA/Test
  4. Interview
  5. Selected
  6. Not Selected

  Custom per-drive pipelines are deferred to a later version.

---

## 5. Database Schema (Finalized)

### Core tables

**`universities`**
- University-level tenant record (name, domain, verification status, etc.)

**`programs`** (global catalog)
- Master list of academic programs (e.g. "B.Tech Computer Science") — shared across all universities, not duplicated per-tenant.

**`university_programs`**
- Join table linking a university to the programs it actually offers (many-to-many between `universities` and `programs`).

**`users`**
- Shared table for both Admin and Student accounts, differentiated by role.
- Scoped to a `university_id`.

**`placements`**
- Separate table, scoped per university.
- Tracks placement records (which student got placed where, when) — kept separate from `applications` since placement is a distinct downstream event, not just an application state.

**`student_profiles`**
- Structured academic/eligibility fields per student (CGPA, branch, backlog count, etc.) — used for automatic eligibility checks against drives.
- **Note**: `university_id` intentionally **dropped** from this table — derivable via join through `users`.

**`companies`**
- Company records (data only, not accounts) — name, industry, contact info, etc.

**`drives`**
- A specific placement drive/opportunity posted by a company at a university.
- **Note**: Computed counts (e.g. total applicants, total shortlisted) are intentionally **not stored as columns** — derived via `COUNT()` queries at read time to avoid redundancy/staleness.
- Drive `status` field is retained directly on this table (not derived), since it's an actively-set value, not a computed aggregate.

**`drive_eligible_programs`**
- Join table: which programs (from `university_programs`) are eligible to apply to a given drive.

**`application_forms`**
- Defines the custom, per-drive dynamic form.
- Question definitions stored as **JSONB** — this is the core technical differentiator, allowing fully flexible per-drive custom fields without needing a rigid relational schema for every possible question type.

**`applications`**
- A student's application to a specific drive.
- Form responses stored as **JSONB** (matching the structure defined in the corresponding `application_forms` entry).
- Also stores: `resume_url`, `interview_slot`, `interview_venue`.
- **Note**: `university_id` dropped (derivable via `student_profiles` → `users` join). `company_id` dropped (derivable via `drive_id` → `drives` → `companies` join).

### Key normalization principles applied throughout
- **Derivability over redundancy**: any field that can be computed via a join or aggregate query is *not* stored as a column (e.g. `university_id` on `student_profiles`/`applications`, `company_id` on `applications`, applicant counts on `drives`).
- Exception: fields that represent an actively-set state (like `drives.status`) are stored directly, since they're not computed — they're set by user action.

---

## 6. Deferred / Out of Scope for v1

- **Frontend (Next.js/React)** — deferred to a later phase, after placement season.
- **`sectors` and `email_logs` tables** — deferred for review, not yet finalized.
- **CSV-based bulk shortlist update** — planned for v2.
- **Custom drive pipelines** (beyond the fixed 6-status set) — deferred.
- **Faculty role** — deferred.
- A separate Jira-like tool project (microservices, Python/FastAPI) — explicitly out of scope for HireSphere, to be discussed as its own separate project later.

---

## 7. Local Development Setup

- **Postgres**: Runs locally via Docker Compose (`docker-compose.yml`), container name `hiresphere-db`, exposed on `localhost:5432`.
- **Connection string** (local dev):
  ```
  postgresql://hiresphere_user:hiresphere_pass@localhost:5432/hiresphere_dev
  ```
- **Node app**: Runs natively on the host machine (not containerized during dev) for fast iteration; connects to the Dockerized Postgres instance.
- **Claude Code CLI**: Used as the primary build tool — operates directly in the project folder, edits/creates files, run alongside manual review and testing by the developer.

---

## 8. Path to Production (Planned)

1. **Local dev loop**: Claude Code edits → manual test locally → commit.
2. **Git push** → triggers **GitHub Actions CI**:
   - Install dependencies
   - Run Prisma migrations against a test DB
   - Run tests (scoped to critical logic: eligibility checks, placement lock, drive status transitions)
   - Lint checks
3. **CD**: On CI pass, deployment triggers via hosting platform's GitHub integration (Railway/Render).
   - Builds Docker image from project `Dockerfile`.
   - Deploys container, connects to **cloud Postgres** (provisioned separately from local dev DB).
   - Runs Prisma migrations against production DB as part of deploy.
4. **Result**: Publicly accessible URL, live demo-able application.

---

## 9. Tech Stack Decisions — Rationale & Rejected Alternatives

### Backend framework: Express (chosen) vs Fastify vs Nest.js vs Python/FastAPI
- **Express** chosen over **Fastify**: both are viable, but Express is more forgiving for a first backend-heavy project — simpler, more tutorials/community support. Fastify's performance edge isn't relevant at this project's scale (college placement platform, not high-traffic).
- **Nest.js** considered (for resume differentiation, since another resume project is also Node) but **rejected for v1** — Nest's learning curve (decorators, modules, DI) is too costly given the two-week placement-season timeline. Nest is a strong **v2 migration candidate** (see Section 11 — Future / v2).
- **Python (FastAPI) full backend switch** considered and **rejected** — would cost *more* total time than staying with Node/Express, since rusty-but-structurally-familiar Node beats comfortable-syntax-but-structurally-unfamiliar Python-for-web, for this specific build. Only would have made sense for Python-stack-consistency with the separate AI/ML resume project, not for speed.
- **Resume framing decided**: Node.js project (HireSphere) + Python/ML project = a "versatile, full-range" resume story, considered stronger for general placement season (mixed company stack demands) than an all-Python resume, which only pays off if targeting Python-specific/backend-specific roles.

### Frontend: Next.js (chosen for later) vs React (Vite) vs Vue vs Svelte vs server-rendered
- **Next.js** chosen as the eventual frontend framework — but explicitly **deferred to post-placement-season**, since learning React fundamentals + Next.js conventions + connecting to the API + rendering dynamic JSONB-based forms realistically takes ~9-12 days at 4-6 hrs/day (given existing HTML/CSS/Bootstrap background, no prior React) — doesn't fit inside the current two-week build window alongside backend + AI/ML project.
- **Plain React (Vite)** was the original lower-effort alternative; Next.js was chosen instead specifically for the added resume/production signaling, accepting the deferred timeline.
- **Vue, Svelte** considered and rejected — smaller job-market demand than React for placement season relevance.
- **Server-rendered HTML (EJS/Handlebars) from Express** considered only as a fast placeholder-demo option if a working visual is needed before the real Next.js frontend is built — not a resume-relevant choice, purely a stopgap if needed.

---

## 10. Timeline & Scope Discipline (Placement Season Context)

- Two-week window total, shared across **two resume projects**: HireSphere (this one) and a separate AI/ML project (unscoped as of this document — to be discussed separately).
- Working rhythm: ~4 hours/day building (with Claude Code CLI doing heavy lifting on boilerplate while the developer reviews/understands every piece — review time counts *inside* the 4 hours, not on top of it, since being able to explain the code in interviews is the actual goal, not just having it exist).
- Rough allocation guidance discussed:
  - HireSphere backend (Express + Prisma, no frontend, no Nest): ~15-20 hours for a working, understood MVP.
  - Docker + basic CI/CD: ~2-3 days (~8-10 hours) — kept intentionally minimal (a `Dockerfile` + `docker-compose.yml` + a basic GitHub Actions workflow: install → migrate → test/lint → deploy trigger). No Kubernetes, no multi-stage deploy sophistication — disproportionate for this scope.
  - AI/ML project: allocated the larger remaining share of hours, since it's the bigger unknown (zero prior AI/ML experience).
- **Guiding scope-cut priority if time runs short**: cut automated-deployment sophistication first, then any deferred-list item that creeps back in (Section 6) — never cut understanding of what's already built. Explaining architecture decisions clearly in an interview matters more than deployment polish.
- Nest.js migration and Next.js frontend build are both explicitly positioned as **post-placement-season** work, not to be pulled forward under time pressure.

---

## 11. Future / v2 Roadmap (Explicitly Deferred, Not In Current Build Scope)

This section consolidates everything intentionally pushed past v1 — nothing here should be started until v1 is functional and placement season pressure has eased, unless explicitly re-scoped with permission.

- **Frontend build (Next.js)** — full React fundamentals → Next.js conventions → API integration → dynamic JSONB form rendering. Estimated ~9-12 days at 4-6 hrs/day given existing HTML/CSS/Bootstrap background.
- **Backend migration: Express → Nest.js** — deliberate learning/resume exercise once off deadline pressure. Since business logic, Prisma schema, and email flows are reusable, this becomes a structural refactor (wrapping existing logic in Nest's module/controller/service/DI pattern), not a rebuild. Estimated ~5-7 days, 2-3 hrs/day (~12-18 hrs) to reach "resume-defensible" depth (can explain modules, DI, decorators, and how it compares to Express's manual wiring).
- **DNS TXT record verification** for university onboarding — long-term replacement for the v1 manual video-call verification process. Requires building actual DNS lookup/verification logic, not just a manual admin step.
- **CSV-based bulk shortlist status update** — v2 admin convenience feature, replacing one-by-one manual status marking.
- **Custom drive pipelines** — allowing per-drive custom status flows beyond the fixed 6-status set (applied, shortlisted, OA/Test, interview, selected, not selected).
- **Faculty role** — a third account role beyond Admin/Student, deferred entirely from v1's account model.
- **`sectors` table** — deferred for review; intended purpose (categorizing companies/drives by industry sector) not yet finalized.
- **`email_logs` table** — deferred for review; intended purpose (tracking sent email history/status for auditing or debugging) not yet finalized.
- **Data Analytics Dashboard** (originally mentioned in old MERN-era presentation) — visual insights on placement stats (placed vs unplaced, average packages by department) — not part of the v2 redesign's finalized schema/scope discussion yet; would need fresh scoping if pursued.
- **Alumni Connect module** (originally mentioned in old MERN-era presentation) — portal for past students to post referrals/interview experiences — same status as above, not yet scoped for the v2 redesign.
- **Separate Jira-like tool project** — microservices architecture, Python/FastAPI — completely separate project, explicitly out of scope for HireSphere, to be discussed independently later.

---

## 12. Guiding Principles (carried through all decisions)

- **Plan exhaustively before writing code** — architecture and schema decisions finalized before implementation begins.
- **Monolith-first** — avoid premature complexity; a clean monolith is easier to reason about, build, and migrate later than a distributed system built too early.
- **Dynamic forms via JSONB** — the core differentiator; keeps schema flexible without abandoning relational structure elsewhere.
- **Derivability over redundancy** — don't store what can be computed.
- **Scope discipline** — aggressively defer anything not essential to a working v1 (faculty roles, custom pipelines, CSV bulk ops, frontend) to keep the build achievable within a tight timeline.

---

*This document is the source of truth for the HireSphere v2 rebuild. Update only with explicit confirmation before modifying.*
