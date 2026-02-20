# Stage 1: Base
FROM node:22-bookworm AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.1 --activate

# Stage 2: Dependencies
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Stage 3: Build
FROM deps AS build
WORKDIR /app
COPY packages/shared-types/ ./packages/shared-types/
COPY apps/backend/ ./apps/backend/
RUN pnpm --filter @ola/shared-types build
RUN pnpm --filter backend build
# Prisma generate
RUN cd apps/backend && npx prisma generate
# Template DB 생성
ARG ADMIN_SEED_PASSWORD=admin123
RUN cd apps/backend && DATABASE_URL="file:./prisma/template.db" npx prisma db push
RUN cd apps/backend && DATABASE_URL="file:./prisma/template.db" ADMIN_SEED_PASSWORD=${ADMIN_SEED_PASSWORD} npx ts-node prisma/seed.ts
# Playwright Chromium 설치 (Critical fix: C4)
ENV PLAYWRIGHT_BROWSERS_PATH=/app/apps/backend/.playwright-browsers
RUN cd apps/backend && npx playwright install chromium

# Stage 4: Production Dependencies
FROM base AS prod-deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prod

# Stage 5: Runner
FROM node:22-bookworm-slim AS runner
# Playwright 시스템 라이브러리
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libdbus-1-3 libxkbcommon0 libatspi2.0-0 libgbm1 libpango-1.0-0 \
    libcairo2 libasound2 libxrandr2 libxdamage1 libxcomposite1 libxfixes3 \
    fonts-noto-cjk ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --gid 1001 nodejs && useradd --uid 1001 --gid nodejs nestjs

# WORKDIR 명시 (Critical fix: H4) - 모든 상대 경로의 기준
WORKDIR /app/apps/backend

# Production dependencies
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=prod-deps /app/apps/backend/node_modules ./node_modules
COPY --from=prod-deps /app/packages/shared-types /app/packages/shared-types
COPY --from=build /app/packages/shared-types/dist /app/packages/shared-types/dist

# Build artifacts
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/apps/backend/src/generated ./src/generated

# Template DB & config defaults
COPY --from=build /app/apps/backend/prisma/template.db ./data-template/admin.db
COPY --from=build /app/apps/backend/config/ ./config-defaults/

# Playwright browsers (Critical fix: C4)
COPY --from=build /app/apps/backend/.playwright-browsers ./.playwright-browsers
ENV PLAYWRIGHT_BROWSERS_PATH=/app/apps/backend/.playwright-browsers

# Entrypoint
COPY apps/backend/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# 디렉토리 소유권
RUN mkdir -p ./data/db ./data/config ./data/screenshots && \
    chown -R nestjs:nodejs ./data ./data-template

USER nestjs
EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
