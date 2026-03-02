# hana-mts 모니터링 시스템 구현 계획

## 개요

hana-securities API 서버의 BigQuery 로그를 기반으로 **API 트래픽 대시보드**와 **배치 동기화 모니터링** 대시보드를 구축합니다.

- **데이터소스**: `finola-global.hana_mts_monitoring.v_hana_mts_logs` (View, 이미 생성됨)
- **로그 유형**: `API_REQUEST` (HTTP 요청), `BATCH_SYNC` (배치 동기화)
- **일일 리포트**: 불필요 (제외)

---

## Phase 1: 백엔드 기반 구축

### 1.1 환경변수 추가

**파일**: `apps/backend/.env`

```env
# Hana MTS Monitoring
HANA_MTS_BQ_PROJECT=finola-global
HANA_MTS_BQ_DATASET=hana_mts_monitoring
HANA_MTS_BQ_VIEW=v_hana_mts_logs
```

기존 ibk-chat은 `BIGQUERY_DATASET`/`BIGQUERY_TABLE`을 공용으로 사용하지만, hana-mts는 별도 데이터셋이므로 전용 env var를 사용합니다.

### 1.2 백엔드 모듈 구조

```
apps/backend/src/hana-mts/
├── hana-mts.module.ts              # NestJS 모듈 정의
├── hana-mts.controller.ts          # REST API 엔드포인트
├── hana-mts.service.ts             # 비즈니스 로직 (BigQuery 조회)
├── queries/
│   └── hana-mts.queries.ts         # BigQuery SQL 빌더 (View 대상)
└── interfaces/
    └── hana-mts.interface.ts       # 타입 정의
```

### 1.3 인터페이스 정의

**파일**: `hana-mts/interfaces/hana-mts.interface.ts`

```typescript
// API 트래픽 KPI
export interface ApiTrafficKPI {
  totalRequests: number;
  errorCount: number;
  errorRate: number;
  avgDurationMs: number;
  p95DurationMs: number;
  p99DurationMs: number;
  uniqueClients: number;
}

// 시간별 트래픽
export interface HourlyApiTraffic {
  hourKst: number;
  requestCount: number;
  errorCount: number;
  avgDurationMs: number;
}

// 엔드포인트별 통계
export interface EndpointStats {
  path: string;
  method: string;
  requestCount: number;
  errorCount: number;
  errorRate: number;
  avgDurationMs: number;
  p95DurationMs: number;
}

// 느린 요청
export interface SlowRequest {
  timestamp: string;
  method: string;
  path: string;
  query: string;
  status: number;
  durationMs: number;
  clientIp: string;
}

// 배치 동기화 요약
export interface BatchSyncSummary {
  totalRuns: number;
  avgDurationSec: number;
  lastRunAt: string;
  lastWindCount: number;
  lastMinkabuCount: number;
}

// 배치 실행 이력
export interface BatchSyncRun {
  triggeredAt: string;
  completedAt: string | null;
  durationSec: number | null;
  cnWindCount: number | null;
  jpMinkabuCount: number | null;
  status: 'triggered' | 'started' | 'completed';
}

// 일별 배치 트렌드
export interface DailyBatchTrend {
  dateKst: string;
  runCount: number;
  avgDurationSec: number;
  totalWindCount: number;
  totalMinkabuCount: number;
}
```

### 1.4 BigQuery 쿼리 (View 대상)

**파일**: `hana-mts/queries/hana-mts.queries.ts`

모든 쿼리는 View의 `date_kst`, `hour_kst`, `log_type` 컬럼을 활용하여 간결하게 작성합니다.

**API 트래픽 쿼리 (5종)**:
1. `apiTrafficKPI(date)` - 일일 KPI (총 요청, 에러율, 응답시간 분위수, 고유 클라이언트)
2. `hourlyApiTraffic(date)` - 시간별 트래픽 집계
3. `endpointStats(date)` - 엔드포인트별 통계 (path+method 기준)
4. `slowRequests(date, limit)` - 느린 요청 Top N (duration_ms DESC)
5. `apiErrorList(date)` - 에러 요청 목록 (status >= 400)

**배치 모니터링 쿼리 (3종)**:
6. `batchSyncSummary(date)` - 배치 요약 (당일 실행 횟수, 평균 소요시간)
7. `batchSyncRuns(date)` - 배치 실행 이력 (triggered/started/completed 매칭)
8. `dailyBatchTrend(days)` - 일별 배치 트렌드 (N일간)

### 1.5 컨트롤러 API 엔드포인트

**라우트 프리픽스**: `/api/hana-mts`

| Method | Path | 설명 | 캐시 |
|--------|------|------|------|
| `GET` | `/api/hana-mts/api-traffic/kpi` | API 트래픽 KPI | 5분 |
| `GET` | `/api/hana-mts/api-traffic/hourly` | 시간별 트래픽 | 15분 |
| `GET` | `/api/hana-mts/api-traffic/endpoints` | 엔드포인트별 통계 | 15분 |
| `GET` | `/api/hana-mts/api-traffic/slow-requests` | 느린 요청 Top N | 5분 |
| `GET` | `/api/hana-mts/api-traffic/errors` | 에러 요청 목록 | 5분 |
| `GET` | `/api/hana-mts/batch/summary` | 배치 요약 | 5분 |
| `GET` | `/api/hana-mts/batch/runs` | 배치 실행 이력 | 5분 |
| `GET` | `/api/hana-mts/batch/trend` | 일별 배치 트렌드 | 15분 |

