# Performance Optimization Work Plan

**Created**: 2026-02-06
**Status**: Ready for execution
**Risk Level**: Aggressive (structural changes included)
**Estimated Phases**: 3 (Hotfix -> Structural -> Infrastructure)

---

## Context

### Original Request
프로젝트 전반의 성능 저하 요소를 식별하고 개선하는 종합 계획. 사용자가 느린 대시보드 페이지를 체감하고 있으며, 백엔드/프론트엔드/인프라 전체를 적극적으로 개선.

### Interview Summary
- **Priority**: 전체 도메인 병렬 진행, 임팩트 기준 우선순위
- **Risk Tolerance**: Aggressive - 구조적 변경 포함
- **Urgency**: 특정 대시보드 페이지가 체감 가능하게 느림 (hotfix 필요)

### Research Findings (17 issues identified)

**Backend CRITICAL (7)**:
1. N+1 batch-analysis DB writes (loop 내 개별 create)
2. N+1 user-profiling DB operations (51,000 ops 가능)
3. queryResponseCorrelation 대용량 텍스트 전송 (~4MB/req) - 이미 LENGTH() 사용으로 부분 해결되었으나 LIMIT 300 여전히 과다
4. getSampleLogs SELECT * (4-5MB/req)
5. ARRAY_AGG 무제한 (rephrasedQueryPatterns)
6. 타임존 미적용 (dailyTraffic, costTrend, tokenEfficiencyTrend 등에서 DATE(timestamp) 사용)
7. Controller limit 미검증 (클라이언트가 ?limit=1000000 전송 가능)

**Frontend CRITICAL (4)**:
1. 차트 컴포넌트 인라인 함수 (모든 렌더마다 새 함수 생성)
2. KPI 계산 useMemo 누락 (use-dashboard.ts)
3. Suspense 경계 누락
4. UsageHeatmap 정적 import

**Infrastructure CRITICAL (4)**:
1. Turbopack 캐시 비활성화
2. Cache Service 메모리 제한 없음
3. BigQuery 쿼리 타임아웃 미설정
4. Global rate limiting 미적용

---

## Work Objectives

### Core Objective
사용자 체감 성능을 측정 가능한 수준으로 개선하되, 안정성을 유지하면서 구조적 기술 부채를 해소한다.

### Deliverables
1. 대시보드 페이지 초기 로딩 시간 감소 (목표: 50% 이상)
2. API 응답 크기 감소 (목표: 4MB -> 100KB 미만)
3. 메모리 사용량 안정화 (캐시 바운더리, rate limiting)
4. 프론트엔드 불필요한 리렌더링 제거

### Definition of Done
- [ ] Phase 1 완료 후: 가장 느린 API 엔드포인트 응답 크기 90% 감소
- [ ] Phase 2 완료 후: 프론트엔드 차트 컴포넌트 리렌더링 최소화, N+1 쿼리 제거
- [ ] Phase 3 완료 후: 서버 안정성 보장 (rate limit, 캐시 바운더리, 타임아웃)
- [ ] 기존 테스트 전체 통과
- [ ] 빌드 에러 없음

---

## Guardrails

### MUST Have
- 모든 변경 후 기존 테스트 통과
- 각 Phase 완료 시 빌드 검증
- BigQuery 쿼리 변경 시 Asia/Seoul 타임존 적용 (CLAUDE.md 규칙)
- API 응답 구조 하위 호환성 유지 (프론트엔드 깨지지 않도록)

### MUST NOT Have
- 새로운 npm 패키지 추가 없이 해결 가능한 경우 불필요한 의존성 추가 금지
- API 엔드포인트 URL 변경 금지 (프론트엔드 호환성)
- 데이터 정확도를 희생하는 최적화 금지

---

## Phase 1: Immediate Hotfix (사용자 체감 성능 직접 영향)

