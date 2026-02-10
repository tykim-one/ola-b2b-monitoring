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
RUN cd apps/backend && npx prisma db push

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
COPY --from=build /app/packages/shared-types/ ./packages/shared-types/

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