**공통 쿼리 파라미터**: `?date=YYYY-MM-DD` (기본: 오늘 KST), `?days=N` (트렌드용)

### 1.6 app.module.ts 등록

`HanaMtsModule`을 `imports[]`에 추가합니다.

---

## Phase 2: 프론트엔드 구축

### 2.1 서비스 설정 등록

**파일 1**: `packages/shared-types/src/service.types.ts`
- `ServiceType`에 기존 `'custom'` 타입 활용 (새 타입 추가 불필요)

**파일 2**: `apps/frontend-next/src/config/services.ts`

```typescript
{
  id: 'hana-mts',
  name: 'Hana MTS',
  type: 'custom',
  icon: 'Globe',
  description: 'API 트래픽 & 배치 동기화 모니터링',
  card: {
    kpis: [
      { key: 'totalRequests', label: '총 요청', format: 'number' },
      { key: 'errorRate', label: '에러율', format: 'percentage', thresholds: { warning: 1, error: 5 } },
      { key: 'avgResponseTime', label: '평균 응답', format: 'duration' },
    ],
    chart: { type: 'line', dataKey: 'traffic', label: '시간별 트래픽' }
  },
  menu: [
    { id: 'api-traffic', label: 'API 트래픽', path: '/api-traffic' },
    { id: 'batch', label: '배치 모니터링', path: '/batch' },
  ]
}
```

**파일 3**: `apps/frontend-next/src/config/service-mapping.ts`

```typescript
'hana-mts': {
  projectId: 'hana-mts',
  apiPrefix: '/api/hana-mts',
},
```

### 2.2 프론트엔드 페이지 구조

```
apps/frontend-next/src/app/dashboard/services/[serviceId]/
├── api-traffic/
│   └── page.tsx          # API 트래픽 대시보드
└── batch/
    └── page.tsx          # 배치 모니터링 대시보드
```

레이아웃(`layout.tsx`)과 개요 페이지(`page.tsx`)는 기존 config-driven 구조가 자동 처리합니다.

### 2.3 API 트래픽 대시보드 (`api-traffic/page.tsx`)

**구성 요소**:
1. **KPI 카드 행** (4개): 총 요청 수, 에러율, 평균 응답시간, P95 응답시간
2. **시간별 트래픽 차트**: `AreaChart` (Recharts) - 요청 수 + 에러 수 오버레이
3. **엔드포인트별 테이블**: DataTable - path, method, 요청수, 에러율, 평균/P95 응답시간
4. **느린 요청 테이블**: DataTable - 응답시간 기준 Top 20

**날짜 필터**: 상단에 날짜 선택기 (기본: 오늘)

### 2.4 배치 모니터링 대시보드 (`batch/page.tsx`)

**구성 요소**:
1. **KPI 카드 행** (4개): 오늘 실행 횟수, 평균 소요시간, 최근 Wind 건수, 최근 Minkabu 건수
2. **배치 실행 타임라인**: 당일 배치 실행 이력 테이블 (triggered→completed, 소요시간, 데이터 건수)
3. **소요시간 트렌드 차트**: `LineChart` - 최근 N일 평균 소요시간
4. **데이터 건수 트렌드 차트**: `AreaChart` - Wind/Minkabu 일별 누적 건수

**기간 필터**: 7일/14일/30일 선택

### 2.5 React Query 훅

**파일**: `apps/frontend-next/src/hooks/queries/use-hana-mts.ts`

```typescript
// API 트래픽
useHanaMtsApiKPI(date)
useHanaMtsHourlyTraffic(date)
useHanaMtsEndpoints(date)
useHanaMtsSlowRequests(date)
useHanaMtsErrors(date)

// 배치
useHanaMtsBatchSummary(date)
useHanaMtsBatchRuns(date)
useHanaMtsBatchTrend(days)
```

---

## Phase 3: 통합 및 검증

### 3.1 빌드 검증
- `pnpm build:backend` 성공 확인
- `pnpm build:frontend-next` 성공 확인
- 린트 통과 확인

### 3.2 기능 검증
- 백엔드 API 응답 확인 (BigQuery View 연동)
- 프론트엔드 라우팅 확인 (`/dashboard/services/hana-mts/`)
- 대시보드 렌더링 확인

---

## 작업 순서 요약

| 순서 | 작업 | 예상 파일 수 |
|------|------|-------------|
| 1 | 백엔드 모듈 (interfaces, queries, service, controller, module) | 5 |
| 2 | app.module.ts 등록 + .env 추가 | 2 |
| 3 | 프론트엔드 서비스 설정 (services.ts, service-mapping.ts) | 2 |
| 4 | React Query 훅 | 1 |
| 5 | API 트래픽 대시보드 페이지 | 1 |
| 6 | 배치 모니터링 대시보드 페이지 | 1 |
| 7 | 빌드 검증 | - |
| **합계** | | **12 파일** |

---

## 범위 외 (향후 확장)

- 일일 리포트 자동 생성 (현재 불필요)
- 실시간 알림 (Slack 웹훅)
- 이상 탐지 (응답시간 급증, 배치 실패 감지)
- 클라이언트 IP 기반 사용자 분석
- ticker 파라미터 기반 인기 종목 분석
