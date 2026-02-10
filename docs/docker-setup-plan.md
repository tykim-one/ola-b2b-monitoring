# Docker화 계획: OLA B2B Monitoring (v3 - Critic 2차 반영)

## Context

회사 내부 SSH 호스트에 OLA B2B Monitoring 모노레포를 docker-compose로 배포하기 위한 Docker 설정을 생성한다.
Backend 환경변수는 기존 `apps/backend/.env`를 직접 참조하며, GCP 인증은 볼륨 마운트로 주입한다.

### Critic 리뷰 결과 (2회 반영)

| Iteration | 주요 수정 |
|-----------|----------|
| 1차 REJECT | 이미 구현된 5개 TODO 제거, env_file→.env, Stage 3 순서, Playwright 경로, DB_URL 검증 |
| 2차 REJECT | `prisma`+`dotenv`=devDep 런타임 실패 → 빌드 시점 DB 초기화, seed 컴파일 경로 깨짐 해결 |

---

## 이미 구현됨 (변경 불필요)

| 항목 | 파일 |
|------|------|
| `output: 'standalone'` | `apps/frontend-next/next.config.ts:4` |
| `GET /health` 엔드포인트 | `apps/backend/src/app.controller.ts:14-22` |
| seed.ts `DATABASE_URL` 지원 | `apps/backend/prisma/seed.ts:8-20` |
| `UI_CHECKS_CONFIG_PATH` env var | `apps/backend/src/report-monitoring/ui-check.service.ts:274,432` |
| `DATASOURCES_CONFIG_PATH` env var | `apps/backend/src/datasource/datasource.config.ts:25-28` |

---

## 파일 변경 요약

| # | Action | File | Description |
|---|--------|------|-------------|
| 1 | CREATE | `.dockerignore` | Docker 빌드 컨텍스트 제외 규칙 |
| 2 | CREATE | `apps/backend/Dockerfile` | 5-stage 멀티스테이지 빌드 (빌드 시 DB 초기화) |
| 3 | CREATE | `apps/frontend-next/Dockerfile` | 4-stage 멀티스테이지 빌드 |
| 4 | CREATE | `apps/backend/docker-entrypoint.sh` | 템플릿 DB 복사 + config 기본값 |
| 5 | CREATE | `docker-compose.yml` | 서비스 오케스트레이션 |
| 6 | CREATE | `secrets/.gitkeep` | GCP 인증 파일 디렉토리 |
| 7 | MODIFY | `.gitignore` | `secrets/` 패턴 추가 |

**Total: 6 CREATE + 1 MODIFY**

---

## TODO 1: `.dockerignore`

**File:** `.dockerignore`

```
node_modules
**/node_modules
.git
*.md
!packages/shared-types/**/*.md

# Environment and secrets
.env
.env.*
**/.env
**/.env.*
**/service-account.json

# Build outputs
dist
**/dist
.next
**/.next

# Database files
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

# Docker files
Dockerfile*
docker-compose*

# Misc
.omc
.claude
screenshots
```

**주의:** `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `package.json`, `.npmrc`, `prisma/`, `config/`는 제외 금지

---

## TODO 2: Backend Dockerfile

**File:** `apps/backend/Dockerfile`

### 핵심 설계: 빌드 시점 DB 초기화

**문제 (Critic 2차 발견):**
- `prisma` CLI = devDependency → 프로덕션 이미지에 없음
- `prisma.config.ts`가 `import "dotenv/config"` → dotenv도 devDep
- seed 컴파일 시 `require("../src/generated/prisma")` 경로가 깨짐
- `npx --yes prisma`는 인터넷 필요 → 내부 SSH 호스트에서 실패 가능

**해결:** 모든 DB 초기화를 Stage 3(빌드)에서 수행. devDep이 모두 사용 가능한 환경.

```dockerfile
# ============================================================
# Stage 1: Base - Node.js + pnpm (full bookworm for native compilation)
# ============================================================
FROM node:22-bookworm AS base
RUN corepack enable && corepack prepare pnpm@9.15.1 --activate
WORKDIR /app

# ============================================================
# Stage 2: Dependencies
# ============================================================
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/backend/package.json ./apps/backend/
RUN pnpm install --frozen-lockfile

# ============================================================
# Stage 3: Build + Template DB 생성
# ============================================================
FROM deps AS build

# 1) shared-types 빌드
COPY packages/shared-types/ ./packages/shared-types/
RUN pnpm --filter @ola/shared-types build

# 2) backend 소스 전체 복사
COPY apps/backend/ ./apps/backend/

# 3) Prisma client 생성
RUN cd apps/backend && pnpm prisma:generate

# 4) NestJS 빌드
RUN pnpm --filter backend build

# 5) 템플릿 DB 생성 (빌드 시점 - devDep 사용 가능)
#    prisma.config.ts가 dotenv/config를 import하므로 빌드 단계에서만 실행 가능
ENV DATABASE_URL=file:./prisma/template.db
RUN cd apps/backend && npx prisma db push --skip-generate

