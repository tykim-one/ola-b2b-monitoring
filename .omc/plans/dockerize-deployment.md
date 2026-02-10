# Work Plan: Dockerize OLA B2B Monitoring for Deployment

## Context

### Original Request
현재 OLA B2B Monitoring 모노레포 프로젝트를 도커라이징하여 배포 가능하게 만들기.

### Research Findings

**Monorepo Structure:**
- pnpm 9.15.1 workspaces: `apps/backend`, `apps/frontend-next`, `packages/shared-types`
- Node.js v22.12.0, TypeScript 5.8.2
- `pnpm-workspace.yaml` with `onlyBuiltDependencies: better-sqlite3 prisma` (space-separated format). Also duplicated in `.npmrc` as `onlyBuiltDependencies=better-sqlite3,prisma` (comma-separated). Both formats are valid for pnpm 9.

**Backend (NestJS, port 3000):**
- NestJS v10 + BigQuery v7 + Prisma v7 (SQLite via libSQL adapter)
- Prisma uses `@prisma/adapter-libsql` with Wasm runtime — no `binaryTargets` needed, no native Prisma engine binaries
- Build: `nest build` -> `dist/` -> `node dist/main`
- Prisma schema at `apps/backend/prisma/schema.prisma`, output to `src/generated/prisma`
- `nest-cli.json` copies `generated/**/*` to `dist/src/` as assets
- SQLite DB at `prisma/admin.db` (18MB), path resolved via `DATABASE_URL` env or default `file:./prisma/admin.db`
- PrismaService resolves path relative to `process.cwd()`
- Native dependencies: `bcrypt@6` (requires python3, make, g++ for compilation)
- `better-sqlite3@11` is a devDependency only — not needed at runtime
- Playwright used in `ui-check.service.ts` for headless browser UI monitoring (static import at line 8 — NestJS crashes on bootstrap if absent)
- Config files: `config/datasources.config.json` (read-only), `config/ui-checks.json` (read-write via PATCH endpoint)
- GCP credentials: `service-account.json` file for BigQuery
- No existing `/health` endpoint (only `/` root and `/api/services/:serviceId/health`)

**Frontend (Next.js 16.1.1, port 3001):**
- Next.js 16 + React 19 + Tailwind CSS v3
- Build: `next build` -> `.next/` -> `next start -p 3001`
- Currently NO `output: 'standalone'` in `next.config.ts`
- Uses `@ola/shared-types` workspace package
- Env: `NEXT_PUBLIC_API_URL` (build-time variable)

**Shared Types (`@ola/shared-types`):**
- Pure TypeScript, `tsc` -> `dist/`
- Must be built BEFORE backend and frontend

**No existing Docker files** - greenfield Docker setup.

---

## Work Objectives

### Core Objective
Create a production-ready Docker setup for the OLA B2B Monitoring monorepo that enables reliable, reproducible deployments with docker-compose.

### Deliverables
1. Multi-stage `Dockerfile` for backend (with Playwright support)
2. Multi-stage `Dockerfile` for frontend (with standalone output)
3. `docker-compose.yml` for orchestrating both services
4. `.dockerignore` files to optimize build context
5. `next.config.ts` modification for standalone output
6. Health check endpoint for backend
7. Environment variable templates (`.env.docker.example`)
8. Code changes to support configurable file paths (seed.ts, ui-check.service.ts, datasource.config.ts)

### Definition of Done
- `docker compose build` succeeds without errors
- `docker compose up` starts both services
- Backend responds on port 3000 with health check
- Frontend loads on port 3001 and communicates with backend
- SQLite database is persisted via Docker volume
- Config files (`ui-checks.json`) persist via Docker volume with defaults
- GCP credentials are mountable without baking into image
- Seed script writes to the SAME database the application uses (via DATABASE_URL)
- Config file paths are configurable via env vars with local-dev fallbacks

---

## Must Have
- Multi-stage builds for minimal image size
- Proper pnpm workspace handling in Docker
- Full `node:22-bookworm` (non-slim) for build stages to compile native modules (bcrypt)
- Slim `node:22-bookworm-slim` only for the final runner stage
- Playwright + Chromium installed for UI check feature (static import prevents lazy-load)
- SQLite data persistence across container restarts
- Config file handling: baked defaults + volume mount for runtime-writable files
- Secure GCP credential handling (volume mount, not in image)
- Health checks for both services
- `.dockerignore` to prevent leaking secrets and bloating context
- Entrypoint script properly COPYed, chmod'd, and set as ENTRYPOINT in Dockerfile
- Code changes to make hardcoded file paths configurable via env vars (seed.ts, ui-check.service.ts, datasource.config.ts)

## Must NOT Have
- Hardcoded secrets or credentials in Dockerfiles
- GCP service account JSON baked into images
- Nginx reverse proxy (out of scope, optional future enhancement)
- CI/CD pipeline configuration (separate concern)
- Kubernetes manifests (separate concern)
- Production SSL/TLS setup (handled at infrastructure level)

---

## Task Flow and Dependencies

```
[Task 1: .dockerignore] ──────────────────────────────────────┐
[Task 2: next.config.ts standalone] ──────────────────────────┐│
[Task 3: Backend health endpoint] ───────────────────────────┐││
[Task 3a: Fix seed.ts DB path] ────────────────────────────┐│││
[Task 3b: Fix ui-check.service.ts config path] ──────────┐││││
[Task 3c: Fix datasource.config.ts config path] ────────┐│││││
                                                          ││││││
[Task 4: Backend Dockerfile] ◄────────────────────────────┘┘┘│├─► [Task 7: docker-compose.yml] ─► [Task 8: .env.docker.example] ─► [Task 9: Verification]
[Task 5: Frontend Dockerfile] ◄───────────────────────────────┘
[Task 6: Prisma + DB + Config handling] ◄──────── (integrated into Task 4)
```

**IMPORTANT:** Tasks 3a, 3b, 3c (code changes) MUST be completed BEFORE Task 4 (Dockerfile) because the Docker build compiles the modified source code.

