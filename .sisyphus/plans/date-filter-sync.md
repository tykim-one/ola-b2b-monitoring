# 기간 필터 FE/BE 싱크 수정 및 개선

## TL;DR

> **Quick Summary**: FE/BE 기간 필터 감사에서 발견된 3건의 불일치(cost-trend/heatmap의 days 파라미터 무시, 기본값 불통일, 시간 선택 미지원)를 수정하고 DateRangeFilter에 시간 선택 기능을 추가한다.
> 
> **Deliverables**:
> - BE cost-trend/heatmap 엔드포인트에 `days` 쿼리 파라미터 지원 추가
> - 모든 대시보드 기본 기간값 7일 통일 (FE page state + BE fallback defaults)
> - DateRangeFilter 커스텀 기간 선택 시 시간(HH:mm) 설정 기능 (KST 기준)
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 2 waves (Task A 독립, Task B+C는 A 이후 병렬)
> **Critical Path**: Task A → (Task B ∥ Task C)

---

## Context

### Original Request
사용자가 요청: "대시보드별 기간필터의 FE/BE 싱크 점검 후, 기본 기간값 7일 통일, 커스텀 기간 선택 시 시간도 설정할 수 있도록 개선. 시간은 아시아/서울(KST) 기준."

### Interview Summary
**Key Discussions**:
- 40+ 파일 전수 감사 완료 — 모든 FE hooks, services, pages, BE controllers, DTOs, datasource 읽기
- 3건의 불일치 발견: cost-trend days 무시, heatmap days 무시, 기본값 불통일(1/7/30 혼재)
- 대부분의 엔드포인트(metrics/realtime, hourly, daily, tenant-usage, errors, token-efficiency 등)는 정상 싱크

**Research Findings**:
- FE `useCostTrend(projectId, days)` / `useHeatmap(projectId, days)` 는 이미 `?days=${days}` 전송 중이지만 BE가 무시
- BE SQL에 `INTERVAL 30 DAY` 하드코딩 (metrics.queries.ts line 197, 103)
- `clampDays` 헬퍼 함수 존재 (controller:25-32) — 패턴 재사용 가능
- DateRangeFilter는 vanilla JS Date 사용, `toISOString().split('T')[0]`로 날짜 포맷 (UTC 기반 — KST 자정 문제 있음)

### Metis Review
**Identified Gaps** (addressed):
- operations(1일)/services/ai-performance(1일) → 실시간 모니터링 의도 가능. **기본값 7일로 통일** (사용자 명시적 요청)
- `use-metrics.ts`, `use-dashboard.ts`, `use-quality.ts` hook의 fallback 기본값(30) → page에서 항상 명시적으로 넘기므로 실제 미사용. **hook 기본값도 7로 통일** (코드 일관성)
- BE controller `clampDays` 기본값 → **7로 통일** (FE-BE 일관성)
- `formatDate`의 `toISOString()` UTC 문제 → Task C에서 KST 기반 포맷으로 수정
- Task C 시간 선택은 **커스텀 모드에서만** (프리셋은 시간 불필요)
- Task C 시간 데이터는 FE에서만 사용 (BE API 변경 없음, `days` 파라미터 유지)

---

## Work Objectives

### Core Objective
FE/BE 기간 필터의 완전한 동기화를 달성하고, 사용자가 커스텀 기간 선택 시 시간(HH:mm)까지 지정할 수 있도록 DateRangeFilter를 확장한다.

### Concrete Deliverables
- BE `getCostTrend(days)`, `getUsageHeatmap(days)` 엔드포인트 수정 (interface → BQ impl → service → controller)
- FE 6개 대시보드 페이지의 기본값 7일 통일 + BE 기본값 통일
- `DateRangeFilter.tsx`에 커스텀 모드 시간 선택 UI + KST 기반 날짜 포맷

### Definition of Done
- [x] `curl /api/analytics/cost-trend?days=7` → days가 반영된 결과 반환
- [x] `curl /api/analytics/heatmap?days=7` → days가 반영된 결과 반환
- [x] `grep "days: 30"` 결과가 대상 파일에서 0건
- [x] `grep 'defaultPreset="month"'` 결과가 대상 페이지에서 0건
- [x] DateRangeFilter 커스텀 모드에서 시간 입력 필드 표시
- [x] `npx tsc --noEmit` BE/FE 모두 0 errors

### Must Have
- cost-trend/heatmap BE가 `?days=N` 파라미터를 수용하고 SQL에 반영
- 모든 대시보드 기본값 7일 (FE state + FE hook defaults + BE defaults)
- 커스텀 기간 선택 시 시간(시:분) 설정 가능
- KST (UTC+9) 기준 날짜/시간 처리
- 기존 API 하위 호환성 유지 (days 미전달 시 기본값 동작)