> **목표**: 가장 느린 API와 가장 무거운 프론트엔드 로딩을 즉시 개선
> **예상 소요**: 1-2일
> **병렬 트랙**: Backend (1A) + Frontend (1B) 동시 진행 가능

### Track 1A: Backend - 대용량 응답 제거

#### TODO 1A-1: getSampleLogs SELECT * 제거 (CRITICAL)
**File**: `apps/backend/src/datasource/implementations/bigquery-metrics.datasource.ts` (line 269-278)
**Change**:
- `SELECT *` -> 필요한 컬럼만 명시적으로 SELECT
- `user_input`, `llm_response` 필드를 `SUBSTR(..., 1, 200)`으로 truncate
- 기본 limit을 1000 -> 100으로 변경

**Before**:
```sql
SELECT *
FROM `{table}`
ORDER BY timestamp DESC
LIMIT ${limit}
```

**After**:
```sql
SELECT
  timestamp,
  tenant_id,
  success,
  CAST(input_tokens AS FLOAT64) as input_tokens,
  CAST(output_tokens AS FLOAT64) as output_tokens,
  CAST(total_tokens AS FLOAT64) as total_tokens,
  SUBSTR(user_input, 1, 200) as user_input,
  SUBSTR(llm_response, 1, 200) as llm_response,
  severity
FROM `{table}`
ORDER BY timestamp DESC
LIMIT ${limit}
```

**Acceptance Criteria**:
- 응답 크기 4-5MB -> 200KB 미만
- 기존 프론트엔드 logs 페이지 정상 동작

#### TODO 1A-2: userActivityDetail 텍스트 truncation 추가 (HIGH)
**File**: `apps/backend/src/metrics/queries/metrics.queries.ts` (line 450-472)
**Change**:
- `user_input AS userInput` -> `SUBSTR(user_input, 1, 500) AS userInput`
- `llm_response AS llmResponse` -> `SUBSTR(llm_response, 1, 500) AS llmResponse`

**Acceptance Criteria**:
- 유저 활동 상세 응답 크기 대폭 감소
- 프론트엔드 user-analytics 페이지 정상 동작

#### TODO 1A-3: Controller limit 상한 검증 추가 (CRITICAL)
**File**: `apps/backend/src/metrics/metrics.controller.ts`
**Change**: 모든 `@Query('limit')` 파라미터에 상한 검증 추가

```typescript
// 유틸리티 함수 추가 (controller 상단 또는 별도 util)
function clampLimit(value: string | undefined, defaultVal: number, max: number): number {
  const parsed = value ? parseInt(value, 10) : defaultVal;
  return Math.min(Math.max(1, parsed || defaultVal), max);
}

function clampDays(value: string | undefined, defaultVal: number, max: number = 365): number {
  const parsed = value ? parseInt(value, 10) : defaultVal;
  return Math.min(Math.max(1, parsed || defaultVal), max);
}
```

적용 대상 엔드포인트:
- `getSampleLogs`: max 200 (현재 무제한)
- `getUserList`: max 500 (현재 기본 1000)
- `getUserRequestCounts`: max 200 (현재 무제한)
- `getUserTokenUsage`: max 200 (현재 무제한)
- `getUserQuestionPatterns`: max 200 (현재 무제한)
- `getUserActivityDetail`: max 50 (현재 무제한)
- `getTenantUsage`: days max 90
- `getTokenEfficiency`: days max 90
- `getAnomalyStats`: days max 90

**Acceptance Criteria**:
- `?limit=1000000` 요청 시 안전한 상한으로 자동 클램핑
- 기존 기본값 유지

#### TODO 1A-4: rephrasedQueryPatterns ARRAY_AGG 제한 (HIGH)
**File**: `apps/backend/src/metrics/queries/metrics.queries.ts` (line 597-637)
**Change**:
- line 608: `ARRAY_AGG(STRUCT(...))`에 `LIMIT 20` 추가
- line 630: `(SELECT ARRAY_AGG(q.query LIMIT 10) ...)` 이미 LIMIT 10이지만, 외부 ARRAY_AGG에도 제한 필요

