# HireSphere

A campus placement management platform — replacing spreadsheets and email chains with a centralized system for placement admins to run company drives and for students to apply.

**Status: v2 rebuild in progress.** The original MERN prototype has been retired and archived under [`legacy/`](legacy/); this repo now tracks a ground-up rebuild on a new stack.

---

## Why a rebuild

The [v1 prototype](legacy/) validated the core idea (admin-run drives, student applications, resume uploads) but was built fast as a first pass. v2 redesigns the data model and backend from scratch with a proper relational schema, cleaner separation of concerns, and a monorepo layout that scales past a single app.

## Tech stack (v2)

- **Backend:** Node.js, Express
- **Database:** PostgreSQL + Prisma ORM
- **Frontend:** Next.js (planned, after the backend and placement season)
- **Tooling:** npm workspaces monorepo, Docker Compose for local Postgres

## Project structure

```
apps/
  backend/     Express API + Prisma schema (active development)
  frontend/    Next.js app (not started yet)
legacy/        Archived v1 MERN prototype — reference only
```

## Current progress

- [x] Monorepo scaffolding (`apps/backend`, `apps/frontend`)
- [x] Express app skeleton with health check
- [x] Full Postgres schema modeled in Prisma (universities, programs, users, drives, applications, placements) + initial migration
- [ ] Prisma client wired into the API
- [ ] Authentication (JWT, Admin/Student roles)
- [ ] Core API routes
- [ ] CI/CD
- [ ] Frontend

## Legacy version

The original v1 build (React + Express + MongoDB) is preserved as-is under [`legacy/`](legacy/) for reference. It is **not maintained** — see [`legacy/README.md`](legacy/README.md) for its own setup instructions.

---

Durgesh Khushlani, 2026