---

## Detailed TODOs

### TODO 1: Create `.dockerignore` files
**File:** `/Users/tykim/Documents/ola-b2b-monitoring/.dockerignore`
**Priority:** HIGH (must exist before any `docker build`)
**Acceptance Criteria:** Build context excludes node_modules, .env, .git, *.db, service-account.json

```
# Root .dockerignore
node_modules
**/node_modules
.git
.gitignore
*.md
!packages/shared-types/**/*.md

# Environment and secrets
.env
.env.*
**/.env
**/.env.*
**/service-account.json

# Build outputs (will be generated inside container)
dist
**/dist
build
**/build
.next
**/.next

# Database files (mounted as volumes, not copied)
*.db
*.db-journal
*.db-wal

# IDE and OS
.vscode
.idea
.DS_Store

# Test and coverage
coverage
**/coverage
*.spec.ts
**/test

# Docker files themselves
Dockerfile*
docker-compose*

# Misc
.omc
.claude
screenshots
```

**Why:** Without `.dockerignore`, Docker sends the entire repo (including `node_modules`, `.git`, `*.db`) as build context, which is slow and potentially leaks secrets.

**Pitfalls:**
- Must NOT exclude `pnpm-workspace.yaml`, `pnpm-lock.yaml`, or any `package.json` files
- Must NOT exclude `prisma/schema.prisma` (needed for generate)
- Must NOT exclude `apps/backend/src/generated/` (contains Prisma client that nest-cli copies as assets)
- Must NOT exclude `config/` directories (needed for baking defaults into image)
- Must NOT exclude `docker-entrypoint.sh`

---

### TODO 2: Modify `next.config.ts` for standalone output
**File:** `/Users/tykim/Documents/ola-b2b-monitoring/apps/frontend-next/next.config.ts`
**Priority:** HIGH (required for optimized Docker image)
**Acceptance Criteria:** `output: 'standalone'` is set in Next.js config

**Current content:**
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbopackFileSystemCacheForBuild: true,
    turbopackFileSystemCacheForDev: true,
  },
};

export default nextConfig;
```

**Change to:**
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    turbopackFileSystemCacheForBuild: true,
    turbopackFileSystemCacheForDev: true,
  },
};

export default nextConfig;
```

**Why:** `output: 'standalone'` creates a self-contained build at `.next/standalone` that includes only the necessary `node_modules`. This reduces the Docker image from ~1GB+ (full node_modules) to ~150-200MB. The standalone output includes a minimal server at `server.js`.

**Pitfalls:**
- Static assets (`public/` and `.next/static/`) are NOT included in standalone output and must be copied separately in the Dockerfile
- The standalone server uses `process.env.PORT` or defaults to 3000, so we need to set `PORT=3001` or use `HOSTNAME=0.0.0.0` explicitly
- `NEXT_PUBLIC_*` env vars are inlined at BUILD TIME, so they must be passed as build args

---

### TODO 3: Add backend health check endpoint
**File:** `/Users/tykim/Documents/ola-b2b-monitoring/apps/backend/src/app.controller.ts`
**Priority:** HIGH (needed for Docker health checks and load balancers)
**Acceptance Criteria:** `GET /health` returns `{ status: 'ok', timestamp: ... }` without authentication

**Current `AppController`:**
```typescript
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
```

**Add health endpoint:**
```typescript
import { Controller, Get } from '@nestjs/common';
import { Public } from './admin/auth/decorators/public.decorator';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
```

**Why:** Docker health checks and load balancers need a lightweight, unauthenticated endpoint to verify the service is responsive. The existing `/api/services/:serviceId/health` is too specific (checks external services, not app readiness). The `@Public()` decorator bypasses JWT auth.

**Pitfalls:**
- Must use `@Public()` decorator to bypass the global `JwtAuthGuard`
- Must import `Public` from the correct path (`./admin/auth/decorators/public.decorator`)
- Keep it lightweight - no database queries, no external calls

---

### TODO 3a: Fix `prisma/seed.ts` to resolve DB path from `DATABASE_URL`
**File:** `/Users/tykim/Documents/ola-b2b-monitoring/apps/backend/prisma/seed.ts`
**Priority:** CRITICAL (must be fixed before Docker build)
**Acceptance Criteria:** Seed script writes to the same database the application uses; works in both local dev and Docker

**Problem:**
The seed script currently uses `path.join(__dirname, 'admin.db')` to resolve the database path. When compiled to JavaScript via `tsc --outDir prisma/compiled-seed`, `__dirname` resolves to `prisma/compiled-seed/` (the output directory), NOT `prisma/`. This means the compiled seed writes to `prisma/compiled-seed/admin.db` -- a completely different file than the database the application reads from via `DATABASE_URL=file:./data/db/admin.db`.

**Current code (lines 7-12):**
```typescript
import * as path from 'path';

// Resolve database path - the db is in the same directory as this seed file
const absoluteDbPath = path.join(__dirname, 'admin.db');

// Create Prisma with libSQL adapter (supports local SQLite files via file: protocol)
const adapter = new PrismaLibSql({ url: `file:${absoluteDbPath}` });
const prisma = new PrismaClient({ adapter });
```

**Change to:**
```typescript
import * as path from 'path';

// Resolve database path from DATABASE_URL env var (Docker/production)
// Fallback to __dirname-relative path (local development with ts-node)
function resolveDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    // DATABASE_URL format: "file:./data/db/admin.db" (relative to cwd)
    // or "file:/absolute/path/to/admin.db"
    const filePath = databaseUrl.replace(/^file:/, '');
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);
    return `file:${absolutePath}`;
  }
  // Fallback: local dev - db is in the same directory as this seed file
  return `file:${path.join(__dirname, 'admin.db')}`;
}

const adapter = new PrismaLibSql({ url: resolveDatabaseUrl() });
const prisma = new PrismaClient({ adapter });
```