**Before** (line 608):
```sql
ARRAY_AGG(STRUCT(
  user_input AS query,
  FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%SZ', timestamp) AS ts,
  success
) ORDER BY timestamp) AS queries_arr,
```

**After**:
```sql
ARRAY_AGG(STRUCT(
  user_input AS query,
  FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%SZ', timestamp) AS ts,
  success
) ORDER BY timestamp LIMIT 20) AS queries_arr,
```

**Acceptance Criteria**:
- 세션당 쿼리 배열 최대 20개로 제한
- 기존 분석 로직에 영향 없음 (하위 쿼리에서 이미 LIMIT 10)

### Track 1B: Frontend - 즉시 체감 개선

#### TODO 1B-1: Turbopack 파일 시스템 캐시 활성화 (CRITICAL)
**File**: `apps/frontend-next/next.config.ts`
**Change**:
```typescript
const nextConfig: NextConfig = {
  experimental: {
    turbopackFileSystemCacheForBuild: true,  // false -> true
    turbopackFileSystemCacheForDev: true,    // false -> true
  },
};
```

**Acceptance Criteria**:
- `pnpm dev:frontend-next` 재시작 시 HMR 속도 개선 체감
- `pnpm build:frontend-next` 재빌드 시 캐시 히트로 빌드 시간 감소

#### TODO 1B-2: UsageHeatmap dynamic import 전환 (CRITICAL)
**File**: `apps/frontend-next/src/app/dashboard/business/page.tsx` (line 10 근처)
**Change**:
```typescript
// Before
import UsageHeatmap from '@/components/charts/UsageHeatmap';

// After
import dynamic from 'next/dynamic';
const UsageHeatmap = dynamic(() => import('@/components/charts/UsageHeatmap'), {
  ssr: false,
  loading: () => <div className="h-64 bg-slate-800 animate-pulse rounded-lg" />
});
```

**Acceptance Criteria**:
- 초기 JS 번들 크기 감소
- Business 대시보드 초기 로딩 개선

---

## Phase 2: Structural Improvements (구조적 개선)

> **목표**: N+1 쿼리 해결, 프론트엔드 메모이제이션, 캐시 키 정합성
> **예상 소요**: 3-5일
> **병렬 트랙**: Backend (2A) + Frontend (2B) 동시 진행 가능
> **의존성**: Phase 1 완료 후 시작

### Track 2A: Backend - N+1 쿼리 및 쿼리 최적화

#### TODO 2A-1: Batch Analysis N+1 쿼리 해결 (CRITICAL)
**File**: `apps/backend/src/batch-analysis/batch-analysis.service.ts` (line 623-714 근처)
**Change**:
- 루프 내 개별 `prisma.batchAnalysisResult.create()` -> `prisma.batchAnalysisResult.createMany()` 배치 처리
- Slack webhook 호출도 배치 수집 후 한 번에 발송 (또는 비동기 큐)

**Pattern**:
```typescript
// Before (N+1)
for (const item of items) {
  await prisma.batchAnalysisResult.create({ data: item });
  await sendSlackNotification(item); // 개별 발송
}

// After (Batch)
await prisma.batchAnalysisResult.createMany({ data: items });
// Slack: 요약 한 건만 발송, 또는 Promise.allSettled로 병렬 처리
const criticalItems = items.filter(i => i.needsAlert);
if (criticalItems.length > 0) {
  await sendBatchSlackNotification(criticalItems);
}
```

**Acceptance Criteria**:
- 1000개 아이템 처리 시: ~1000 DB writes -> 1 DB write
- 배치 분석 실행 시간 90% 이상 단축
- 기존 테스트 통과

