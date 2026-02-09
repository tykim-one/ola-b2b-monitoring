# Code Review Report - 2026-02-09

**Branch:** dev
**Scope:** Full project review (327 TypeScript files)
**Reviewers:** Security Agent (Opus) + Backend Quality Agent (Opus) + Frontend Quality Agent (Opus)
**Verdict:** REQUEST CHANGES

---

## Summary

| Area | CRITICAL | HIGH | MEDIUM | LOW | Total |
|------|----------|------|--------|-----|-------|
| Security | 4 | 7 | 6 | 4 | 21 |
| Backend Quality | 3 | 8 | 11 | 6 | 28 |
| Frontend Quality | 2 | 8 | 12 | 6 | 28 |
| **Total (deduplicated)** | **6** | **15** | **20** | **12** | **53** |

---

## Remediation Roadmap

### Phase 1: Day 1 - Critical Security (MUST FIX)

| # | Issue | File(s) | Fix |
|---|-------|---------|-----|
| C1 | Unauthenticated arbitrary SQL endpoint | `metrics.controller.ts:35,47-58` | Remove `@Public()` from `POST /query`, add `@Permissions('admin:query')` |
| C2 | JWT secret hardcoded fallback | `jwt.strategy.ts:30-32` | Throw error if `JWT_SECRET` not set |
| C3 | Default admin `admin123` password | `prisma/seed.ts:230-258` | Require `ADMIN_SEED_PASSWORD` env var |

### Phase 2: Week 1 - Security Hardening

| # | Issue | File(s) | Fix |
|---|-------|---------|-----|
| H1 | SQL Injection - BigQuery string interpolation | `metrics.queries.ts` (10+ locations), `session-analysis.service.ts:262`, `faq-analysis.service.ts:130`, `user-profiling.service.ts:421` | Convert to BigQuery parameterized queries (`@param` syntax) |
| H2 | `@Public()` on sensitive endpoints | `user-profiling.controller.ts`, `problematic-chat.controller.ts`, `metrics.controller.ts`, `report-monitoring.controller.ts`, ETL controllers | Remove `@Public()`, require JWT auth |
| H3 | No security headers (Helmet) | `main.ts` | `pnpm add helmet` + `app.use(helmet())` |
| H4 | Swagger exposed in production | `main.ts:34-41` | Wrap in `NODE_ENV !== 'production'` check |
| H5 | CORS wildcard + credentials | `main.ts:14-22` | Remove `origin: true` with `credentials: true`, use explicit origins |
| H6 | LLM prompt injection | `batch-analysis.service.ts:859`, `session-analysis.service.ts:199`, `chatbot.service.ts:370` | Wrap user data in `<USER_DATA>` tags with system instructions |
| H7 | Missing `@Permissions()` on admin endpoints | `session-analysis.controller.ts`, `batch-analysis.controller.ts`, `faq-analysis.controller.ts` | Add `@Permissions('admin:read')` |
| H8 | `executeRawQuery` accepts untrusted SQL | `bigquery-metrics.datasource.ts:565-572` | Use parameterized queries |
| H9 | Frontend: `chatbotQualityService` uses raw `fetch()` | `chatbotQualityService.ts` | Refactor to use `apiClient` |
| H10 | Frontend: Token refresh race condition | `api-client.ts:94-104` | Implement promise-based mutex pattern |

### Phase 3: Week 2 - Backend Quality