**Why this is critical:**
- In Docker, `DATABASE_URL=file:./data/db/admin.db` is set via docker-compose.yml
- The entrypoint runs `node prisma/compiled-seed/seed.js` which would use `__dirname` = `/app/apps/backend/prisma/compiled-seed/`
- The seed would create `/app/apps/backend/prisma/compiled-seed/admin.db` (wrong file!)
- The app reads from `/app/apps/backend/data/db/admin.db` (correct, from DATABASE_URL)
- Result: seed data is invisible to the application -- login fails, no permissions, no prompt templates

**Local development fallback:**
- When running `pnpm prisma:seed` locally (via ts-node), `DATABASE_URL` may or may not be set
- If not set, falls back to `path.join(__dirname, 'admin.db')` which is the current behavior (`prisma/admin.db`)
- If `DATABASE_URL` is set in `.env`, uses that path -- also correct for local dev

---

### TODO 3b: Fix `ui-check.service.ts` to read config path from env var
**File:** `/Users/tykim/Documents/ola-b2b-monitoring/apps/backend/src/report-monitoring/ui-check.service.ts`
**Priority:** CRITICAL (must be fixed before Docker build)
**Acceptance Criteria:** Both `updateCheckConfig()` and `loadConfig()` methods use `UI_CHECKS_CONFIG_PATH` env var with fallback to current hardcoded path

**Problem:**
The file hardcodes `path.join(process.cwd(), 'config', 'ui-checks.json')` in TWO separate methods. In Docker, `ui-checks.json` is volume-mounted at `data/config/ui-checks.json` (writable), while the baked copy is at `config-defaults/ui-checks.json` (read-only). The current code would try to read/write `config/ui-checks.json` which does not exist in the Docker image (config files are baked to `config-defaults/`).

**Location 1 - `updateCheckConfig()` method (line 274):**
```typescript
// Current code:
const configPath = path.join(process.cwd(), 'config', 'ui-checks.json');
```

**Change to:**
```typescript
// Changed code:
const configPath = process.env.UI_CHECKS_CONFIG_PATH
  ? path.resolve(process.cwd(), process.env.UI_CHECKS_CONFIG_PATH)
  : path.join(process.cwd(), 'config', 'ui-checks.json');
```

**Location 2 - `loadConfig()` method (line 430):**
```typescript
// Current code:
const configPath = path.join(process.cwd(), 'config/ui-checks.json');
```

**Change to:**
```typescript
// Changed code:
const configPath = process.env.UI_CHECKS_CONFIG_PATH
  ? path.resolve(process.cwd(), process.env.UI_CHECKS_CONFIG_PATH)
  : path.join(process.cwd(), 'config', 'ui-checks.json');
```

**Why this is critical:**
- In Docker, `docker-compose.yml` sets `UI_CHECKS_CONFIG_PATH=./data/config/ui-checks.json`
- The entrypoint copies baked defaults to `data/config/ui-checks.json` on first run
- Without this code change, the app looks for `config/ui-checks.json` which does not exist in the Docker image
- Both `loadConfig()` (reads) and `updateCheckConfig()` (reads AND writes) must use the same configurable path
- The PATCH endpoint would fail silently or crash when trying to write to a non-existent path

**Local development fallback:**
- When `UI_CHECKS_CONFIG_PATH` is not set (local dev), falls back to `path.join(process.cwd(), 'config', 'ui-checks.json')` -- the existing behavior, no change for local dev

**Note:** Consider extracting the config path resolution to a private method or class property to avoid duplication.

---

### TODO 3c: Fix `datasource.config.ts` to read config path from env var
**File:** `/Users/tykim/Documents/ola-b2b-monitoring/apps/backend/src/datasource/datasource.config.ts`
**Priority:** CRITICAL (must be fixed before Docker build)
**Acceptance Criteria:** Constructor uses `DATASOURCES_CONFIG_PATH` env var with fallback to current hardcoded path

**Problem:**
The constructor hardcodes the config path as `path.resolve(process.cwd(), 'config', 'datasources.config.json')`. In Docker, the read-only baked config is at `config-defaults/datasources.config.json`, not `config/datasources.config.json`. The `docker-compose.yml` sets `DATASOURCES_CONFIG_PATH=./config-defaults/datasources.config.json` but the code never reads this env var.

**Current code (lines 23-30):**
```typescript
constructor(private readonly configService: ConfigService) {
  // Config file is in apps/backend/config/datasources.config.json
  this.configPath = path.resolve(
    process.cwd(),
    'config',
    'datasources.config.json',
  );
}
```

**Change to:**
```typescript
constructor(private readonly configService: ConfigService) {
  // Config file path: configurable via env var for Docker, defaults to local path
  const envPath = process.env.DATASOURCES_CONFIG_PATH;
  this.configPath = envPath
    ? path.resolve(process.cwd(), envPath)
    : path.resolve(process.cwd(), 'config', 'datasources.config.json');
}
```

**Why this is critical:**
- In Docker, `docker-compose.yml` sets `DATASOURCES_CONFIG_PATH=./config-defaults/datasources.config.json`
- The baked config files are at `config-defaults/` in the Docker image (COPY from build stage)
- Without this code change, the app looks for `config/datasources.config.json` which does not exist
- The `loadConfig()` method would fall back to `getDefaultConfig()` (env-var-based defaults), which might work BUT loses all project-specific datasource configurations from the JSON file
- This is especially problematic for multi-project setups where project-specific BigQuery tables are defined in the config

**Local development fallback:**
- When `DATASOURCES_CONFIG_PATH` is not set (local dev), falls back to `path.resolve(process.cwd(), 'config', 'datasources.config.json')` -- the existing behavior
- The `ConfigService` injection is already available for reading env vars, but we use `process.env` directly here because the constructor runs before NestJS config module is fully initialized

---

### TODO 4: Create backend Dockerfile
**File:** `/Users/tykim/Documents/ola-b2b-monitoring/apps/backend/Dockerfile`
**Priority:** CRITICAL (depends on TODOs 3, 3a, 3b, 3c being complete first)
**Acceptance Criteria:** Multi-stage build produces working backend image with Playwright, entrypoint, and config defaults