#### TODO 2A-2: User Profiling N+1 쿼리 해결 (CRITICAL)
**File**: `apps/backend/src/user-profiling/user-profiling.service.ts` (line 381-407 근처)
**Change**:
- 사용자별 루프 + 메시지별 upsert -> 배치 upsert 또는 createMany + conflict handling
- `prisma.$transaction()` 사용하여 일괄 처리

**Acceptance Criteria**:
- 1000유저 x 50메시지 시나리오: ~51,000 ops -> ~수백 ops
- 프로파일링 결과 동일
- 기존 테스트 통과

#### TODO 2A-3: BigQuery 타임존 적용 (CRITICAL - CLAUDE.md 규칙)
**File**: `apps/backend/src/metrics/queries/metrics.queries.ts`
**Change**: 아래 쿼리들의 `DATE(timestamp)` -> `DATE(timestamp, 'Asia/Seoul')` 변경

| Query | Line | Current | Fix |
|-------|------|---------|-----|
| `dailyTraffic` | 50 | `DATE(timestamp) as date` | `DATE(timestamp, 'Asia/Seoul') as date` |
| `costTrend` | 180 | `DATE(timestamp) as date` | `DATE(timestamp, 'Asia/Seoul') as date` |
| `tokenEfficiencyTrend` | 224 | `DATE(timestamp) as date` | `DATE(timestamp, 'Asia/Seoul') as date` |
| `responseQualityMetrics` | 734 | `DATE(timestamp) AS date` | `DATE(timestamp, 'Asia/Seoul') AS date` |
| `chatSamplesForAnalysis` | 771 | `DATE(timestamp) = '${targetDate}'` | `DATE(timestamp, 'Asia/Seoul') = '${targetDate}'` |
| `tenantsForDate` | 797 | `DATE(timestamp) = '${targetDate}'` | `DATE(timestamp, 'Asia/Seoul') = '${targetDate}'` |
| `sessionsForDate` | 1018 | `DATE(timestamp) = '${targetDate}'` | `DATE(timestamp, 'Asia/Seoul') = '${targetDate}'` |

**Acceptance Criteria**:
- 모든 날짜 기반 쿼리가 KST 기준으로 동작
- 일 경계 데이터 불일치 해소

#### TODO 2A-4: queryResponseCorrelation 응답 최적화 (HIGH)
**File**: `apps/backend/src/metrics/queries/metrics.queries.ts` (line 249-274)
**Change**:
- 현재 이미 `LENGTH(user_input)`, `LENGTH(llm_response)` 사용 중 (텍스트 자체는 미전송)
- LIMIT 300 -> LIMIT 200으로 축소
- 프론트엔드에서 필요 시 페이지네이션 지원 추가 (선택적)

**Acceptance Criteria**:
- 상관관계 차트 데이터 응답 크기 추가 감소

### Track 2B: Frontend - 메모이제이션 및 렌더링 최적화

#### TODO 2B-1: use-dashboard.ts KPI 계산 useMemo 적용 (CRITICAL)
**File**: `apps/frontend-next/src/hooks/queries/use-dashboard.ts`
**Change**: 3개 대시보드 훅의 KPI 계산을 `useMemo`로 래핑

```typescript
// useBusinessDashboard (line 100-105)
const kpis = useMemo(() => ({
  totalTokens: tenantUsage.reduce((sum, t) => sum + t.total_tokens, 0),
  totalRequests: tenantUsage.reduce((sum, t) => sum + t.request_count, 0),
  totalCost: costTrend.reduce((sum, c) => sum + c.total_cost, 0),
  tenantCount: tenantUsage.length,
}), [tenantUsage, costTrend]);

// useOperationsDashboard (line 149-166)
const kpis = useMemo(() => realtimeKPI
  ? {
      totalRequests: realtimeKPI.total_requests,
      successRate: realtimeKPI.total_requests > 0
        ? (realtimeKPI.success_count / realtimeKPI.total_requests) * 100 : 0,
      errorRate: realtimeKPI.error_rate,
      avgTokens: realtimeKPI.avg_tokens,
      activeTenants: realtimeKPI.active_tenants,
    }
  : { totalRequests: 0, successRate: 0, errorRate: 0, avgTokens: 0, activeTenants: 0 },
[realtimeKPI]);

// useAIPerformanceDashboard (line 211-259)
const kpis = useMemo(() => {
  // ... 모든 KPI 계산 로직
}, [anomalyStats, tokenEfficiency]);
```