### Must NOT Have (Guardrails)
- ❌ 외부 날짜 라이브러리 추가 (date-fns, dayjs, luxon 등 금지 — vanilla JS 유지)
- ❌ BE API에 `startDate`/`endDate` 새 파라미터 추가 (별도 스코프)
- ❌ `queryPatterns` 엔드포인트 수정 (scope 외)
- ❌ 프리셋 버튼 동작 변경 (시간 선택은 커스텀 모드에서만)
- ❌ 기존 `DateRange` 인터페이스 필드 삭제/변경 (확장만 허용)
- ❌ BigQuery SQL에서 KST 변환 로직 변경 (이미 `DATE(timestamp, 'Asia/Seoul')` 사용 중)
- ❌ 프리셋 모드에서 시간 입력 UI 표시

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.
> **ALL verification is executed by the agent** using tools (Playwright, Bash, curl, etc.). No exceptions.

### Test Decision
- **Infrastructure exists**: YES (backend: jest, frontend: next build + tsc)
- **Automated tests**: NO (이번 스코프에서 유닛 테스트 추가 없음)
- **Framework**: N/A
- **Agent-Executed QA**: ALWAYS (primary verification method)

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

> 유닛 테스트 미작성이므로 QA 시나리오가 PRIMARY verification method.
> TypeScript 컴파일 + curl 검증 + Playwright UI 검증 + grep 정적 분석으로 구성.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
└── Task 1: BE cost-trend/heatmap days 파라미터 추가 (no dependencies)

Wave 2 (After Wave 1):
├── Task 2: FE/BE 기본값 7일 통일 (depends: 1 for full sync verification)
└── Task 3: DateRangeFilter 시간 선택 기능 추가 (depends: 1 for formatDate KST fix context)

Wave 3 (After Wave 2):
└── Task 4: 전체 통합 검증 (depends: 2, 3)
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3 | None |
| 2 | 1 | 4 | 3 |
| 3 | 1 | 4 | 2 |
| 4 | 2, 3 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | Task 1 (BE) | task(category="unspecified-high", load_skills=[], run_in_background=false) |
| 2 | Task 2 (FE/BE defaults), Task 3 (FE DateRangeFilter) | dispatch parallel after Wave 1 completes |
| 3 | Task 4 (integration verify) | task(category="quick", load_skills=["playwright"], run_in_background=false) |

---

## TODOs

