# Stage 1: Base
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.1 --activate

# Stage 2: Dependencies
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/frontend-next/package.json ./apps/frontend-next/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Stage 3: Build
FROM deps AS build
WORKDIR /app
COPY packages/shared-types/ ./packages/shared-types/
COPY apps/frontend-next/ ./apps/frontend-next/
RUN pnpm --filter @ola/shared-types build
# K8s 환경: Next.js rewrites가 INTERNAL_API_URL로 서버사이드 프록시
# NEXT_PUBLIC_API_URL은 빈 문자열 → 브라우저에서 상대경로(/api/*) 사용
ENV NEXT_PUBLIC_API_URL=""
ENV INTERNAL_API_URL="http://backend-svc:3000"
RUN pnpm --filter frontend-next build

# Stage 4: Runner
FROM node:22-bookworm-slim AS runner
RUN groupadd --gid 1001 nodejs && useradd --uid 1001 --gid nodejs nextjs

WORKDIR /app

# standalone output 복사 (Critical fix: C1 - server.js는 standalone 루트에 위치)
COPY --from=build /app/apps/frontend-next/.next/standalone ./
# static 파일 복사 (Critical fix: C5 - 클라이언트 JS에도 sed 치환 적용되어야 함)
COPY --from=build /app/apps/frontend-next/.next/static ./apps/frontend-next/.next/static
# public 파일 복사
COPY --from=build /app/apps/frontend-next/public ./apps/frontend-next/public

# Entrypoint
COPY apps/frontend-next/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

RUN chown -R nextjs:nodejs /app
USER nextjs

ENV PORT=3001
ENV HOSTNAME=0.0.0.0
EXPOSE 3001

ENTRYPOINT ["./docker-entrypoint.sh"]