**Acceptance Criteria**:
- 대시보드 리렌더링 시 KPI 재계산 방지
- React DevTools Profiler에서 불필요 렌더링 감소 확인

#### TODO 2B-2: 차트 컴포넌트 인라인 함수 제거 (CRITICAL)
**Files** (각각 개별 수정):
- `apps/frontend-next/src/components/charts/CostTrendChart.tsx`
- `apps/frontend-next/src/components/charts/QueryResponseScatterPlot.tsx`
- `apps/frontend-next/src/components/charts/RealtimeTrafficChart.tsx`
- `apps/frontend-next/src/components/charts/TokenEfficiencyTrendChart.tsx`
- `apps/frontend-next/src/components/charts/TenantPieChart.tsx`
- `apps/frontend-next/src/components/charts/TokenScatterPlot.tsx`

**Change Pattern**: 각 차트의 Tooltip `formatter`, `labelFormatter`, Legend `formatter` 등의 인라인 함수를 컴포넌트 외부 상수 또는 `useCallback`으로 추출

```typescript
// Before (매 렌더마다 새 함수)
<Tooltip formatter={(value) => `${value.toLocaleString()} tokens`} />

// After (안정적 참조)
const tooltipFormatter = useCallback(
  (value: number) => `${value.toLocaleString()} tokens`, []
);
// 또는 컴포넌트 외부:
const tooltipFormatter = (value: number) => `${value.toLocaleString()} tokens`;

<Tooltip formatter={tooltipFormatter} />
```

**Acceptance Criteria**:
- 차트 리렌더링 시 새 함수 생성 없음
- 시각적 동작 동일

#### TODO 2B-3: fetchCorrelationDetail debounce 추가 (HIGH)
**File**: `apps/frontend-next/src/hooks/queries/use-quality.ts` (line 219-229)
**Change**:
- ScatterPlot 점 클릭 시 빠른 연속 클릭 방어를 위한 debounce 또는 중복 요청 방지

```typescript
// 방법 1: 간단한 중복 방지 플래그
let isFetching = false;
export async function fetchCorrelationDetail(...) {
  if (isFetching) return null;
  isFetching = true;
  try {
    // ... existing logic
  } finally {
    isFetching = false;
  }
}

// 방법 2 (권장): AbortController 기반
let currentController: AbortController | null = null;
export async function fetchCorrelationDetail(...) {
  if (currentController) currentController.abort();
  currentController = new AbortController();
  // fetch with signal: currentController.signal
}
```

**Acceptance Criteria**:
- ScatterPlot 빠른 클릭 시 중복 API 호출 방지
- 마지막 클릭의 결과만 표시

#### TODO 2B-4: Suspense 경계 추가 (HIGH)
**Files**:
- `apps/frontend-next/src/app/dashboard/quality/page.tsx`
- `apps/frontend-next/src/app/dashboard/business/page.tsx`
- `apps/frontend-next/src/app/dashboard/operations/page.tsx`

**Change**: dynamic import된 차트 컴포넌트들을 `<Suspense>` 경계로 감싸기

```typescript
import { Suspense } from 'react';

// 각 차트 그룹을 Suspense로 래핑
<Suspense fallback={<ChartSkeleton />}>
  <DynamicChart data={data} />
</Suspense>
```