### - [x] 1. BE: cost-trend/heatmap 엔드포인트에 `days` 파라미터 지원 추가

  **What to do**:
  
  **Step 1: SQL 쿼리 수정** (`apps/backend/src/metrics/queries/metrics.queries.ts`)
  - `costTrend` 쿼리 (line ~197): `INTERVAL 30 DAY` → `INTERVAL @days DAY` (parameterized)
  - `usageHeatmap` 쿼리 (line ~103): `INTERVAL 30 DAY` → `INTERVAL @days DAY` (parameterized)
  - 쿼리 함수가 `days` 파라미터를 받도록 시그니처 변경 (기존 패턴 참조: `errorAnalysis` 쿼리가 `days` 사용)
  
  **Step 2: 인터페이스 수정** (`apps/backend/src/datasource/interfaces/metrics-datasource.interface.ts`)
  - `getCostTrend(): Promise<CostTrend[]>` → `getCostTrend(days?: number): Promise<CostTrend[]>` (line ~110)
  - `getUsageHeatmap(): Promise<UsageHeatmapCell[]>` → `getUsageHeatmap(days?: number): Promise<UsageHeatmapCell[]>` (line ~84)
  
  **Step 3: BigQuery 구현체 수정** (`apps/backend/src/datasource/implementations/bigquery-metrics.datasource.ts`)
  - `getCostTrend()` 메서드 (line ~312): `days` 파라미터 받아서 SQL params에 전달
  - `getUsageHeatmap()` 메서드 (line ~278): 동일 처리
  - `inputPricePerMillion`, `outputPricePerMillion` 기존 파라미터 유지
  
  **Step 4: 서비스 수정** (`apps/backend/src/metrics/metrics.service.ts`)
  - `getCostTrend()` → `getCostTrend(days: number = 7)` (line ~289)
  - `getUsageHeatmap()` → `getUsageHeatmap(days: number = 7)` (line ~225)
  - 캐시 키에 days 포함: `this.cacheService.generateKey('metrics', 'cost', 'trend', days)` 패턴
  
  **Step 5: 컨트롤러 수정** (`apps/backend/src/metrics/metrics.controller.ts`)
  - `getCostTrend()` 메서드 (line ~248):
    - `@Query('days') days?: string` 파라미터 추가
    - `const parsedDays = clampDays(days, 7, 90);`
    - `this.metricsService.getCostTrend(parsedDays)` 호출
  - `getUsageHeatmap()` 메서드 (line ~229): 동일 패턴
  - `@ApiQuery({ name: 'days', required: false })` 데코레이터 추가

  **Must NOT do**:
  - `queryPatterns` 엔드포인트 수정 (scope 외)
  - `costTrend` SQL의 `inputPricePerMillion`/`outputPricePerMillion` 파라미터 변경
  - 다른 엔드포인트의 기본값 변경 (Task 2에서 처리)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: BE 4개 레이어(SQL→interface→impl→service→controller) 수정으로 정확한 타입 체인 필요
  - **Skills**: []
    - LSP 도구는 에이전트에 기본 내장

  **Parallelization**:
  - **Can Run In Parallel**: NO (Wave 1 단독)
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 2, Task 3
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL - Be Exhaustive):

  **Pattern References** (기존 코드 따르기):
  - `apps/backend/src/metrics/queries/metrics.queries.ts` — `errorAnalysis` 쿼리가 `INTERVAL @days DAY` 패턴 사용 (참조 모범). `costTrend` (line ~197)과 `usageHeatmap` (line ~103)의 `INTERVAL 30 DAY`를 이 패턴으로 변경
  - `apps/backend/src/metrics/metrics.controller.ts:25-32` — `clampDays` 헬퍼 함수. cost-trend/heatmap에도 동일하게 `clampDays(days, 7, 90)` 적용
  - `apps/backend/src/metrics/metrics.controller.ts` — `getErrorAnalysis()` 메서드가 `@Query('days') days?: string` 패턴 사용 (참조 모범)
  - `apps/backend/src/metrics/metrics.service.ts` — `getErrorAnalysis(days)` 메서드가 캐시키에 days 포함 패턴 (참조 모범)

  **API/Type References** (구현 대상):
  - `apps/backend/src/datasource/interfaces/metrics-datasource.interface.ts:110` — `getCostTrend()` 시그니처 (변경 대상)
  - `apps/backend/src/datasource/interfaces/metrics-datasource.interface.ts:84` — `getUsageHeatmap()` 시그니처 (변경 대상)
  - `apps/backend/src/datasource/implementations/bigquery-metrics.datasource.ts:312` — `getCostTrend()` BQ 구현체 (변경 대상)
  - `apps/backend/src/datasource/implementations/bigquery-metrics.datasource.ts:278` — `getUsageHeatmap()` BQ 구현체 (변경 대상)

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: cost-trend with explicit days parameter returns filtered data
    Tool: Bash (curl)
    Preconditions: Backend dev server running on localhost:3000
    Steps:
      1. curl -s "http://localhost:3000/projects/default/api/analytics/cost-trend?days=7" -H "Authorization: Bearer <token>"
      2. Assert: HTTP status is 200
      3. Assert: response has data array
      4. curl -s "http://localhost:3000/projects/default/api/analytics/cost-trend?days=14" -H "Authorization: Bearer <token>"
      5. Assert: HTTP status is 200
    Expected Result: Both requests succeed with days-appropriate data
    Evidence: Response bodies saved to .sisyphus/evidence/task-1-cost-trend-days.json

  Scenario: heatmap with explicit days parameter returns filtered data
    Tool: Bash (curl)
    Preconditions: Backend dev server running
    Steps:
      1. curl -s "http://localhost:3000/projects/default/api/analytics/heatmap?days=7" -H "Authorization: Bearer <token>"
      2. Assert: HTTP status is 200
      3. Assert: response has data array
    Expected Result: Heatmap returns days-filtered data
    Evidence: Response body saved to .sisyphus/evidence/task-1-heatmap-days.json

  Scenario: cost-trend/heatmap backward compatible (no days param)
    Tool: Bash (curl)
    Preconditions: Backend dev server running
    Steps:
      1. curl -s "http://localhost:3000/projects/default/api/analytics/cost-trend" -H "Authorization: Bearer <token>"
      2. Assert: HTTP status is 200 (기본값 7일 적용)
      3. curl -s "http://localhost:3000/projects/default/api/analytics/heatmap" -H "Authorization: Bearer <token>"
      4. Assert: HTTP status is 200
    Expected Result: No parameter → default 7 days applied
    Evidence: Response saved to .sisyphus/evidence/task-1-backward-compat.json

  Scenario: days boundary clamping works
    Tool: Bash (curl)
    Preconditions: Backend dev server running
    Steps:
      1. curl -s "http://localhost:3000/projects/default/api/analytics/cost-trend?days=0"
      2. Assert: HTTP status 200 (clampDays → 1)
      3. curl -s "http://localhost:3000/projects/default/api/analytics/cost-trend?days=999"
      4. Assert: HTTP status 200 (clampDays → 90)
    Expected Result: Out-of-range values clamped, no error
    Evidence: .sisyphus/evidence/task-1-clamp-boundary.json
  ```

  **Static Analysis:**
  - [x] `npx tsc --noEmit` in `apps/backend/` → 0 errors
  - [x] `grep -rn "INTERVAL 30 DAY" apps/backend/src/metrics/queries/metrics.queries.ts` → costTrend과 usageHeatmap에서 **0 matches** (parameterized로 변경됨)

  **Commit**: YES
  - Message: `fix(metrics): add days parameter support to cost-trend and heatmap endpoints`
  - Files: `metrics.queries.ts`, `metrics-datasource.interface.ts`, `bigquery-metrics.datasource.ts`, `metrics.service.ts`, `metrics.controller.ts`
  - Pre-commit: `cd apps/backend && npx tsc --noEmit`

---

### - [x] 2. FE/BE 모든 대시보드 기본 기간값 7일 통일

  **What to do**:

  **Step 1: FE 대시보드 페이지 기본값 변경** (6개 파일)
  
  1. `apps/frontend-next/src/app/dashboard/business/page.tsx`
     - `useState<DateRange>` 초기값: `days: 30` → `days: 7`
     - `calculateDateRange('month')` → `calculateDateRange('week')`
     - `<DateRangeFilter defaultPreset="month"` → `defaultPreset="week"`
  
  2. `apps/frontend-next/src/app/dashboard/quality/page.tsx`
     - 동일 변경: `days: 30` → `7`, `month` → `week`
  
  3. `apps/frontend-next/src/app/dashboard/operations/page.tsx`
     - `days: 1` → `days: 7`
     - `calculateDateRange('day')` → `calculateDateRange('week')`
     - `defaultPreset="day"` → `defaultPreset="week"`
  
  4. `apps/frontend-next/src/app/(service)/services/[serviceId]/business/page.tsx` (경로 확인 필요)
     - `days: 30` → `7`, `month` → `week`
  
  5. `apps/frontend-next/src/app/(service)/services/[serviceId]/quality/page.tsx`
     - `days: 30` → `7`, `month` → `week`
  
  6. `apps/frontend-next/src/app/(service)/services/[serviceId]/ai-performance/page.tsx`
     - `days: 1` → `7`, `day` → `week`

  **Step 2: FE Hook 기본 파라미터 통일**
  
  7. `apps/frontend-next/src/hooks/queries/use-metrics.ts`
     - `useDailyTraffic(_, days = 30)` → `days = 7`
     - `useTenantUsage(_, days = 30)` → `days = 7`
     - `useCostTrend(_, days = 30)` → `days = 7`
     - `useHeatmap(_, days = 30)` → `days = 7`
  
  8. `apps/frontend-next/src/hooks/queries/use-dashboard.ts`
     - `useBusinessDashboard(_, days = 30)` → `days = 7`
     - `useQualityDashboard(_, days = 30)` → `days = 7`
     - `useAIPerformanceDashboard` 내부 `useTenantUsage(projectId, 30)` → `7`
  
  9. `apps/frontend-next/src/hooks/queries/use-quality.ts`
     - `useEfficiencyTrend(_, days = 30)` → `days = 7`
     - `useQueryResponseCorrelation(_, days = 30)` → `days = 7`
     - `useRepeatedPatterns(_, days = 30)` → `days = 7`
     - `useQualityDashboard(_, days = 30)` → `days = 7`

  **Step 3: BE Controller 기본값 통일** (`apps/backend/src/metrics/metrics.controller.ts`)
  - `getRealtimeKPI`: `clampDays(days, 1, ...)` → `clampDays(days, 7, ...)`
  - `getHourlyTraffic`: `clampDays(days, 1, ...)` → `clampDays(days, 7, ...)`
  - `getDailyTraffic`: `clampDays(days, 30, ...)` → `clampDays(days, 7, ...)`
  - `getAnomalyStats`: `clampDays(days, 30, ...)` → `clampDays(days, 7, ...)`
  - `getTokenEfficiencyTrend`: `clampDays(days, 30, ...)` → `clampDays(days, 7, ...)`
  - `getRepeatedQueryPatterns`: `clampDays(days, 30, ...)` → `clampDays(days, 7, ...)`
  - `getResponseQualityMetrics`: `clampDays(days, 30, ...)` → `clampDays(days, 7, ...)`

  **Step 4: BE Service 기본값 통일** (`apps/backend/src/metrics/metrics.service.ts`)
  - `getDailyTraffic(days = 30)` → `days = 7`
  - `getAnomalyStats(days = 30)` → `days = 7`
  - `getTokenEfficiencyTrend(days = 30)` → `days = 7`
  - `getRepeatedQueryPatterns(days = 30)` → `days = 7`
  - `getResponseQualityMetrics(days = 30)` → `days = 7`

  **Must NOT do**:
  - 이미 7일인 대시보드(ai-performance, user-analytics, etl, job-monitoring, chatbot-quality) 변경
  - `use-etl.ts`, `use-job-monitoring.ts`, `use-user-analytics.ts` 등 이미 7일인 훅 수정
  - `use-faq-analysis.ts` 수정 (별도 `periodDays` enum 시스템 사용)
  - DateRangeFilter 컴포넌트 자체 수정 (Task 3에서 처리)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 9+ 파일에 걸쳐 일관된 값 변경 필요, 누락 방지 중요
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: UI 변경 아님, 로직 값 변경만

  **Parallelization**:
  - **Can Run In Parallel**: YES (Task 3과 병렬)
  - **Parallel Group**: Wave 2 (with Task 3)
  - **Blocks**: Task 4
  - **Blocked By**: Task 1

  **References** (CRITICAL):

  **Pattern References**:
  - `apps/frontend-next/src/app/dashboard/ai-performance/page.tsx` — 이미 `days: 7`, `defaultPreset="week"` 패턴 사용. **이 파일이 정답 패턴**. 다른 페이지를 이 패턴으로 맞춤
  - `apps/frontend-next/src/app/dashboard/chatbot-quality/page.tsx` — 이미 `days: 7`, `"week"` 패턴. 참고용
  - `apps/frontend-next/src/components/ui/DateRangeFilter.tsx` — `calculateDateRange(preset)` 함수가 preset에 따라 startDate/endDate 자동 계산. `"week"` preset → 7일 전~오늘

  **API/Type References**:
  - `apps/frontend-next/src/components/ui/DateRangeFilter.tsx` — `DateRange` interface: `{ startDate, endDate, days }` + `calculateDateRange(preset)` export 함수
  - `apps/backend/src/metrics/metrics.controller.ts:25-32` — `clampDays` 헬퍼. 두 번째 인자가 default value

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: No remaining days:30 in target FE pages
    Tool: Bash (grep)
    Preconditions: None
    Steps:
      1. grep -rn "days: 30" apps/frontend-next/src/app/dashboard/business/page.tsx
      2. Assert: 0 matches
      3. grep -rn "days: 30" apps/frontend-next/src/app/dashboard/quality/page.tsx
      4. Assert: 0 matches
      5. grep -rn "days: 1" apps/frontend-next/src/app/dashboard/operations/page.tsx
      6. Assert: 0 matches (1→7 변경됨)
    Expected Result: All target pages use days: 7
    Evidence: grep output captured

  Scenario: No remaining defaultPreset="month" in target pages
    Tool: Bash (grep)
    Preconditions: None
    Steps:
      1. grep -rn 'defaultPreset="month"' apps/frontend-next/src/app/dashboard/
      2. Assert: 0 matches
      3. grep -rn 'defaultPreset="day"' apps/frontend-next/src/app/dashboard/operations/
      4. Assert: 0 matches
    Expected Result: All presets changed to "week"
    Evidence: grep output captured

  Scenario: FE hook defaults changed to 7
    Tool: Bash (grep)
    Preconditions: None
    Steps:
      1. grep -n "days = 30" apps/frontend-next/src/hooks/queries/use-metrics.ts
      2. Assert: 0 matches
      3. grep -n "days = 30" apps/frontend-next/src/hooks/queries/use-dashboard.ts
      4. Assert: 0 matches
      5. grep -n "days = 30" apps/frontend-next/src/hooks/queries/use-quality.ts
      6. Assert: 0 matches
    Expected Result: All hook defaults are 7
    Evidence: grep output captured

  Scenario: BE controller defaults changed to 7
    Tool: Bash (grep)
    Preconditions: None
    Steps:
      1. grep -n "clampDays(days, 30" apps/backend/src/metrics/metrics.controller.ts
      2. Assert: 0 matches
      3. grep -n "clampDays(days, 1" apps/backend/src/metrics/metrics.controller.ts
      4. Assert: 0 matches (realtime KPI, hourly traffic도 7로 변경됨)
    Expected Result: All clampDays defaults are 7
    Evidence: grep output captured

  Scenario: BE service defaults changed to 7
    Tool: Bash (grep)
    Preconditions: None
    Steps:
      1. grep -n "days = 30" apps/backend/src/metrics/metrics.service.ts
      2. Assert: 0 matches
    Expected Result: All service method defaults are 7
    Evidence: grep output captured
  ```

  **TypeScript Compilation:**
  - [x] `cd apps/frontend-next && npx tsc --noEmit` → 0 errors
  - [x] `cd apps/backend && npx tsc --noEmit` → 0 errors

  **Commit**: YES
  - Message: `refactor(dashboard): unify default date range to 7 days across all dashboards`
  - Files: 6 page files + 3 hook files + `metrics.controller.ts` + `metrics.service.ts`
  - Pre-commit: `cd apps/backend && npx tsc --noEmit && cd ../frontend-next && npx tsc --noEmit`