| # | Issue | File(s) | Fix |
|---|-------|---------|-----|
| M1 | Timezone violations (`DATE(timestamp)` without TZ) | `user-profiling.service.ts:421`, `external-db.service.ts:449` | Add `'Asia/Seoul'` timezone |
| M2 | 4 services bypass DataSource pattern | `batch-analysis`, `session-analysis`, `faq-analysis`, `user-profiling` services | Inject shared `MetricsDataSource` or `BigQueryClientProvider` |
| M3 | `batch-analysis.service.ts` 1405-line God Object | `batch-analysis.service.ts` | Split into `BatchJobService`, `BatchExecutionService`, `BatchResultService`, `BatchScheduleService` |
| M4 | Unused rate limiting variable (Slack flood) | `batch-analysis.service.ts:621,689` | Add `if (lowQualityAlertCount < 5)` check |
| M5 | Duplicated frustration regex (6 locations) | `metrics.queries.ts`, `session-analysis.service.ts:304` | Extract `FRUSTRATION_KEYWORDS` constant |
| M6 | N+1 query in `listJobs` | `batch-analysis.service.ts:395-427` | Single grouped aggregate query |
| M7 | Chatbot in-memory sessions unbounded | `chatbot.service.ts:63` | Add TTL, max limit, cleanup interval |
| M8 | Synchronous file I/O in UiCheck | `ui-check.service.ts:253,276,400` | Use `fs.promises.*` async methods |
| M9 | `any` type usage (50+ instances) | Multiple services | Define proper interfaces |
| M10 | `admin.db` tracked in git | `prisma/admin.db` | Add `*.db` to `.gitignore`, `git rm --cached` |
| M11 | No expired token cleanup scheduler | `auth.service.ts:290-297` | Add `@Cron('0 0 * * *')` job |
| M12 | Hardcoded IP `192.168.1.42` | `main.ts:19,45-48` | Use `localhost` or env var |

### Phase 4: Week 2-3 - Frontend Quality

| # | Issue | File(s) | Fix |
|---|-------|---------|-----|
| F1 | Recharts SSR not disabled (14 files) | ETL pages, services status, batch-analysis, Dashboard.tsx | Use `next/dynamic({ ssr: false })` |
| F2 | `useEffect` infinite loop risk | `batch-analysis/[id]/page.tsx:100-109` | Memoize `filters`, separate fetch from polling |
| F3 | AuthContext/ChatbotContext missing `useMemo` | `AuthContext.tsx:93-100`, `ChatbotContext.tsx:104-116` | Wrap `value` with `useMemo` |
| F4 | Zustand selectors missing `useShallow` | `ui-store.ts:49-53` | Use `useShallow` from `zustand/react/shallow` |
| F5 | Hardcoded `PROJECT_ID = 'ibks'` (7 files) | `user-analytics`, `chatbot-quality`, `operations`, etc. | Extract to shared config or `useServiceContext()` |
| F6 | Giant page components (800-1099 lines) | `problematic-rules`, `ui-check`, `batch-analysis/[id]`, `services/status` | Extract sub-components to adjacent `components/` dirs |
| F7 | No `AbortController` usage | All `useEffect`-based fetching pages | Add signal to axios, abort in cleanup |
| F8 | Mixed data fetching (useEffect vs React Query) | Admin pages | Migrate to React Query hooks |
| F9 | `console.log` in production | `batchAnalysisService.ts:291` | Remove |
| F10 | `catch (err: any)` pattern (30+ instances) | Multiple files | Use `unknown` + type narrowing |
| F11 | Duplicated `formatDateTime` helper | 4 files | Consolidate to `lib/formatters.ts` |
| F12 | `html lang="en"` for Korean UI | `layout.tsx:28` | Change to `lang="ko"` |

### Phase 5: Month 1 - Polish

| # | Issue | Fix |
|---|-------|-----|
| P1 | Only 2 test files for 169 backend files | Prioritize AuthService, BatchAnalysis, ProblematicChat tests |
| P2 | `metrics.queries.ts` 1035 lines | Split by domain |
| P3 | `metrics.controller.ts` 821 lines repetitive | Add response wrapper interceptor |
| P4 | No ARIA labels (accessibility) | Add `aria-label` to icon-only buttons |
| P5 | All 49 pages `'use client'` | Evaluate Server Components for data-heavy pages |
| P6 | `alert()` for error feedback | Implement toast notification system |
| P7 | `getDailyTraffic` ignores `days` param | Pass `days` to query |
| P8 | No `@MaxLength` on chatbot messages | Add `@MaxLength(5000)` to DTO |
| P9 | Login rate limiting too loose | Add `@Throttle({ default: { limit: 5, ttl: 60000 } })` |
| P10 | Refresh token not bound to IP/UA | Store and validate client fingerprint |

---

## Positive Findings

These patterns are well-implemented and should be preserved:

1. **Three-Layer DataSource Pattern** (Controller -> Service -> DataSource) in MetricsService
2. **CacheService** with SHORT/MEDIUM/LONG TTL tiers, consistently applied
3. **AuthService security fundamentals** - bcrypt, account lockout, refresh token rotation/revocation
4. **ProblematicChatService** - dynamic SQL with field/operator whitelist
5. **ExternalDbService** - parameterized queries for MySQL/PostgreSQL
6. **BigQuery DATE normalization** via `normalizeDate()` helper
7. **Global ValidationPipe** with `whitelist: true` + `forbidNonWhitelisted: true`
8. **Compound Component pattern** (Dashboard, DataTable, Chart) with context isolation
9. **React Query configuration** with tiered cache times matching backend TTLs
10. **Shared types** via `@ola/shared-types` for cross-workspace type safety
11. **Token refresh queue** in `api-client.ts` for concurrent 401 handling
12. **Middleware** auth redirect with login loop prevention

---

## File Reference Quick Lookup

### Backend Files Requiring Changes

```
apps/backend/src/
├── main.ts                                    # H3, H4, H5, M12
├── admin/auth/
│   ├── strategies/jwt.strategy.ts             # C2
│   ├── auth.service.ts                        # M11
│   └── auth.controller.ts                     # P9
├── metrics/
│   ├── metrics.controller.ts                  # C1, H2
│   └── queries/metrics.queries.ts             # H1 (10+ locations)
├── datasource/implementations/
│   └── bigquery-metrics.datasource.ts         # H8, P7
├── batch-analysis/batch-analysis.service.ts   # H6, M2, M3, M4, M6
├── session-analysis/session-analysis.service.ts # H1, H6, M2, M5
├── faq-analysis/faq-analysis.service.ts       # H1, M2
├── user-profiling/
│   ├── user-profiling.controller.ts           # H2
│   └── user-profiling.service.ts              # H1, M1, M2
├── problematic-chat/problematic-chat.controller.ts # H2
├── chatbot/chatbot.service.ts                 # H6, M7, P8
├── report-monitoring/
│   ├── report-monitoring.controller.ts        # H2
│   ├── external-db.service.ts                 # M1
│   └── ui-check.service.ts                    # M8
├── wind-etl/wind-etl.controller.ts            # H2
├── minkabu-etl/minkabu-etl.controller.ts      # H2
└── prisma/seed.ts                             # C3
```

### Frontend Files Requiring Changes

```
apps/frontend-next/src/
├── app/layout.tsx                             # F12
├── lib/api-client.ts                          # H10
├── services/
│   ├── chatbotQualityService.ts               # H9
│   └── batchAnalysisService.ts                # F9
├── contexts/
│   ├── AuthContext.tsx                         # F3
│   └── ChatbotContext.tsx                      # F3
├── stores/ui-store.ts                         # F4
├── app/dashboard/
│   ├── etl/wind/page.tsx                      # F1
│   ├── etl/minkabu/page.tsx                   # F1
│   ├── admin/batch-analysis/[id]/page.tsx     # F2, F6, F8
│   ├── admin/problematic-rules/page.tsx       # F6, F8
│   ├── user-analytics/page.tsx                # F5
│   ├── chatbot-quality/page.tsx               # F5
│   ├── operations/page.tsx                    # F5
│   └── ui-check/page.tsx                      # F6
└── components/Dashboard.tsx                   # F1
```

---

## How to Use This Document

1. **Start each session** by reading this file for context
2. **Pick a Phase** from the Roadmap above
3. **Check off completed items** by changing `|` to `| DONE |` in the Fix column
4. **Update MEMORY.md** after completing each phase

### Suggested Session Plan

- **Session 1:** Phase 1 (Day 1 Critical) + Phase 2 top 3 items (H1-H3)
- **Session 2:** Phase 2 remaining (H4-H10) + Phase 3 top 5 (M1-M5)
- **Session 3:** Phase 3 remaining (M6-M12) + Phase 4 (F1-F6)
- **Session 4:** Phase 4 remaining (F7-F12) + Phase 5 (P1-P10)