**Acceptance Criteria**:
- 차트 로딩 중 스켈레톤 UI 표시
- 전체 페이지 블로킹 없이 점진적 렌더링

### Track 2C: Cache Service 개선

#### TODO 2C-1: Cache Service 메모리 제한 추가 (CRITICAL)
**File**: `apps/backend/src/cache/cache.service.ts` (line 26-31)
**Change**:
```typescript
this.cache = new NodeCache({
  stdTTL: CacheTTL.MEDIUM,
  checkperiod: 60,        // 120 -> 60 (더 빈번한 만료 체크)
  useClones: false,
  deleteOnExpire: true,
  maxKeys: 500,            // NEW: 최대 키 수 제한
});
```

추가로 캐시 키 수 모니터링 로그:
```typescript
// 주기적 경고 로그 (선택적)
if (this.cache.keys().length > 400) {
  this.logger.warn(`Cache approaching limit: ${this.cache.keys().length}/500 keys`);
}
```

**Acceptance Criteria**:
- 캐시 메모리 무한 증가 방지
- 500 키 초과 시 node-cache의 기본 에러 핸들링 (oldest eviction)

---

## Phase 3: Infrastructure Hardening (인프라 강화)

> **목표**: 서버 안정성, 빌드 최적화, 방어적 인프라
> **예상 소요**: 2-3일
> **의존성**: Phase 2 완료 후 시작
> **병렬 트랙**: Backend (3A) + Infra (3B) 동시 진행 가능

### Track 3A: Backend - 방어적 인프라

#### TODO 3A-1: BigQuery 쿼리 타임아웃 설정 (CRITICAL)
**File**: `apps/backend/src/datasource/implementations/bigquery-metrics.datasource.ts`
**Change**: BigQuery 쿼리 실행 시 타임아웃 옵션 추가

```typescript
// executeQuery 메서드에 타임아웃 추가
const options = {
  query,
  location: this.location,
  timeoutMs: 30000,  // 30초 타임아웃
};
const [rows] = await this.bigQueryClient.query(options);
```

**Acceptance Criteria**:
- 30초 초과 쿼리 자동 중단
- 타임아웃 시 의미 있는 에러 메시지 반환

#### TODO 3A-2: Global Rate Limiting 적용 (CRITICAL)
**File**: `apps/backend/src/app.module.ts`
**Change**: `@nestjs/throttler` 글로벌 설정 추가

```typescript
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,    // 1분
      limit: 100,    // 분당 100 요청
    }]),
    // ... 기존 모듈들
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // ... 기존 providers
  ],
})
```

참고: `@SkipThrottle()` 데코레이터로 내부 통신용 엔드포인트 제외 가능

**Acceptance Criteria**:
- 분당 100 요청 초과 시 429 응답
- 정상 사용에 영향 없는 임계값
- 기존 @Public() 엔드포인트에도 rate limit 적용

#### TODO 3A-3: Module Lazy Loading 검토 및 적용 (HIGH)
**File**: `apps/backend/src/app.module.ts`
**Change**: 사용 빈도가 낮은 모듈을 `LazyModuleLoader`로 전환

NestJS의 `LazyModuleLoader`를 사용하여 다음 모듈을 lazy로 전환:
- `FAQAnalysisModule` (온디맨드 분석)
- `UserProfilingModule` (온디맨드 프로파일링)
- `ReportMonitoringModule` (주기적 배치)
- `ProblematicChatModule` (온디맨드)

```typescript
// app.module.ts에서 제거하고 필요 시 동적 로드
// 또는 NestJS의 forwardRef + lazy 패턴 사용
```

**주의**: NestJS의 lazy loading은 HTTP 요청 기반 모듈에는 제한적. ScheduleModule 기반 모듈은 eager 유지 필요. 실제로는 코드 스플리팅보다 시작 시간에 미치는 영향이 제한적일 수 있으므로, 이 TODO는 **측정 후 결정** (프로파일링 결과에 따라 스킵 가능).