# 6) 시드 데이터 (ADMIN_SEED_PASSWORD 제공 시)
ARG ADMIN_SEED_PASSWORD
RUN cd apps/backend && \
    if [ -n "$ADMIN_SEED_PASSWORD" ]; then \
      echo "Seeding template DB..." && \
      ADMIN_SEED_PASSWORD=$ADMIN_SEED_PASSWORD \
      DATABASE_URL=file:./prisma/template.db \
      npx ts-node prisma/seed.ts && \
      echo "Template DB seeded successfully."; \
    else \
      echo "ADMIN_SEED_PASSWORD not provided - template DB has schema only."; \
    fi

# ============================================================
# Stage 4: Production dependencies only (clean install from base)
# ============================================================
FROM base AS prod-deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/backend/package.json ./apps/backend/
RUN pnpm install --frozen-lockfile --prod

# ============================================================
# Stage 5: Runner - 최소 프로덕션 이미지
# ============================================================
FROM node:22-bookworm-slim AS runner

# Playwright Chromium 시스템 의존성
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libdrm2 libdbus-1-3 libxkbcommon0 libxcomposite1 libxdamage1 \
    libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 \
    libasound2 libatspi2.0-0 libwayland-client0 fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nestjs

WORKDIR /app

# Production node_modules
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=prod-deps /app/packages/shared-types/ ./packages/shared-types/

# 빌드된 앱
COPY --from=build /app/apps/backend/dist ./apps/backend/dist

# 템플릿 DB (첫 실행 시 data 볼륨으로 복사됨)
COPY --from=build /app/apps/backend/prisma/template.db ./apps/backend/data-template/admin.db

# Config 파일 기본값
COPY --from=build /app/apps/backend/config/ ./apps/backend/config-defaults/

# Entrypoint
COPY apps/backend/docker-entrypoint.sh ./apps/backend/docker-entrypoint.sh
RUN chmod +x ./apps/backend/docker-entrypoint.sh

# Playwright 브라우저 (non-root 접근 가능 경로)
ENV PLAYWRIGHT_BROWSERS_PATH=/app/apps/backend/.playwright-browsers
RUN cd apps/backend && npx playwright install chromium

# 데이터 디렉토리 + 권한
RUN mkdir -p /app/apps/backend/data/db \
             /app/apps/backend/data/config \
    && chown -R nestjs:nodejs /app/apps/backend/data \
    && chown -R nestjs:nodejs /app/apps/backend/data-template \
    && chown -R nestjs:nodejs /app/apps/backend/.playwright-browsers

ENV NODE_ENV=production
ENV PORT=3000

USER nestjs
WORKDIR /app/apps/backend
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "fetch('http://localhost:3000/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main"]
```

### 설계 근거

| 변경 | 이유 |
|------|------|
| `prisma db push` → Stage 3으로 이동 | `prisma` CLI = devDep, 프로덕션에서 실행 불가 |
| `ts-node prisma/seed.ts` → Stage 3으로 이동 | `ts-node`, `dotenv` = devDep |
| seed 컴파일 제거 | 빌드 시점에 ts-node으로 직접 실행 (경로 깨짐 문제 근본 해결) |
| template.db COPY | 프로덕션 이미지에 사전 빌드된 DB 포함 |
| `src/generated/` COPY 제거 | seed가 빌드 시점에 실행되므로 런타임에 불필요 |

---

## TODO 3: Frontend Dockerfile

**File:** `apps/frontend-next/Dockerfile`

```dockerfile
FROM node:22-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@9.15.1 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/frontend-next/package.json ./apps/frontend-next/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY packages/shared-types/ ./packages/shared-types/
RUN pnpm --filter @ola/shared-types build

COPY apps/frontend-next/ ./apps/frontend-next/

ARG NEXT_PUBLIC_API_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN pnpm --filter frontend-next build

FROM node:22-bookworm-slim AS runner
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

WORKDIR /app

COPY --from=build /app/apps/frontend-next/.next/standalone ./
COPY --from=build /app/apps/frontend-next/.next/static ./apps/frontend-next/.next/static
COPY --from=build /app/apps/frontend-next/public ./apps/frontend-next/public

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

USER nextjs
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://localhost:3001').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

CMD ["node", "apps/frontend-next/server.js"]
```

- native 모듈 없음 → `bookworm-slim` 전 스테이지
- `NEXT_PUBLIC_API_URL`은 빌드 시점 인라인 → 배포 환경별 build-arg
- `HOSTNAME=0.0.0.0` 필수

---

## TODO 4: Entrypoint Script (간소화)

**File:** `apps/backend/docker-entrypoint.sh`

런타임에 prisma/seed 실행 없음 → 템플릿 DB 복사만 수행

```bash
#!/bin/sh
set -e

echo "=== OLA B2B Monitoring - Backend Startup ==="

# --- DATABASE_URL 검증 ---
if [ -z "$DATABASE_URL" ]; then
  echo "FATAL: DATABASE_URL environment variable is required"
  exit 1
fi