---

### - [x] 3. FE: DateRangeFilter에 시간(HH:mm) 선택 기능 추가 (KST 기준)

  **What to do**:

  **Step 1: `DateRange` 인터페이스 확장** (`apps/frontend-next/src/components/ui/DateRangeFilter.tsx`)
  ```typescript
  export interface DateRange {
    startDate: string;    // YYYY-MM-DD (기존 유지)
    endDate: string;      // YYYY-MM-DD (기존 유지)
    days: number;         // (기존 유지)
    startTime?: string;   // HH:mm (KST) — 커스텀 모드에서만
    endTime?: string;     // HH:mm (KST) — 커스텀 모드에서만
  }
  ```

  **Step 2: `formatDate` 함수 KST 기반으로 수정**
  - 현재: `new Date().toISOString().split('T')[0]` — UTC 기반 (KST 자정 문제)
  - 변경: KST (UTC+9) 기준으로 YYYY-MM-DD 포맷
  ```typescript
  function formatDateKST(date: Date): string {
    // UTC+9 offset 적용
    const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    return kst.toISOString().split('T')[0];
  }
  ```
  - 또는 `Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul' })` 사용

  **Step 3: 커스텀 모드에 시간 입력 UI 추가**
  - `showCustom === true` 일 때만 시간 입력 표시
  - `<input type="time">` 2개 추가 (시작 시간, 종료 시간)
  - 기본값: startTime='00:00', endTime='23:59'
  - 기존 날짜 입력(`<input type="date">`) 옆에 배치
  - 스타일: 기존 DateRangeFilter의 Tailwind 패턴 따르기

  **Step 4: onChange 콜백에 시간 정보 포함**
  - 커스텀 모드에서 날짜/시간 변경 시 `onChange(updatedDateRange)` 호출
  - `updatedDateRange`에 `startTime`, `endTime` 포함
  - 프리셋 모드 클릭 시 `startTime`, `endTime` undefined로 리셋 (프리셋은 시간 불필요)

  **Step 5: KST ISO datetime 문자열 생성 유틸리티**
  - 커스텀 모드에서 fullStartDate/fullEndDate 생성:
    `"2026-02-14T09:00:00+09:00"` 형식
  - 이 값은 `DateRange`에 포함하거나 별도 getter로 제공
  - BE 전달은 여전히 `days` 파라미터 — 시간 정보는 FE 표시/UX용

  **Step 6: 시간 유효성 검증**
  - 같은 날 선택 시 startTime > endTime이면 endTime을 startTime으로 보정
  - 빈 입력 시 기본값 적용 (00:00 / 23:59)

  **Must NOT do**:
  - 외부 날짜 라이브러리 추가 (vanilla JS만)
  - 프리셋 버튼(1일/7일/30일) 동작 변경
  - BE API 파라미터 추가/변경
  - `DateRange` 기존 필드(`startDate`, `endDate`, `days`) 삭제/이름변경
  - 프리셋 모드에서 시간 입력 표시

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI 컴포넌트 수정 (시간 입력 필드 추가, 레이아웃 조정)
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: DateRangeFilter UI 확장, 시간 입력 필드 배치/스타일링
  - **Skills Evaluated but Omitted**:
    - `playwright`: 최종 검증은 Task 4에서 수행

  **Parallelization**:
  - **Can Run In Parallel**: YES (Task 2와 병렬)
  - **Parallel Group**: Wave 2 (with Task 2)
  - **Blocks**: Task 4
  - **Blocked By**: Task 1 (formatDate KST 수정의 문맥상)

  **References** (CRITICAL):

  **Pattern References**:
  - `apps/frontend-next/src/components/ui/DateRangeFilter.tsx` — 전체 컴포넌트. 현재 `showCustom` state로 커스텀 모드 토글, `<input type="date">` 2개 사용. 이 패턴에 `<input type="time">` 추가
  - `apps/frontend-next/src/components/ui/DateRangeFilter.tsx` — `calculateDateRange(preset)` 함수: 프리셋별 날짜 계산 로직. 시간 추가 시 이 함수는 **변경하지 않음** (프리셋은 시간 미포함)
  - `apps/frontend-next/src/components/ui/DateRangeFilter.tsx` — `formatDate` 함수: `toISOString().split('T')[0]`. KST 기반으로 수정 필요

  **API/Type References**:
  - `apps/frontend-next/src/components/ui/DateRangeFilter.tsx` — `DateRange` interface 정의 위치. 이 인터페이스를 확장
  - `packages/shared-types/src/` — 공유 타입 확인. DateRange가 shared-types에도 있는지 확인 필요. 있다면 그쪽도 수정

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: 커스텀 모드에서 시간 입력 필드 표시
    Tool: Playwright (playwright skill)
    Preconditions: Frontend dev server running on localhost:3001
    Steps:
      1. Navigate to: http://localhost:3001/dashboard/business
      2. Wait for: DateRangeFilter component visible (timeout: 10s)
      3. Click: 커스텀 기간 선택 버튼/탭
      4. Wait for: input[type="date"] visible (2개)
      5. Assert: input[type="time"] visible (2개 — 시작/종료 시간)
      6. Screenshot: .sisyphus/evidence/task-3-time-inputs-visible.png
    Expected Result: 커스텀 모드에서 날짜 + 시간 입력 필드 모두 표시
    Evidence: .sisyphus/evidence/task-3-time-inputs-visible.png

  Scenario: 시간 입력 후 DateRange에 반영
    Tool: Playwright (playwright skill)
    Preconditions: Frontend dev server, 커스텀 모드 활성화 상태
    Steps:
      1. 커스텀 모드 진입
      2. Fill: 시작 시간 input → "09:00"
      3. Fill: 종료 시간 input → "18:00"
      4. Assert: 컴포넌트 state에 startTime="09:00", endTime="18:00" 반영
      5. Screenshot: .sisyphus/evidence/task-3-time-filled.png
    Expected Result: 시간 값이 DateRange에 포함
    Evidence: .sisyphus/evidence/task-3-time-filled.png

  Scenario: 프리셋 선택 시 시간 입력 비표시
    Tool: Playwright (playwright skill)
    Preconditions: Frontend dev server, 커스텀 모드에서 시간 입력 상태
    Steps:
      1. Click: "7일" 프리셋 버튼
      2. Assert: input[type="time"] NOT visible
      3. Assert: 기간이 7일로 설정됨
      4. Screenshot: .sisyphus/evidence/task-3-preset-no-time.png
    Expected Result: 프리셋 모드에서 시간 입력 숨김
    Evidence: .sisyphus/evidence/task-3-preset-no-time.png

  Scenario: KST 기반 날짜 포맷 정확성
    Tool: Playwright (playwright skill)
    Preconditions: Frontend dev server
    Steps:
      1. Navigate to business dashboard
      2. 현재 날짜 필드 값 확인
      3. Assert: 날짜가 KST 기준으로 표시 (UTC 아닌 Asia/Seoul)
    Expected Result: KST 기준 날짜 표시
    Evidence: .sisyphus/evidence/task-3-kst-date.png
  ```

  **TypeScript Compilation:**
  - [x] `cd apps/frontend-next && npx tsc --noEmit` → 0 errors

  **Commit**: YES
  - Message: `feat(DateRangeFilter): add time selection (HH:mm) in custom mode with KST timezone`
  - Files: `DateRangeFilter.tsx`
  - Pre-commit: `cd apps/frontend-next && npx tsc --noEmit`

---

### - [x] 4. 전체 통합 검증

  **What to do**:
  - FE + BE 동시 실행 (`pnpm dev:all`)
  - 모든 대시보드 페이지 접속하여 기본값 7일 확인
  - cost-trend / heatmap API가 days 파라미터를 올바르게 처리하는지 확인
  - DateRangeFilter 커스텀 모드에서 시간 선택 동작 확인
  - TypeScript 빌드 최종 확인

  **Must NOT do**:
  - 추가 코드 수정 (검증만)
  - 새로운 기능 추가

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 검증만 수행, 코드 변경 없음
  - **Skills**: [`playwright`]
    - `playwright`: 브라우저 자동화로 UI 검증

  **Parallelization**:
  - **Can Run In Parallel**: NO (최종 검증)
  - **Parallel Group**: Wave 3 (단독)
  - **Blocks**: None (최종 태스크)
  - **Blocked By**: Task 2, Task 3

  **References**:
  - Task 1, 2, 3의 모든 Acceptance Criteria 참조

  **Acceptance Criteria**:

  ```
  Scenario: 전체 TypeScript 컴파일 성공
    Tool: Bash
    Steps:
      1. cd apps/backend && npx tsc --noEmit
      2. Assert: exit code 0, 0 errors
      3. cd apps/frontend-next && npx tsc --noEmit
      4. Assert: exit code 0, 0 errors
    Expected Result: Both apps compile cleanly

  Scenario: Business 대시보드 기본값 7일 + 시간 선택
    Tool: Playwright (playwright skill)
    Preconditions: pnpm dev:all running
    Steps:
      1. Navigate to: http://localhost:3001/dashboard/business
      2. Wait for: Dashboard loads (timeout: 15s)
      3. Assert: DateRangeFilter shows "7일" or "week" as active preset
      4. Click: 커스텀 기간 선택
      5. Assert: 시간 입력 필드(type="time") 2개 표시
      6. Screenshot: .sisyphus/evidence/task-4-business-dashboard.png
    Expected Result: 7일 기본, 커스텀에서 시간 입력 가능

  Scenario: Quality 대시보드 기본값 7일
    Tool: Playwright (playwright skill)
    Steps:
      1. Navigate to: http://localhost:3001/dashboard/quality
      2. Assert: DateRangeFilter shows "week" preset active
      3. Screenshot: .sisyphus/evidence/task-4-quality-dashboard.png

  Scenario: Operations 대시보드 기본값 7일
    Tool: Playwright (playwright skill)
    Steps:
      1. Navigate to: http://localhost:3001/dashboard/operations
      2. Assert: DateRangeFilter shows "week" preset active
      3. Screenshot: .sisyphus/evidence/task-4-operations-dashboard.png

  Scenario: cost-trend/heatmap API 통합 확인
    Tool: Bash (curl)
    Steps:
      1. curl "http://localhost:3000/projects/default/api/analytics/cost-trend?days=7"
      2. Assert: 200, data returned
      3. curl "http://localhost:3000/projects/default/api/analytics/heatmap?days=7"
      4. Assert: 200, data returned
    Evidence: .sisyphus/evidence/task-4-api-integration.json
  ```

  **Commit**: NO (검증만, 코드 변경 없음)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `fix(metrics): add days parameter support to cost-trend and heatmap endpoints` | queries, interface, BQ impl, service, controller | `npx tsc --noEmit` (backend) |
| 2 | `refactor(dashboard): unify default date range to 7 days across all dashboards` | 6 pages, 3 hooks, controller, service | `npx tsc --noEmit` (both) |
| 3 | `feat(DateRangeFilter): add time selection (HH:mm) in custom mode with KST timezone` | DateRangeFilter.tsx | `npx tsc --noEmit` (frontend) |
| 4 | — | — | Integration verification only |

---

## Success Criteria

### Verification Commands
```bash
# BE TypeScript compile
cd apps/backend && npx tsc --noEmit  # Expected: 0 errors