**Dockerfile design (5 stages):**

```dockerfile
# ============================================================
# Stage 1: Base - Common Node.js + pnpm setup
# NOTE: Uses full bookworm (NOT slim) because bcrypt requires
# python3, make, g++ for native compilation
# ============================================================
FROM node:22-bookworm AS base

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@9.15.1 --activate

WORKDIR /app

# ============================================================
# Stage 2: Dependencies - Install all workspace dependencies
# ============================================================
FROM base AS deps

# Copy workspace config files first (for layer caching)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/backend/package.json ./apps/backend/

# Install all dependencies (including devDependencies for build)
# bcrypt native compilation happens here (python3/make/g++ available in full bookworm)
RUN pnpm install --frozen-lockfile

# ============================================================
# Stage 3: Build - Compile shared-types, generate Prisma, build backend
# ============================================================
FROM deps AS build

# Copy shared-types source and build
COPY packages/shared-types/ ./packages/shared-types/
RUN pnpm --filter @ola/shared-types build

# Copy Prisma schema and generate client
# NOTE: Prisma uses @prisma/adapter-libsql with Wasm runtime.
# No binaryTargets needed — no native Prisma engine binaries.
COPY apps/backend/prisma/ ./apps/backend/prisma/
COPY apps/backend/src/generated/ ./apps/backend/src/generated/
RUN cd apps/backend && pnpm prisma:generate

# Copy backend source and build
COPY apps/backend/ ./apps/backend/
RUN pnpm --filter backend build

# Pre-compile seed script from TypeScript to JavaScript for production use
# (ts-node is not available in production image)
RUN cd apps/backend && npx tsc prisma/seed.ts --outDir prisma/compiled-seed \
    --esModuleInterop --resolveJsonModule --skipLibCheck --module commonjs --target es2020 \
    || echo "Seed compilation optional - manual seeding may be needed"

# ============================================================
# Stage 4: Production dependencies only
# CRITICAL: Branch from base (NOT deps) for a clean install
# pnpm install --prod on top of existing full install does NOT
# properly prune devDependencies.
# ============================================================
FROM base AS prod-deps

# Copy workspace config files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/backend/package.json ./apps/backend/

# Clean production-only install (no devDependencies)
# bcrypt native compilation also happens here (full bookworm has build tools)
RUN pnpm install --frozen-lockfile --prod

# ============================================================
# Stage 5: Runner - Minimal production image
# NOTE: Uses bookworm-slim (NOT full bookworm) for minimal size.
# Build tools are no longer needed — all native modules are
# pre-compiled in the prod-deps stage.
# ============================================================
FROM node:22-bookworm-slim AS runner

# Install Playwright system dependencies for Chromium
# This is REQUIRED: ui-check.service.ts has a static import at line 8.
# NestJS will crash on bootstrap if Playwright is absent, regardless
# of the UI_CHECK_ENABLED guard.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libatspi2.0-0 \
    libwayland-client0 \
    fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nestjs

WORKDIR /app

# Copy production node_modules (pre-compiled native modules from prod-deps)
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=prod-deps /app/packages/shared-types/ ./packages/shared-types/

# Copy built application
COPY --from=build /app/apps/backend/dist ./apps/backend/dist

# Copy Prisma schema (needed at runtime for db push)
COPY --from=build /app/apps/backend/prisma/schema.prisma ./apps/backend/prisma/schema.prisma

# Copy compiled seed script (if compilation succeeded)
COPY --from=build /app/apps/backend/prisma/compiled-seed/ ./apps/backend/prisma/compiled-seed/

# --- Config File Handling (Hybrid Strategy) ---
# datasources.config.json: Baked into image (read-only at runtime)
# ui-checks.json: Baked as default, copied to volume at runtime if not exists
COPY --from=build /app/apps/backend/config/ ./apps/backend/config-defaults/

# --- Entrypoint Script ---
COPY apps/backend/docker-entrypoint.sh ./apps/backend/docker-entrypoint.sh
RUN chmod +x ./apps/backend/docker-entrypoint.sh

# Install Playwright browsers (Chromium only, not all browsers)
# Expected to add ~400-500MB to image size
RUN cd apps/backend && npx playwright install chromium

# Create directories for persistent data (will be mounted as volumes)
# /app/apps/backend/data/db       - SQLite database
# /app/apps/backend/data/config   - Runtime-writable config (ui-checks.json)
RUN mkdir -p /app/apps/backend/data/db \
             /app/apps/backend/data/config \
    && chown -R nestjs:nodejs /app/apps/backend/data \
    && chown -R nestjs:nodejs /app/apps/backend/prisma

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Switch to non-root user
USER nestjs

WORKDIR /app/apps/backend

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Entrypoint handles DB init, config defaults, then execs CMD
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main"]
```

**Key Decisions:**

1. **`node:22-bookworm` (full, non-slim) for `base`/`deps`/`prod-deps` stages**: The full Bookworm image includes `python3`, `make`, `g++` which are required for compiling `bcrypt` native module. The slim image lacks these build tools and would fail during `npm install`. Only the final `runner` stage uses `bookworm-slim` since all native modules are already pre-compiled.

2. **`prod-deps` branches from `base` (NOT from `deps`)**: This is critical. Running `pnpm install --prod` on top of a full install does NOT properly prune devDependencies. By branching from `base` and doing a clean `pnpm install --frozen-lockfile --prod`, we get a truly minimal production `node_modules` without any devDependency artifacts.

3. **5-stage build**: Separates concerns for maximum layer caching:
   - `base`: Node + pnpm (full bookworm, rarely changes)
   - `deps`: All dependencies including devDeps (changes when lock file changes)
   - `build`: Compile step (changes with source code)
   - `prod-deps`: Clean production-only deps from base (parallel to build)
   - `runner`: Minimal runtime image (bookworm-slim)