**Acceptance Criteria**:
- 서버 시작 시간 측정 (before/after)
- 개선이 유의미할 경우에만 적용
- 기존 스케줄러 정상 동작

#### TODO 3A-4: api-client 요청 중복 제거 (Deduplication) (HIGH)
**File**: `apps/frontend-next/src/lib/api-client.ts`
**Change**: 동일 URL + params에 대한 in-flight 요청 중복 제거

```typescript
// 진행 중인 요청을 추적하는 Map
const pendingRequests = new Map<string, Promise<any>>();

function getRequestKey(config: InternalAxiosRequestConfig): string {
  return `${config.method}:${config.url}:${JSON.stringify(config.params)}`;
}

// Request interceptor에 deduplication 추가
apiClient.interceptors.request.use((config) => {
  if (config.method === 'get') {
    const key = getRequestKey(config);
    if (pendingRequests.has(key)) {
      // 이미 진행 중인 동일 요청이 있으면 그 Promise를 반환
      const controller = new AbortController();
      config.signal = controller.signal;
      controller.abort('Duplicate request');
    }
  }
  return config;
});
```

**또는** React Query 레벨에서 `staleTime` + `gcTime` 활용 (더 간단):
```typescript
// use-metrics.ts의 각 쿼리 훅에
{ staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000 }
```

**Acceptance Criteria**:
- 동일 API 동시 요청 시 네트워크 요청 1회만 발생
- React Query 캐시 적중률 향상

---

## Verification & Measurement

### Phase 1 완료 시 검증
```bash
# 1. 빌드 검증
cd apps/backend && pnpm build
cd apps/frontend-next && pnpm build

# 2. 테스트 실행
cd apps/backend && pnpm test

# 3. API 응답 크기 측정 (curl)
curl -s http://localhost:3000/projects/default/api/logs | wc -c
# 목표: < 200KB (현재 4-5MB)

curl -s http://localhost:3000/projects/default/api/analytics/user-activity/{userId} | wc -c
# 목표: < 50KB
```

### Phase 2 완료 시 검증
```bash
# 1. 빌드 + 테스트
cd apps/backend && pnpm build && pnpm test
cd apps/frontend-next && pnpm build

# 2. N+1 쿼리 확인 (Prisma query log로 쿼리 수 확인)
# batch-analysis: 1000개 아이템 처리 시 DB write 수 측정

# 3. 프론트엔드 번들 크기
cd apps/frontend-next && npx @next/bundle-analyzer
```

### Phase 3 완료 시 검증
```bash
# 1. Rate limiting 확인
for i in $(seq 1 110); do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/projects/default/api/metrics/realtime; done
# 100번째까지 200, 이후 429

# 2. 쿼리 타임아웃 확인
# 의도적으로 느린 쿼리 실행 -> 30초 후 타임아웃 에러 반환 확인

# 3. 서버 시작 시간
time pnpm dev:backend
```

---

## Risk Assessment & Rollback Strategy

### Phase 1 Risks
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| SELECT 컬럼 누락으로 프론트엔드 에러 | Medium | High | 프론트엔드에서 사용하는 필드를 사전 확인 후 SELECT 목록 작성 |
| Limit 클램핑으로 일부 페이지 데이터 부족 | Low | Medium | 기존 기본값 유지, 상한만 추가 |

**Rollback**: git revert 단위로 각 TODO별 커밋

### Phase 2 Risks
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| createMany 실패 시 partial insert | Medium | High | $transaction으로 감싸서 all-or-nothing |
| 타임존 변경으로 기존 데이터 불일치 | Low | Medium | BigQuery는 저장값 변경 없음, 표시만 변경 |
| useMemo 의존성 배열 오류 | Low | Medium | 린트 규칙 (react-hooks/exhaustive-deps) 확인 |