# FE TypeScript compile
cd apps/frontend-next && npx tsc --noEmit  # Expected: 0 errors

# No remaining days:30 defaults in target files
grep -rn "days: 30" apps/frontend-next/src/app/dashboard/business/page.tsx  # Expected: 0 matches
grep -rn "days: 30" apps/frontend-next/src/app/dashboard/quality/page.tsx   # Expected: 0 matches
grep -rn 'defaultPreset="month"' apps/frontend-next/src/app/dashboard/     # Expected: 0 matches

# API endpoints accept days
curl -s "http://localhost:3000/projects/default/api/analytics/cost-trend?days=7" | head -c 100
curl -s "http://localhost:3000/projects/default/api/analytics/heatmap?days=7" | head -c 100

# Time selection exists in DateRangeFilter
grep -n "type=\"time\"" apps/frontend-next/src/components/ui/DateRangeFilter.tsx  # Expected: 2+ matches
grep -n "Asia/Seoul\|+09:00" apps/frontend-next/src/components/ui/DateRangeFilter.tsx  # Expected: 1+ matches
```

### Final Checklist
- [x] All "Must Have" present
- [x] All "Must NOT Have" absent
- [x] BE/FE TypeScript 0 errors
- [x] cost-trend/heatmap `?days=N` 지원
- [x] 모든 대시보드 기본값 7일
- [x] 커스텀 모드 시간 선택 동작
- [x] KST 기준 날짜/시간 처리
- [x] 기존 API 하위 호환성 유지