# --- Config 기본값 복사 (최초 실행 시) ---
if [ -d "config-defaults" ]; then
    cp -n config-defaults/ui-checks.json data/config/ui-checks.json 2>/dev/null || true
fi

# --- 템플릿 DB 복사 (최초 실행 시) ---
DB_PATH="./data/db/admin.db"
if [ ! -f "$DB_PATH" ]; then
    if [ -f "data-template/admin.db" ]; then
        echo "First run: copying template database..."
        cp data-template/admin.db "$DB_PATH"
        echo "Database ready."
    else
        echo "WARNING: No template DB found. Application may fail."
    fi
else
    echo "Database exists. Skipping copy."
fi

echo "=== Starting application ==="
exec "$@"
```

### 런타임 초기화 vs 빌드 시점 초기화

| Before (런타임 초기화) | After (빌드 시점 초기화) |
|----------------------|------------------------|
| `npx --yes prisma db push` (인터넷 필요, devDep) | `cp data-template/admin.db` (즉시, 오프라인) |
| `node prisma/compiled-seed/seed.js` (경로 깨짐) | 빌드 시점에 완료 |
| ~10초 첫 실행 지연 | 밀리초 단위 복사 |

---

## TODO 5: docker-compose.yml

**File:** `docker-compose.yml`

```yaml
services:
  backend:
    build:
      context: .
      dockerfile: apps/backend/Dockerfile
      args:
        ADMIN_SEED_PASSWORD: ${ADMIN_SEED_PASSWORD:-}
    container_name: ola-backend
    restart: unless-stopped
    ports:
      - "${BACKEND_PORT:-3000}:3000"
    env_file:
      - ./apps/backend/.env
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:./data/db/admin.db
      - UI_CHECKS_CONFIG_PATH=./data/config/ui-checks.json
      - DATASOURCES_CONFIG_PATH=./config-defaults/datasources.config.json
      - GOOGLE_APPLICATION_CREDENTIALS=/app/apps/backend/service-account.json
    volumes:
      - backend-data:/app/apps/backend/data
      - ./secrets/service-account.json:/app/apps/backend/service-account.json:ro
      - backend-screenshots:/app/apps/backend/screenshots
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:3000/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"]
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
        NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://localhost:3000}
    container_name: ola-frontend
    restart: unless-stopped
    ports:
      - "${FRONTEND_PORT:-3001}:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - HOSTNAME=0.0.0.0
    depends_on:
      backend:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:3001').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"]
      interval: 30s
      timeout: 10s
      start_period: 20s
      retries: 3
    networks:
      - ola-network

volumes:
  backend-data:
    driver: local
  backend-screenshots:
    driver: local

networks:
  ola-network:
    driver: bridge
```

### 핵심 설계

1. **`env_file: ./apps/backend/.env`** — 사용자 요청: 기존 `.env` 직접 참조
2. **`environment` 블록** — Docker 전용 오버라이드 (env_file보다 우선)
3. **`ADMIN_SEED_PASSWORD`** — 빌드 인자로 전달 (Stage 3에서 seed 실행)
4. **Named volume `backend-data`** — DB + config 영속화
5. **GCP credentials** — `secrets/` read-only 바인드 마운트

---

## TODO 6: secrets 디렉토리 + .gitignore

1. `secrets/.gitkeep` 생성
2. `.gitignore`에 `secrets/` 추가

---

## 배포 가이드

```bash
# 1. GCP 인증 파일 배치
mkdir -p secrets
cp /path/to/service-account.json secrets/

# 2. backend .env 확인
# apps/backend/.env에 필수 값 확인:
#   GCP_PROJECT_ID, BIGQUERY_DATASET, JWT_SECRET, CORS_ORIGIN 등

# 3. 빌드 (첫 배포 시 ADMIN_SEED_PASSWORD 설정)
ADMIN_SEED_PASSWORD=your-secure-password docker compose build

# 4. 시작
docker compose up -d

# 5. 확인
curl http://localhost:3000/health   # {"status":"ok",...}
curl http://localhost:3001           # Frontend HTML

# 6. SSH 호스트 배포 시 (API URL 변경)
NEXT_PUBLIC_API_URL=http://your-server:3000 \
ADMIN_SEED_PASSWORD=admin123 \
docker compose build
docker compose up -d

# 7. 이후 재빌드 (seed 불필요)
docker compose build   # ADMIN_SEED_PASSWORD 없이 빌드해도 기존 DB 유지 (볼륨)
```

---

## Verification

1. `docker compose build` 에러 없이 완료
2. `docker compose up -d` 후 두 서비스 모두 healthy 상태
3. `curl localhost:3000/health` → `{"status":"ok"}`
4. `curl localhost:3001` → Frontend HTML
5. 브라우저에서 대시보드 로드, API 통신 정상
6. `docker compose down && docker compose up -d` → DB/config 유지
7. `docker exec ola-backend ls -la data/db/` → `admin.db` 존재

## 예상 이미지 크기

| Image | Size | Reason |
|-------|------|--------|
| Backend | ~800MB-1.2GB | Playwright Chromium 포함 |
| Frontend | ~150-200MB | Standalone 출력 |
