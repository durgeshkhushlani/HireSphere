# Built with the repo root as the build context (npm workspaces need the
# root package.json + lockfile) — e.g. `docker build -f apps/backend/Dockerfile .`
# from the repo root.
FROM node:24-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/backend apps/backend

# prisma.config.ts resolves DATABASE_URL via env() — `prisma generate` (run
# via postinstall below) needs that to be *set*, even though generate never
# actually connects to it. Build-time placeholder only; the real value is
# supplied at container runtime and overrides this ENV default there.
ARG DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV DATABASE_URL=$DATABASE_URL

# npm ci also runs apps/backend's postinstall (`prisma generate`), which
# regenerates the Prisma client for THIS container's platform — never trust
# a client generated on the host machine (see CLAUDE.md's Prisma gotchas).
# NOT --omit=dev: tsx is a devDependency but the app is launched through it
# at runtime (see "start" script) — there's no separate build step here.
RUN npm ci

WORKDIR /app/apps/backend

ENV PORT=3001
EXPOSE 3001

# Runs via tsx, not plain node — only the generated Prisma client is
# TypeScript, but the app is still launched through tsx (see package.json).
CMD ["npm", "start"]
