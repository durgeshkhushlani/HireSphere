# HireSphere — notes for Claude Code

Campus placement platform. v2 backend: Express + Prisma 7 + PostgreSQL, npm workspaces monorepo (`apps/backend`, `apps/frontend` — frontend not started). v1 (MERN) is archived under `legacy/`, not maintained.

## Environment quirks (don't rediscover these)

- **Postgres runs on host port 5433, not 5432.** A native Windows `postgres.exe` service already squats on 5432 on this machine. `docker-compose.yml` (gitignored, repo root) maps `5433:5432`. `DATABASE_URL` in `apps/backend/.env` must match.
- **Backend runs on port 3001, not 3000.** Another local project ("CampusOne", a Vite dev server) uses 3000 on this machine.
- **Node 24, npm 11.** npm 11 blocks dependency postinstall scripts by default. If `npm install` warns about `allow-scripts`, run `npm approve-scripts <pkg>` — already approved for prisma/@prisma/engines/esbuild, re-approve if versions bump.
- **Prisma 7, not 6.** Generator is `prisma-client` (not the deprecated `prisma-client-js`), output is TypeScript at `apps/backend/src/generated/prisma` (gitignored). A driver adapter (`@prisma/adapter-pg`) is mandatory to connect — see `apps/backend/src/lib/prisma.js`. The app runs via `tsx`, not plain `node` (`npm run dev` / `npm start` already handle this) — only the generated client is TypeScript, all hand-written source stays plain CommonJS `.js`.
- `apps/backend/package.json` has a `postinstall: "prisma generate"` script — required after every `npm install`, since Prisma can't auto-locate the schema from a workspace-root install.

## Demo accounts (seeded in the local dev DB)

- Admin: `admin@iitb.ac.in` / `secret123`
- Student: `student@iitb.ac.in` / `secret123`
- Both belong to university "IIT Bombay"; there's a company ("Google") and a couple of drives already seeded.

## Common commands

```bash
# start local Postgres (if not already running)
docker compose up -d   # from repo root; docker-compose.yml is gitignored

# install (also regenerates Prisma client via postinstall)
npm install             # from repo root — npm workspaces, installs everything

# run the backend dev server
cd apps/backend && npm run dev     # nodemon + tsx, port 3001

# db work (always from apps/backend)
npx prisma studio                  # visual DB browser, http://localhost:5555
npx prisma migrate dev --name X    # new migration
npx prisma migrate status          # check migration state

# full API regression check (server must already be running on 3001)
apps/backend/scripts/dev-check.sh
```

## Git workflow (this session runs in a worktree, not the main checkout)

This session works in a git worktree at `.claude/worktrees/scaffold-backend` (branch `worktree-scaffold-backend`), separate from the main checkout at the repo root. No `gh` CLI is available — no PRs, direct-to-main.

After every task (small, verified, working changes only):

```bash
# 1. commit in the worktree
git add <files>
git commit -m "single line message"   # user wants short single-line commit messages, no multi-paragraph bodies

# 2. from the MAIN CHECKOUT (not the worktree), fast-forward and push
cd "D:\Durgesh\Personal Projects\Hiresphere"
git checkout main -q
git fetch origin -q
git log --oneline main..origin/main   # check for anything pushed elsewhere first — don't blindly merge over unseen remote changes
git merge --ff-only worktree-scaffold-backend
git push origin main

# 3. sync the worktree branch back up
cd "D:\Durgesh\Personal Projects\Hiresphere\.claude\worktrees\scaffold-backend"
git merge --ff-only main -q
```

If `origin/main` has commits not in local `main` (e.g. the user edited a file directly on GitHub), inspect them (`git show`, `git diff`) before merging — don't assume, don't force-overwrite.

## Local-only files (gitignored, not on GitHub)

- `PROGRESS.md` (repo root) — plain-language build log for the user's own understanding. **Update this after every task or batch of small tasks** — standing instruction, not optional.
- `hiresphere-implementation-plan.md` (repo root) — source of truth for architecture/schema decisions (personal notes, not for public repo).
- `docker-compose.yml` (repo root) — local Postgres container config.

## Working style

- Small, incremental, independently-verified changes. Push after each one, don't batch unrelated work into one commit.
- Verify against the real running app and real local DB before calling something done — don't just eyeball the code.
- Don't leave stray test/scratch files in the repo. If you need a throwaway script to check something, write it, run it, delete it before committing — or put it in the OS scratchpad dir instead of the repo.