4. **Playwright in production image (mandatory)**: The `ui-check.service.ts` has a static import at line 8. This means NestJS crashes on bootstrap if Playwright is absent — the `UI_CHECK_ENABLED` guard does not prevent the import failure. We install only Chromium (not all browsers) using `npx playwright install chromium`. Expected image size: ~800MB-1.2GB. Already has Docker-ready args in code: `--no-sandbox`, `--disable-setuid-sandbox`. `fonts-noto-cjk` provides CJK font support for Korean/Japanese pages.

5. **Prisma uses Wasm runtime**: `@prisma/adapter-libsql` with Wasm runtime means no `binaryTargets` configuration is needed. No native Prisma engine binaries are compiled or required.

6. **Config file hybrid strategy**:
   - `datasources.config.json`: Baked into image at `config-defaults/` — read-only, uses env var templates
   - `ui-checks.json`: Baked as default at `config-defaults/` — the entrypoint copies to the writable volume if no file exists, preserving runtime changes across restarts

7. **Entrypoint script**: Properly COPYed into the image, given execute permissions with `chmod +x`, and set as `ENTRYPOINT`. Handles DB initialization, config default copying, and then `exec "$@"` to hand off to CMD.

8. **Seed script pre-compilation**: The `prisma/seed.ts` is compiled to JavaScript during the build stage since `ts-node` is not available in the production image. The entrypoint runs `node prisma/compiled-seed/seed.js` instead. The seed script (after TODO 3a) resolves DB path from `DATABASE_URL` env var, ensuring it writes to the correct database.

9. **Non-root user**: Security best practice. The `nestjs` user runs the application.

**Pitfalls:**
- `pnpm install --frozen-lockfile` requires exact `pnpm-lock.yaml` — ensure it is committed and up-to-date
- `onlyBuiltDependencies` in `pnpm-workspace.yaml` uses space-separated format (`better-sqlite3 prisma`), also present in `.npmrc` as comma-separated. Both formats are valid for pnpm 9 and should work in Docker without changes
- `better-sqlite3` is a devDependency — it won't be in prod-deps. `@prisma/adapter-libsql` + `@libsql/client` handle SQLite at runtime without it
- Playwright browser install (~400MB) significantly increases image size. Consider making it optional via build arg if UI checks are not needed in all environments
- `process.cwd()` in PrismaService resolves DB path — WORKDIR must be set correctly
- `prisma` CLI is a devDependency. In the runner stage, we use `npx --yes prisma` in the entrypoint to ensure it's available for `db push` without being a production dependency

---

### TODO 5: Create frontend Dockerfile
**File:** `/Users/tykim/Documents/ola-b2b-monitoring/apps/frontend-next/Dockerfile`
**Priority:** CRITICAL
**Acceptance Criteria:** Multi-stage build produces working frontend image with standalone output

```dockerfile
# ============================================================
# Stage 1: Base
# ============================================================
FROM node:22-bookworm-slim AS base

RUN corepack enable && corepack prepare pnpm@9.15.1 --activate

WORKDIR /app

# ============================================================
# Stage 2: Dependencies
# ============================================================
FROM base AS deps

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/frontend-next/package.json ./apps/frontend-next/

RUN pnpm install --frozen-lockfile

# ============================================================
# Stage 3: Build
# ============================================================
FROM deps AS build

# Build shared-types first (dependency of frontend)
COPY packages/shared-types/ ./packages/shared-types/
RUN pnpm --filter @ola/shared-types build

# Copy frontend source
COPY apps/frontend-next/ ./apps/frontend-next/

# NEXT_PUBLIC_ vars must be available at build time
ARG NEXT_PUBLIC_API_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Build Next.js with standalone output
RUN pnpm --filter frontend-next build

# ============================================================
# Stage 4: Runner
# ============================================================
FROM node:22-bookworm-slim AS runner

# Create non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

WORKDIR /app

# Copy standalone build output
COPY --from=build /app/apps/frontend-next/.next/standalone ./
COPY --from=build /app/apps/frontend-next/.next/static ./apps/frontend-next/.next/static
COPY --from=build /app/apps/frontend-next/public ./apps/frontend-next/public

# Set environment
ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

USER nextjs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://localhost:3001').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# The standalone output creates server.js at the app root
CMD ["node", "apps/frontend-next/server.js"]
```

**Note:** The frontend Dockerfile correctly uses `bookworm-slim` for all stages because the frontend has no native modules requiring compilation tools. Only the backend needs the full `bookworm` image for bcrypt.

**Key Decisions:**

1. **Standalone output**: With `output: 'standalone'`, Next.js traces and bundles only the necessary `node_modules` into `.next/standalone`. The final image contains ~150-200MB instead of ~1GB+ with full `node_modules`.

2. **Build-time `NEXT_PUBLIC_API_URL`**: Next.js inlines `NEXT_PUBLIC_*` variables during build. We use `ARG` to make this configurable via `docker build --build-arg NEXT_PUBLIC_API_URL=...`. Default is `http://localhost:3000` for local dev.

3. **Static files copied separately**: The standalone output does NOT include `public/` and `.next/static/`. These must be copied explicitly.

4. **Server path**: With pnpm workspaces + standalone, the server is at `apps/frontend-next/server.js` within the standalone directory structure.

**Pitfalls:**
- `NEXT_PUBLIC_API_URL` is baked at build time. For different environments, you need separate builds OR use runtime configuration patterns (e.g., `__NEXT_PUBLIC_API_URL__` placeholder replacement at container start)
- The standalone `server.js` path depends on the monorepo structure. Verify with `ls -la .next/standalone/` after build
- If `public/` directory does not exist, the COPY will fail. Use conditional copy or ensure the directory exists
- `HOSTNAME=0.0.0.0` is REQUIRED for Next.js to listen on all interfaces inside Docker (default is localhost which is unreachable from outside the container)

---

### TODO 6: Handle Prisma + SQLite + Config Files in Docker (integrated into TODO 4)
**Priority:** HIGH
**Acceptance Criteria:** SQLite database persists across container restarts; config files have writable persistence with baked defaults

