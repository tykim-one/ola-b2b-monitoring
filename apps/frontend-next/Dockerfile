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