**Rollback**: Phase 2는 Phase 1 완료 후 별도 브랜치에서 작업, PR 단위 rollback 가능

### Phase 3 Risks
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Rate limit으로 정상 사용자 차단 | Low | High | 충분히 높은 임계값 (100/min), 모니터링 |
| BigQuery 타임아웃으로 긴 분석 쿼리 실패 | Medium | Medium | 분석용 쿼리는 별도 타임아웃 (60s) |
| Lazy loading이 스케줄러 동작 방해 | Medium | High | 스케줄러 모듈은 eager 유지 |

**Rollback**: 각 인프라 변경은 설정 값 변경이므로 즉시 rollback 가능

---

## Commit Strategy

### Phase 1 Commits
1. `perf(backend): replace SELECT * in getSampleLogs with explicit columns and text truncation`
2. `perf(backend): add text truncation to userActivityDetail query`
3. `perf(backend): add limit clamping to all controller query parameters`
4. `perf(backend): limit ARRAY_AGG size in rephrasedQueryPatterns query`
5. `perf(frontend): enable Turbopack filesystem cache`
6. `perf(frontend): convert UsageHeatmap to dynamic import with SSR disabled`

### Phase 2 Commits
7. `perf(backend): batch DB writes in batch-analysis service (N+1 fix)`
8. `perf(backend): batch upsert in user-profiling service (N+1 fix)`
9. `fix(backend): apply Asia/Seoul timezone to all DATE(timestamp) queries`
10. `perf(backend): reduce queryResponseCorrelation result limit`
11. `perf(frontend): add useMemo to dashboard KPI calculations`
12. `perf(frontend): extract inline functions from chart tooltip/legend formatters`
13. `perf(frontend): add request deduplication to correlation detail fetch`
14. `perf(frontend): add Suspense boundaries to dashboard pages`
15. `perf(backend): add maxKeys limit and shorter checkperiod to CacheService`

### Phase 3 Commits
16. `perf(backend): add 30s timeout to BigQuery query execution`
17. `feat(backend): enable global rate limiting with @nestjs/throttler`
18. `perf(backend): evaluate and apply lazy module loading`
19. `perf(frontend): add request deduplication to api-client`

---

## Success Criteria (Overall)

| Metric | Before | Target | Measurement |
|--------|--------|--------|-------------|
| getSampleLogs response size | ~4-5MB | < 200KB | `curl ... \| wc -c` |
| userActivityDetail response size | ~2MB | < 50KB | `curl ... \| wc -c` |
| Batch analysis (1000 items) DB ops | ~1000 | 1 | Prisma query log |
| User profiling DB ops | ~51,000 | < 500 | Prisma query log |
| Frontend build time (rebuild) | Baseline | -30%+ | `time pnpm build:frontend-next` |
| Dashboard KPI recalculation | Every render | Only on data change | React DevTools Profiler |
| Server memory (24h) | Unbounded growth | Stable plateau | Process monitoring |
| Rate limit protection | None | 100 req/min | Load test |

---

## Execution Order

```
Phase 1 (Day 1-2) - 병렬:
  Track 1A: [1A-1] -> [1A-2] -> [1A-3] -> [1A-4]
  Track 1B: [1B-1] -> [1B-2]
  (1A와 1B 동시 진행)

Phase 2 (Day 3-7) - 병렬:
  Track 2A: [2A-1] -> [2A-2] -> [2A-3] -> [2A-4]
  Track 2B: [2B-1] -> [2B-2] -> [2B-3] -> [2B-4]
  Track 2C: [2C-1]
  (2A, 2B, 2C 동시 진행)

Phase 3 (Day 8-10) - 병렬:
  Track 3A: [3A-1] -> [3A-2] -> [3A-3] -> [3A-4]
  (순차적이나, 각각 독립적이므로 개별 PR 가능)
```

---

## Next Step

이 플랜의 실행을 시작하려면 `/start-work` 명령을 실행하세요.