**Strategy:**

**A. SQLite Database:**
- The SQLite database (`data/db/admin.db`) stores admin data (users, roles, sessions, batch analysis results)
- In Docker, we mount a volume to `/app/apps/backend/data/db/` to persist the DB
- On first run, the DB won't exist. The entrypoint script:
  1. Runs `npx --yes prisma db push --skip-generate` to create the schema
  2. Optionally runs seed script to create the default admin user

**B. Config Files (Hybrid Strategy per Architect recommendation):**

| File | Strategy | Rationale |
|------|----------|-----------|
| `datasources.config.json` | Bake into image | Read-only at runtime, uses env var templates |
| `ui-checks.json` | Bake defaults + mount volume | PATCH endpoint writes to it; must survive restarts |

- Defaults baked to `/app/apps/backend/config-defaults/` during Docker build
- Volume mounted at `/app/apps/backend/data/config/`
- Entrypoint copies defaults to volume if files don't exist: `cp -n config-defaults/ui-checks.json data/config/ui-checks.json`
- Application reads `datasources.config.json` from `config-defaults/` (baked, read-only) via `DATASOURCES_CONFIG_PATH` env var (TODO 3c)
- Application reads/writes `ui-checks.json` from `data/config/` (volume, writable) via `UI_CHECKS_CONFIG_PATH` env var (TODO 3b)

**Solution - Entrypoint script:**

**File:** `/Users/tykim/Documents/ola-b2b-monitoring/apps/backend/docker-entrypoint.sh`

```bash
#!/bin/sh
set -e

echo "=== OLA B2B Monitoring - Backend Startup ==="

# --- Config File Defaults ---
# Copy baked defaults to writable volume if they don't exist
# ui-checks.json must be writable (PATCH endpoint writes to it)
if [ -d "config-defaults" ]; then
    echo "Checking config defaults..."
    # -n flag: do not overwrite existing files (preserves runtime changes)
    cp -n config-defaults/ui-checks.json data/config/ui-checks.json 2>/dev/null || true
    # datasources.config.json stays in config-defaults/ (read-only)
    echo "Config files ready."
fi

# --- Database Initialization ---
DB_PATH="./data/db/admin.db"
if [ ! -f "$DB_PATH" ]; then
    echo "Database not found. Initializing..."

    # prisma is a devDep, so use npx --yes to ensure it's available
    npx --yes prisma db push --skip-generate
    echo "Database schema created."

    # Seed if ADMIN_SEED_PASSWORD is set (indicates first-run seeding desired)
    if [ -n "$ADMIN_SEED_PASSWORD" ]; then
        echo "Seeding database with admin user..."
        if [ -f "prisma/compiled-seed/seed.js" ]; then
            node prisma/compiled-seed/seed.js
        else
            echo "WARNING: Compiled seed script not found. Skipping seed."
            echo "Run seeding manually if needed."
        fi
        echo "Database seeded."
    fi
else
    echo "Database exists. Skipping initialization."
fi

echo "=== Starting application ==="
exec "$@"
```

**Key changes from v1:**
- `prisma` CLI: Uses `npx --yes prisma` since `prisma` is a devDependency not present in production node_modules
- Seed script: Uses pre-compiled JavaScript (`prisma/compiled-seed/seed.js`) instead of `ts-node` which is unavailable in production
- Seed trigger: Uses `ADMIN_SEED_PASSWORD` env var (not `SEED_DB=true`) to both trigger seeding and provide the admin password
- Config handling: Copies baked defaults to writable volume using `cp -n` (no-clobber)
- DB path: Uses `./data/db/admin.db` matching the volume mount structure
- Seed script now resolves DB path from `DATABASE_URL` env var (see TODO 3a), ensuring it writes to `data/db/admin.db`

**Pitfalls:**
- SQLite is single-writer. Only ONE backend container can use the same volume
- Volume permissions: the `nestjs` user (UID 1001) must own the volume directory (handled in Dockerfile)
- `npx --yes prisma db push` downloads prisma CLI on first run if not cached — adds ~10s to first startup
- The seed script compilation may fail if seed.ts has complex imports. Test during Docker build and provide fallback

---

### TODO 7: Create `docker-compose.yml`
**File:** `/Users/tykim/Documents/ola-b2b-monitoring/docker-compose.yml`
**Priority:** CRITICAL
**Acceptance Criteria:** `docker compose up` starts both services with proper networking, volumes, and env

```yaml
services:
  backend:
    build:
      context: .
      dockerfile: apps/backend/Dockerfile
    container_name: ola-backend
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=file:./data/db/admin.db
      - CORS_ORIGIN=http://localhost:3001
      # Path for runtime-writable ui-checks.json (volume-mounted)
      - UI_CHECKS_CONFIG_PATH=./data/config/ui-checks.json
      # Path for read-only datasources config (baked into image)
      - DATASOURCES_CONFIG_PATH=./config-defaults/datasources.config.json
    env_file:
      - ./apps/backend/.env.docker
    volumes:
      # Persist SQLite database in dedicated data directory
      # NOT mounting over prisma/ (that would shadow schema.prisma)
      - backend-data:/app/apps/backend/data
      # Mount GCP credentials (read-only)
      - ./secrets/service-account.json:/app/apps/backend/service-account.json:ro
      # Mount screenshots directory (for UI check feature)
      - backend-screenshots:/app/apps/backend/screenshots
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"]
      interval: 30s
      timeout: 10s
      start_period: 40s
      retries: 3
    networks:
      - ola-network

  frontend:
    build:
      context: .
      dockerfile: apps/frontend-next/Dockerfile
      args:
        NEXT_PUBLIC_API_URL: http://localhost:3000
    container_name: ola-frontend
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - HOSTNAME=0.0.0.0
    depends_on:
      backend:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:3001').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"]
      interval: 30s
      timeout: 10s
      start_period: 20s
      retries: 3
    networks:
      - ola-network

volumes:
  # Dedicated data volume for backend (db + config)
  # Mounts at /app/apps/backend/data/ which contains:
  #   data/db/admin.db          - SQLite database
  #   data/config/ui-checks.json - Runtime-writable config
  backend-data:
    driver: local
  backend-screenshots:
    driver: local

networks:
  ola-network:
    driver: bridge
```

**Key Decisions:**

1. **Build context is root (`.`)**: Both Dockerfiles need access to the root `pnpm-workspace.yaml`, `pnpm-lock.yaml`, and `packages/shared-types/`. Setting context to root with `dockerfile` pointing to the app-specific Dockerfile.

2. **`env_file` for secrets**: Sensitive values (JWT_SECRET, GEMINI_API_KEY, GCP credentials) go in `.env.docker` which is NOT committed. Non-sensitive config goes in `environment` block.

3. **Named volume `backend-data` at `/app/apps/backend/data`**: This is a dedicated data directory, NOT the `prisma/` directory. This avoids shadowing `schema.prisma` which is baked into the image. The data directory contains:
   - `data/db/admin.db` -- SQLite database
   - `data/config/ui-checks.json` -- Runtime-writable config file

4. **`DATABASE_URL=file:./data/db/admin.db`**: Points to the volume-mounted data directory, not the `prisma/` directory. Both the app AND the seed script (after TODO 3a) use this same env var to find the database.

5. **Config path env vars**: `UI_CHECKS_CONFIG_PATH` and `DATASOURCES_CONFIG_PATH` allow the backend to find config files at their Docker-specific locations. The code changes in TODOs 3b and 3c read these env vars with fallbacks for local dev.

6. **GCP credentials bind mount**: The `service-account.json` is mounted read-only from a `secrets/` directory that is gitignored. This is the simplest approach for local/staging deployments. For production GCP, use Workload Identity or mounted secrets.

7. **`depends_on` with `service_healthy`**: Frontend waits for backend to be healthy before starting. This prevents frontend from starting before the API is ready.

8. **No `version` key**: Docker Compose v2+ does not require the `version` field. Omitting it is the modern practice.

**Pitfalls:**
- `NEXT_PUBLIC_API_URL` in the build arg defaults to `http://localhost:3000`. This works for same-host access but NOT for production where the frontend runs in the user's browser. For production, this should be the public-facing backend URL.
- Volume mount for GCP credentials assumes `./secrets/service-account.json` exists. Document this requirement clearly.
- Named volumes persist data but make it harder to inspect/backup. Consider bind mounts for development.

---

### TODO 8: Create environment variable templates
**File:** `/Users/tykim/Documents/ola-b2b-monitoring/apps/backend/.env.docker.example`
**Priority:** MEDIUM
**Acceptance Criteria:** Documents all required env vars for Docker deployment

```env
# ==============================================
# OLA B2B Monitoring - Backend Docker Environment
# ==============================================
# Copy this file to .env.docker and fill in values
# cp .env.docker.example .env.docker

# Server
PORT=3000
NODE_ENV=production

# Database (SQLite - path relative to WORKDIR /app/apps/backend)
DATABASE_URL=file:./data/db/admin.db

# BigQuery
GCP_PROJECT_ID=your-gcp-project-id
GOOGLE_APPLICATION_CREDENTIALS=/app/apps/backend/service-account.json
BIGQUERY_DATASET=your_dataset
BIGQUERY_TABLE=logs
GCP_BQ_LOCATION=asia-northeast3

# CORS (comma-separated origins)
CORS_ORIGIN=http://localhost:3001

# JWT Authentication
JWT_SECRET=change-this-to-a-secure-random-string-at-least-32-chars

# LLM (Gemini)
LLM_PROVIDER=gemini
GEMINI_MODEL=gemini-2.0-flash
GOOGLE_GEMINI_API_KEY=your-gemini-api-key

# Slack Notifications (optional)
# SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Database Seeding - First Run Only
# Set this to seed the database with an admin user on first startup.
# The value becomes the admin password. Remove after first run.
# ADMIN_SEED_PASSWORD=your-secure-admin-password

# Config paths (Docker-specific, usually set in docker-compose.yml)
# UI_CHECKS_CONFIG_PATH=./data/config/ui-checks.json
# DATASOURCES_CONFIG_PATH=./config-defaults/datasources.config.json
```

Also create `/Users/tykim/Documents/ola-b2b-monitoring/secrets/.gitkeep` and add `/secrets/` to `.gitignore`.

---

### TODO 9: Verification and Testing
**Priority:** HIGH
**Acceptance Criteria:** All Docker builds succeed and services start correctly

**Step-by-step verification:**

```bash
# 1. Create required files
cp apps/backend/.env.docker.example apps/backend/.env.docker
# Edit .env.docker with actual values (especially JWT_SECRET, GCP_PROJECT_ID)
# Set ADMIN_SEED_PASSWORD for first run

# 2. Place GCP credentials
mkdir -p secrets
cp /path/to/your/service-account.json secrets/service-account.json

# 3. Build images
docker compose build

# 4. Start services
docker compose up -d

# 5. Check logs (watch for entrypoint messages)
docker compose logs -f backend
# Expected: "=== OLA B2B Monitoring - Backend Startup ==="
#           "Database not found. Initializing..."
#           "Database schema created."
#           "=== Starting application ==="

docker compose logs -f frontend

# 6. Verify health
curl http://localhost:3000/health
# Expected: {"status":"ok","timestamp":"...","uptime":...}

curl http://localhost:3001
# Expected: HTML page of the dashboard

# 7. Verify backend API from frontend
# Open http://localhost:3001 in browser, check network tab

# 8. Check volumes
docker volume ls | grep ola

# 9. Verify config persistence
# PATCH a UI check config via API
# Restart containers
docker compose down
docker compose up -d
# Verify config changes survived restart

# 10. Verify DB persistence
docker compose down
docker compose up -d
# Verify admin user still exists (login should work)

# 11. Verify seed wrote to correct DB
docker exec -it ola-backend ls -la data/db/
# Expected: admin.db exists in data/db/ (NOT in prisma/compiled-seed/)

# 12. Clean up
docker compose down -v  # -v removes volumes
```

**Build validation commands:**

```bash
# Build backend only
docker compose build backend

# Build frontend only (with custom API URL)
docker compose build --build-arg NEXT_PUBLIC_API_URL=https://api.example.com frontend

# Check image sizes
docker images | grep ola
# Expected: backend ~800MB-1.2GB (Playwright), frontend ~200MB

# Inspect volumes
docker volume inspect ola-b2b-monitoring_backend-data

# Debug: shell into running container
docker exec -it ola-backend /bin/bash
# Check config files exist:
ls -la data/config/
ls -la config-defaults/
ls -la data/db/
```

---

## Files to Create/Modify Summary

| # | Action | File Path | Description |
|---|--------|-----------|-------------|
| 1 | CREATE | `.dockerignore` | Build context exclusion rules |
| 2 | MODIFY | `apps/frontend-next/next.config.ts` | Add `output: 'standalone'` |
| 3 | MODIFY | `apps/backend/src/app.controller.ts` | Add `GET /health` endpoint |
| 3a | MODIFY | `apps/backend/prisma/seed.ts` | Resolve DB path from `DATABASE_URL` env var |
| 3b | MODIFY | `apps/backend/src/report-monitoring/ui-check.service.ts` | Read config path from `UI_CHECKS_CONFIG_PATH` env var (2 locations) |
| 3c | MODIFY | `apps/backend/src/datasource/datasource.config.ts` | Read config path from `DATASOURCES_CONFIG_PATH` env var |
| 4 | CREATE | `apps/backend/Dockerfile` | Multi-stage backend build (bookworm for build, slim for runner) |
| 5 | CREATE | `apps/frontend-next/Dockerfile` | Multi-stage frontend build |
| 6 | CREATE | `apps/backend/docker-entrypoint.sh` | DB init + config defaults script |
| 7 | CREATE | `docker-compose.yml` | Service orchestration |
| 8 | CREATE | `apps/backend/.env.docker.example` | Env var template (includes ADMIN_SEED_PASSWORD) |
| 9 | CREATE | `secrets/.gitkeep` | GCP credentials directory |
| 10 | MODIFY | `.gitignore` | Add `secrets/`, `.env.docker` |

**Total: 13 file operations (6 CREATE, 7 MODIFY)**

---

## Commit Strategy

```
Commit 1: "feat: add Docker-compatible configurable paths for seed, config files"
  - apps/backend/prisma/seed.ts (DATABASE_URL support)
  - apps/backend/src/report-monitoring/ui-check.service.ts (UI_CHECKS_CONFIG_PATH support)
  - apps/backend/src/datasource/datasource.config.ts (DATASOURCES_CONFIG_PATH support)

Commit 2: "feat: add Docker health check endpoint for backend"
  - apps/backend/src/app.controller.ts

Commit 3: "feat: configure Next.js standalone output for Docker"
  - apps/frontend-next/next.config.ts

Commit 4: "feat: add Docker configuration for production deployment"
  - .dockerignore
  - apps/backend/Dockerfile
  - apps/frontend-next/Dockerfile
  - apps/backend/docker-entrypoint.sh
  - docker-compose.yml
  - apps/backend/.env.docker.example
  - secrets/.gitkeep
  - .gitignore (updated)
```

---

## Success Criteria

1. `docker compose build` completes without errors for both services
2. `docker compose up -d` starts both containers and they reach "healthy" state
3. `curl localhost:3000/health` returns `{"status":"ok",...}`
4. `curl localhost:3001` returns the Next.js frontend HTML
5. Frontend can communicate with backend API (verify in browser)
6. SQLite database persists across `docker compose down && docker compose up`
7. `ui-checks.json` config persists across container restarts (volume-mounted)
8. No secrets (JWT_SECRET, API keys, service-account.json) are baked into images
9. Image sizes are reasonable (backend ~800MB-1.2GB with Playwright, frontend ~200MB)
10. Entrypoint script runs on startup (visible in `docker compose logs backend`)
11. Seed script writes to `data/db/admin.db` (same DB as app), NOT to `prisma/compiled-seed/admin.db`
12. Config paths resolve correctly: `datasources.config.json` from `config-defaults/`, `ui-checks.json` from `data/config/`

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Playwright increases image to ~1.2GB | Medium | High | Only install Chromium; document optional build-arg to skip; consider separate service in future |
| bcrypt compilation fails in Docker | High | Low | Using full `node:22-bookworm` (not slim) for build stages ensures python3/make/g++ are available |
| `NEXT_PUBLIC_API_URL` wrong in production | High | Medium | Document clearly; consider runtime config pattern |
| SQLite volume corruption | High | Low | Regular backups; consider PostgreSQL for production |
| pnpm workspace resolution in Docker | Medium | Medium | Use `--frozen-lockfile`; test full build in CI |
| `npx --yes prisma` slow on first run | Low | High | Acceptable ~10s delay on first startup only; document in README |
| Seed script compilation fails | Low | Medium | Graceful fallback in entrypoint; can seed manually |
| `onlyBuiltDependencies` format | Low | Low | Both `pnpm-workspace.yaml` (space-separated) and `.npmrc` (comma-separated) declare the setting; both are valid for pnpm 9 |

---

## Future Enhancements (Out of Scope)

- **Nginx reverse proxy**: Single entry point, SSL termination, static file serving
- **Multi-replica backend**: Requires migrating from SQLite to PostgreSQL
- **CI/CD pipeline**: GitHub Actions / Cloud Build for automated builds
- **Kubernetes manifests**: Helm chart or kustomize for k8s deployment
- **Container registry**: Push to GCR/Artifact Registry
- **Playwright as separate service**: Extract UI check into microservice to reduce backend image size
- **Runtime NEXT_PUBLIC_API_URL**: Replace build-time env with runtime configuration pattern
