# Job Monitoring Dashboard - Work Plan

## Context

### Original Request
BigQuery의 별도 프로젝트/데이터셋에 있는 뷰(`finola-global.ola_logging_monitoring.v_job_execution_logs`)에서 ETL Job 실행 로그를 조회하여 모니터링 대시보드를 구축합니다.

### BigQuery View Schema
```
insertId: STRING
config_name: STRING (프로젝트 식별자)
duration_ms: STRING (숫자이지만 STRING 타입)
failed: STRING
fetched: STRING
processed: STRING
saved: STRING
success_rate: STRING
step: STRING (예: "job_complete")
message: STRING
app_timestamp: TIMESTAMP
log_timestamp: TIMESTAMP
```

### Reference Pattern
Wind ETL 모듈의 구조를 그대로 따릅니다 (Module/Controller/Service/DataSource 4-layer + Frontend page/hooks/service).
단, Wind ETL은 PostgreSQL을 사용하고 Job Monitoring은 BigQuery를 사용합니다.

### Key Design Decisions
- **DataSource**: BigQuery 직접 접근 (기존 MetricsDataSource 인터페이스와 무관한 독립 모듈)
- **인증**: `@Public()` 데코레이터 (JWT 불필요)
- **BigQuery 프로젝트**: `finola-global` (기존 프로젝트와 다름 → 별도 환경변수)
- **타임존**: `'Asia/Seoul'` (한국 서비스)
- **캐싱**: CacheService 활용 (SHORT=5분, MEDIUM=15분)
- **SQL 파라미터 방식**: `days`와 `limit`는 내부 생성 정수이므로 `${days}`, `${limit}` 문자열 보간 사용 (Wind ETL PostgreSQL 패턴과 동일). BigQuery named parameter (`@days`) 사용하지 않음.

---

## Work Objectives

### Core Objective
ETL Job 실행 로그를 조회하여 config_name별 성공/실패 현황 그래프와 로그 메타데이터 테이블을 표시하는 대시보드 페이지를 구축합니다.

### Deliverables
1. **Backend**: `job-monitoring` NestJS 모듈 (Module, Controller, Service, DataSource, DTO)
2. **Frontend**: `/dashboard/job-monitoring` 대시보드 페이지 (KPI, BarChart, DataTable)
3. **Navigation**: Sidebar에 Job 모니터링 메뉴 추가
4. **Configuration**: 환경변수 3개 추가

### Definition of Done
- [ ] Backend API가 BigQuery 뷰에서 데이터를 정상 조회
- [ ] config_name별 성공/실패 BarChart가 렌더링
- [ ] 로그 메타데이터 DataTable이 정상 표시 (insertId, configName, durationMs, fetched, failed, processed, saved, successRate, step, message, appTimestamp, logTimestamp)
- [ ] Sidebar에서 Job 모니터링 페이지로 이동 가능
- [ ] `pnpm build` 성공 (TypeScript 에러 없음)
- [ ] `pnpm lint` 통과

---

## Must Have
- Wind ETL과 동일한 4-layer 아키텍처 (Module → Controller → Service → DataSource)
- `@Public()` 데코레이터로 인증 우회
- BigQuery 뷰 경로를 환경변수로 관리
- `'Asia/Seoul'` 타임존 사용
- CacheService 캐싱
- Swagger 문서 (`@ApiTags`, `@ApiOperation`, `@ApiQuery`)
- 프론트엔드: `@/lib/recharts` barrel import, Dashboard compound component, DataTable compound component
- `executeQuery` 헬퍼에서 `location` 옵션 포함 (`createQueryJob` options에 전달)
- `getSummary`에서 빈 결과 시 `getEmptySummary()` 반환

## Must NOT Have
- 기존 MetricsDataSource 인터페이스 구현 (이 모듈은 독립 BigQuery 접근)
- 직접 `recharts` import (반드시 `@/lib/recharts` barrel 사용)
- 타임존 없는 날짜 쿼리 (`DATE(timestamp)` 단독 사용 금지)
- 하드코딩된 BigQuery 프로젝트/데이터셋/뷰 이름
- BigQuery named parameter 문법 (`@days`, `@limit`) 사용 금지 — `executeQuery`가 params를 지원하지 않음

---

## Task Flow and Dependencies

```
[TODO 1: DTO 정의] ──────────────────────────────┐
                                                   │
[TODO 2: DataSource 구현] ← depends on TODO 1     │
                                                   │
[TODO 3: Service 구현] ← depends on TODO 1, 2     │
                                                   │
[TODO 4: Controller 구현] ← depends on TODO 1, 3  │
                                                   │
[TODO 5: Module 정의 + app.module 등록] ← depends on TODO 2, 3, 4
                                                   │
[TODO 6: Frontend 서비스 + 타입] ← depends on TODO 1 (타입 미러링)
                                                   │
[TODO 7: React Query 훅] ← depends on TODO 6      │
                                                   │
[TODO 8: Dashboard 페이지] ← depends on TODO 7    │
                                                   │
[TODO 9: Sidebar 네비게이션] ← independent         │
                                                   │
[TODO 10: 환경변수 + 검증] ← independent
```

**병렬화 가능 그룹:**
- Group A (Backend): TODO 1 → TODO 2,3,4 (병렬) → TODO 5
- Group B (Frontend): TODO 6 → TODO 7 → TODO 8
- Group C (Independent): TODO 9, TODO 10

---

## Detailed TODOs

### TODO 1: DTO 타입 정의
**File**: `apps/backend/src/job-monitoring/dto/job-monitoring.dto.ts` (NEW)

**What to create:**
```typescript
/** 단일 Job 실행 로그 */
export interface JobExecutionLog {
  insertId: string;
  configName: string;
  durationMs: number | null;     // STRING → number 캐스팅
  fetched: number | null;        // STRING → number 캐스팅
  failed: number | null;         // STRING → number 캐스팅
  processed: number | null;      // STRING → number 캐스팅
  saved: number | null;          // STRING → number 캐스팅
  successRate: number | null;    // STRING → number 캐스팅
  step: string;
  message: string;
  appTimestamp: string;
  logTimestamp: string;
}

/** config_name별 성공/실패 집계 */
export interface JobConfigSummary {
  configName: string;
  totalRuns: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgDurationMs: number | null;
}

/** 전체 요약 KPI */
export interface JobMonitoringSummary {
  totalJobs: number;
  successCount: number;
  failureCount: number;
  overallSuccessRate: number;
  avgDurationMs: number | null;
  uniqueConfigs: number;
  lastRunAt: string | null;
}
```

**Acceptance Criteria:**
- 모든 BigQuery STRING 숫자 필드가 number로 매핑
- camelCase 네이밍 (BigQuery snake_case → TypeScript camelCase)

---

### TODO 2: BigQuery DataSource 구현
**File**: `apps/backend/src/job-monitoring/job-monitoring.datasource.ts` (NEW)

**What to create:**
- `@Injectable()` 클래스 `JobMonitoringDataSource`
- BigQuery 클라이언트 초기화 (ConfigService에서 환경변수 읽기)
- `private readonly location: string` 필드 (환경변수 또는 기본값 `'asia-northeast3'`)
- 뷰 참조: `` `${projectId}.${datasetId}.${viewName}` ``
- 쿼리 헬퍼 메서드: `private async executeQuery<T>(query: string, maxResults?: number): Promise<T[]>`

**executeQuery 헬퍼 패턴 (기존 bigquery-metrics.datasource.ts와 동일):**
```typescript
private async executeQuery<T>(query: string, maxResults: number = 1000): Promise<T[]> {
  if (!this.bigQueryClient) {
    throw new Error('BigQuery client not initialized');
  }

  try {
    const options = {
      query,
      location: this.location,   // 'asia-northeast3'
      maxResults,
      jobTimeoutMs: 30000,
    };

    const [job] = await this.bigQueryClient.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    return rows as T[];
  } catch (error) {
    this.logger.error(`Query execution failed: ${error.message}`);
    throw error;
  }
}
```

**SQL 파라미터 방식 (CRITICAL):**
`days`와 `limit`는 Controller에서 parseInt로 파싱한 내부 생성 정수이므로, Wind ETL과 동일하게 `${days}` / `${limit}` 문자열 보간을 사용합니다. BigQuery named parameter (`@days`, `@limit`)는 `executeQuery` 헬퍼가 params 인자를 지원하지 않으므로 사용하지 않습니다.

**구현할 메서드:**

1. `isHealthy(): Promise<boolean>` - SELECT 1로 연결 확인
2. `getLogs(limit?: number, days?: number): Promise<JobExecutionLog[]>` - 전체 로그 조회
   ```sql
   SELECT
     insertId,
     config_name AS configName,
     SAFE_CAST(duration_ms AS FLOAT64) AS durationMs,
     SAFE_CAST(fetched AS FLOAT64) AS fetched,
     SAFE_CAST(failed AS FLOAT64) AS failed,
     SAFE_CAST(processed AS FLOAT64) AS processed,
     SAFE_CAST(saved AS FLOAT64) AS saved,
     SAFE_CAST(success_rate AS FLOAT64) AS successRate,
     step,
     message,
     FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%S', app_timestamp, 'Asia/Seoul') AS appTimestamp,
     FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%S', log_timestamp, 'Asia/Seoul') AS logTimestamp
   FROM `{view}`
   WHERE DATE(app_timestamp, 'Asia/Seoul') >= DATE_SUB(CURRENT_DATE('Asia/Seoul'), INTERVAL ${days} DAY)
   ORDER BY app_timestamp DESC
   LIMIT ${limit}
   ```

3. `getConfigSummary(days?: number): Promise<JobConfigSummary[]>` - config_name별 집계
   ```sql
   SELECT
     config_name AS configName,
     COUNT(*) AS totalRuns,
     COUNTIF(SAFE_CAST(success_rate AS FLOAT64) = 100) AS successCount,
     COUNTIF(SAFE_CAST(success_rate AS FLOAT64) < 100 OR success_rate IS NULL) AS failureCount,
     ROUND(SAFE_DIVIDE(
       COUNTIF(SAFE_CAST(success_rate AS FLOAT64) = 100),
       COUNT(*)
     ) * 100, 2) AS successRate,
     ROUND(AVG(SAFE_CAST(duration_ms AS FLOAT64)), 0) AS avgDurationMs
   FROM `{view}`
   WHERE DATE(app_timestamp, 'Asia/Seoul') >= DATE_SUB(CURRENT_DATE('Asia/Seoul'), INTERVAL ${days} DAY)
     AND step = 'job_complete'
   GROUP BY config_name
   ORDER BY totalRuns DESC
   ```

4. `getSummary(days?: number): Promise<JobMonitoringSummary>` - 전체 KPI 요약
   ```sql
   SELECT
     COUNT(*) AS totalJobs,
     COUNTIF(SAFE_CAST(success_rate AS FLOAT64) = 100) AS successCount,
     COUNTIF(SAFE_CAST(success_rate AS FLOAT64) < 100 OR success_rate IS NULL) AS failureCount,
     ROUND(SAFE_DIVIDE(
       COUNTIF(SAFE_CAST(success_rate AS FLOAT64) = 100),
       COUNT(*)
     ) * 100, 2) AS overallSuccessRate,
     ROUND(AVG(SAFE_CAST(duration_ms AS FLOAT64)), 0) AS avgDurationMs,
     COUNT(DISTINCT config_name) AS uniqueConfigs,
     FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%S', MAX(app_timestamp), 'Asia/Seoul') AS lastRunAt
   FROM `{view}`
   WHERE DATE(app_timestamp, 'Asia/Seoul') >= DATE_SUB(CURRENT_DATE('Asia/Seoul'), INTERVAL ${days} DAY)
     AND step = 'job_complete'
   ```

   **Empty-state 처리 (CRITICAL):**
   `getSummary` 메서드는 결과가 없을 때 `getEmptySummary()`를 반환합니다:
   ```typescript
   async getSummary(days = 7): Promise<JobMonitoringSummary> {
     const query = `...`;  // 위의 SQL
     const rows = await this.executeQuery<JobMonitoringSummary>(query);
     return rows[0] || this.getEmptySummary();
   }

   private getEmptySummary(): JobMonitoringSummary {
     return {
       totalJobs: 0,
       successCount: 0,
       failureCount: 0,
       overallSuccessRate: 0,
       avgDurationMs: null,
       uniqueConfigs: 0,
       lastRunAt: null,
     };
   }
   ```

**BigQuery 클라이언트 초기화 패턴:**
```typescript
private bigQueryClient: BigQuery | null = null;
private readonly location: string;

constructor(private readonly configService: ConfigService) {
  this.location = this.configService.get<string>('GCP_BQ_LOCATION', 'asia-northeast3');
}

private async getBigQueryClient(): Promise<BigQuery> {
  if (this.bigQueryClient) return this.bigQueryClient;

  const projectId = this.configService.get<string>('JOB_LOGS_BQ_PROJECT', 'finola-global');
  this.bigQueryClient = new BigQuery({ projectId });
  return this.bigQueryClient;
}
```

**환경변수:**
- `JOB_LOGS_BQ_PROJECT` (default: `finola-global`)
- `JOB_LOGS_BQ_DATASET` (default: `ola_logging_monitoring`)
- `JOB_LOGS_BQ_VIEW` (default: `v_job_execution_logs`)

**Acceptance Criteria:**
- BigQuery `createQueryJob` + `getQueryResults` 패턴 사용
- `executeQuery` 헬퍼의 `createQueryJob` options에 `location: this.location` 포함 (기존 `bigquery-metrics.datasource.ts` 패턴 준수)
- `jobTimeoutMs: 30000` 설정
- SAFE_CAST로 STRING→FLOAT64 안전 변환
- 모든 날짜 쿼리에 `'Asia/Seoul'` 타임존 명시
- SQL에서 `${days}`, `${limit}` 문자열 보간 사용 (`@days`, `@limit` named parameter 사용하지 않음)
- `getSummary`에서 빈 결과 시 `getEmptySummary()` 반환 (Wind ETL 패턴 준수)

---

### TODO 3: Service 구현 (캐싱 래퍼)
**File**: `apps/backend/src/job-monitoring/job-monitoring.service.ts` (NEW)

**What to create:**
- `@Injectable()` 클래스 `JobMonitoringService`
- CacheService 주입 + DataSource 주입
- 각 메서드에 캐시 키 생성 + `cacheService.getOrSet()` 래핑

**메서드:**
| Method | Cache TTL | Cache Key Pattern |
|--------|-----------|-------------------|
| `isHealthy()` | no cache | - |
| `getLogs(limit, days)` | SHORT (5분) | `job-monitoring:logs:{limit}:{days}` |
| `getConfigSummary(days)` | SHORT (5분) | `job-monitoring:config-summary:{days}` |
| `getSummary(days)` | SHORT (5분) | `job-monitoring:summary:{days}` |
| `invalidateCache()` | - | `job-monitoring:` 패턴 삭제 |

**Acceptance Criteria:**
- `CacheService.generateKey()` 사용
- Wind ETL Service와 동일한 캐싱 패턴

---

### TODO 4: Controller 구현
**File**: `apps/backend/src/job-monitoring/job-monitoring.controller.ts` (NEW)

**What to create:**
- `@ApiTags('Job Monitoring')` + `@Controller('api/job-monitoring')` + `@Public()`
- Swagger 문서화

**엔드포인트:**
| Method | Path | Description | Query Params |
|--------|------|-------------|-------------|
| GET | `/health` | BigQuery 연결 확인 | - |
| GET | `/logs` | 로그 목록 조회 | `limit` (기본 100), `days` (기본 7) |
| GET | `/config-summary` | config_name별 성공/실패 집계 | `days` (기본 7) |
| GET | `/summary` | 전체 KPI 요약 | `days` (기본 7) |

**응답 형식** (Wind ETL과 동일):
```typescript
{
  success: true,
  data: ...,
  count: data.length,  // 배열인 경우
  cached: true,
  cacheTTL: '5 minutes',
}
```

**Acceptance Criteria:**
- `@Public()` 데코레이터 적용
- 모든 엔드포인트에 `@ApiOperation`, `@ApiQuery`, `@ApiResponse`
- Query param을 parseInt로 안전 파싱

---

### TODO 5: Module 정의 + AppModule 등록
**File**: `apps/backend/src/job-monitoring/job-monitoring.module.ts` (NEW)
**File**: `apps/backend/src/app.module.ts` (MODIFY)

**Module 구조:**
```typescript
@Module({
  imports: [ConfigModule, CacheModule],
  controllers: [JobMonitoringController],
  providers: [JobMonitoringDataSource, JobMonitoringService],
  exports: [JobMonitoringService],
})
export class JobMonitoringModule {}
```

**app.module.ts 수정:**
- `import { JobMonitoringModule } from './job-monitoring/job-monitoring.module';`
- `imports` 배열에 `JobMonitoringModule` 추가

**Acceptance Criteria:**
- ConfigModule, CacheModule import
- AppModule의 imports에 등록

---

### TODO 6: Frontend 서비스 + 타입 정의
**File**: `apps/frontend-next/src/services/jobMonitoringService.ts` (NEW)

**What to create:**
- TypeScript 인터페이스 (백엔드 DTO 미러링): `JobExecutionLog`, `JobConfigSummary`, `JobMonitoringSummary`, `HealthCheckResponse`
- API response wrapper 타입
- `jobMonitoringApi` 객체 (선택, React Query hooks에서 직접 fetch도 가능)

**Acceptance Criteria:**
- 백엔드 DTO와 1:1 타입 매핑
- Wind ETL 서비스 파일과 동일한 구조

---

### TODO 7: React Query 훅 정의
**File**: `apps/frontend-next/src/hooks/queries/use-job-monitoring.ts` (NEW)

**What to create:**
- `jobMonitoringKeys` 쿼리 키 팩토리
- Individual hooks: `useJobMonitoringSummary`, `useJobMonitoringLogs`, `useJobConfigSummary`, `useJobMonitoringHealth`
- Combined hook: `useJobMonitoringDashboard(days)` - 모든 데이터 통합

**Query Key 구조:**
```typescript
export const jobMonitoringKeys = {
  all: ['job-monitoring'] as const,
  summary: (days: number) => [...jobMonitoringKeys.all, 'summary', { days }] as const,
  logs: (limit: number, days: number) => [...jobMonitoringKeys.all, 'logs', { limit, days }] as const,
  configSummary: (days: number) => [...jobMonitoringKeys.all, 'config-summary', { days }] as const,
  health: () => [...jobMonitoringKeys.all, 'health'] as const,
};
```

**fetchJson 패턴:**
```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`API 요청 실패: ${response.status}`);
  const json = await response.json();
  return json.data !== undefined ? json.data : json;
}
```

**Per-hook staleTime 설정 (CRITICAL):**
| Hook | staleTime | 이유 |
|------|-----------|------|
| `useJobMonitoringSummary` | `CACHE_TIME.SHORT` (5분) | KPI는 자주 갱신 필요 |
| `useJobMonitoringLogs` | `CACHE_TIME.SHORT` (5분) | 로그는 자주 갱신 필요 |
| `useJobConfigSummary` | `CACHE_TIME.SHORT` (5분) | config 집계도 자주 갱신 필요 |
| `useJobMonitoringHealth` | `CACHE_TIME.LONG` (60분) | 헬스체크는 드물게 확인 |

```typescript
const CACHE_TIME = {
  SHORT: 5 * 60 * 1000,   // 5분
  MEDIUM: 15 * 60 * 1000, // 15분
  LONG: 60 * 60 * 1000,   // 60분
};
```

**Acceptance Criteria:**
- 각 hook에 위 표에 명시된 staleTime 사용
- `useJobMonitoringDashboard`가 isLoading, error, refetch 통합

---

### TODO 8: Dashboard 페이지 구현
**File**: `apps/frontend-next/src/app/dashboard/job-monitoring/page.tsx` (NEW)

**페이지 구성:**

1. **Header**: "Job 모니터링" 제목 + DateRangeFilter
2. **KPI Cards** (4열):
   - 총 Job 수 (`summary.totalJobs`)
   - 전체 성공률 (`summary.overallSuccessRate`)
   - 평균 소요시간 (`summary.avgDurationMs` → 초 변환)
   - 활성 Config 수 (`summary.uniqueConfigs`)
3. **Charts Section** (1열, 전체 폭):
   - **config_name별 성공/실패 BarChart**: X축=configName, 성공(#10b981)/실패(#ef4444) 스택 Bar
4. **DataTable**: 로그 메타데이터 전체 컬럼
   - Columns: insertId, configName, durationMs, fetched, failed, processed, saved, successRate, step, message, appTimestamp, logTimestamp
   - DataTable.Pagination 사용 (pageSize=20)
   - sortable 컬럼: configName, durationMs, successRate, appTimestamp

**Import 패턴 (CRITICAL):**
```typescript
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from '@/lib/recharts';
import { Dashboard } from '@/components/compound/Dashboard';
import { Chart } from '@/components/compound/Chart';
import { DataTable, Column } from '@/components/compound/DataTable';
import KPICard from '@/components/kpi/KPICard';
import DateRangeFilter, { type DateRange } from '@/components/ui/DateRangeFilter';
```

**Acceptance Criteria:**
- `'use client'` 지시어
- `@/lib/recharts` barrel import (직접 `recharts` import 금지)
- Dashboard compound component 래핑
- BarChart에 config_name별 성공/실패 표시
- DataTable에 12개 컬럼 모두 표시
- DateRangeFilter로 days 파라미터 제어
- durationMs를 초 단위로 포맷팅 (ms / 1000)
- Tooltip 스타일: white background, gray border, rounded

---

### TODO 9: Sidebar 네비게이션 추가
**File**: `apps/frontend-next/src/components/Sidebar.tsx` (MODIFY)

**변경 내용:**
- '데이터 파이프라인' 섹션에 새 항목 추가:
  ```typescript
  {
    href: '/dashboard/job-monitoring',
    label: 'Job 모니터링',
    icon: (/* gear/cog SVG icon */),
  },
  ```
- **위치: "UI 모니터링" 뒤, '데이터 파이프라인' 섹션의 마지막 항목으로 추가**
  - 현재 순서: Wind ETL → Minkabu ETL → 리포트 모니터링 → UI 모니터링
  - 변경 후: Wind ETL → Minkabu ETL → 리포트 모니터링 → UI 모니터링 → **Job 모니터링**

**Acceptance Criteria:**
- 사이드바에서 클릭으로 `/dashboard/job-monitoring`으로 이동
- Active 상태 하이라이트 정상 동작
- '데이터 파이프라인' 섹션의 마지막 항목

---

### TODO 10: 환경변수 설정 + .env.example 업데이트
**File**: `apps/backend/.env` (MODIFY - 개발자가 직접 추가)
**File**: `apps/backend/.env.example` (MODIFY or CREATE if exists)

**추가할 환경변수:**
```env
# Job Monitoring BigQuery (별도 프로젝트)
JOB_LOGS_BQ_PROJECT=finola-global
JOB_LOGS_BQ_DATASET=ola_logging_monitoring
JOB_LOGS_BQ_VIEW=v_job_execution_logs
```

**Acceptance Criteria:**
- DataSource가 환경변수를 ConfigService에서 읽음
- 기본값이 있어 환경변수 미설정 시에도 동작

---

## Commit Strategy

단일 커밋으로 전체 기능을 포함:

```
feat: Job 모니터링 대시보드 추가

- BigQuery 뷰(finola-global.ola_logging_monitoring.v_job_execution_logs) 기반
- Backend: NestJS 모듈 (Controller, Service, DataSource, DTO)
- Frontend: /dashboard/job-monitoring 페이지 (KPI, BarChart, DataTable)
- config_name별 성공/실패 BarChart + 로그 메타데이터 테이블
- @Public() 인증 우회, CacheService 캐싱 적용
```

또는 2개 커밋으로 분할 가능:
1. `feat: Job 모니터링 백엔드 API 추가` (TODO 1-5, 10)
2. `feat: Job 모니터링 프론트엔드 대시보드 추가` (TODO 6-9)

---

## Success Criteria

| Criteria | Verification Method |
|----------|-------------------|
| Backend 빌드 성공 | `cd apps/backend && pnpm build` |
| Frontend 빌드 성공 | `cd apps/frontend-next && pnpm build` |
| Backend lint 통과 | `cd apps/backend && pnpm lint` |
| Frontend lint 통과 | `cd apps/frontend-next && pnpm lint` |
| API 응답 정상 | `curl http://localhost:3000/api/job-monitoring/health` |
| API 로그 조회 | `curl http://localhost:3000/api/job-monitoring/logs?limit=10&days=7` |
| API 요약 조회 | `curl http://localhost:3000/api/job-monitoring/summary?days=7` |
| API config 집계 | `curl http://localhost:3000/api/job-monitoring/config-summary?days=7` |
| 프론트엔드 페이지 렌더링 | 브라우저에서 `/dashboard/job-monitoring` 접근 |
| Sidebar 네비게이션 | 사이드바 '데이터 파이프라인' 섹션에 메뉴 표시 |

---

## Revision History

### Revision 2 (Critic Feedback)
**5 issues fixed:**

1. **[CRITICAL] Parameterized query mismatch**: Changed all SQL from BigQuery named parameters (`@days`, `@limit`) to string interpolation (`${days}`, `${limit}`). This matches Wind ETL's PostgreSQL pattern and is safe because days/limit are internally-generated integers parsed via parseInt in the Controller. The `executeQuery` helper signature remains `(query: string, maxResults?: number)` with no params argument.

2. **[MEDIUM] BigQuery location not in getBigQueryClient**: Added `private readonly location: string` field initialized from env/default. The `executeQuery` helper now includes `location: this.location` in `createQueryJob` options, matching the existing `bigquery-metrics.datasource.ts` pattern at line 127.

3. **[MEDIUM] Sidebar placement ambiguous**: Specified exact position: **After "UI 모니터링" as the last item in the "데이터 파이프라인" section**. Full order: Wind ETL → Minkabu ETL → 리포트 모니터링 → UI 모니터링 → Job 모니터링.

4. **[MINOR] No empty-state handling for getSummary**: Added `getEmptySummary()` private method returning a zero-value `JobMonitoringSummary` object (matching Wind ETL's `getEmptySummary()` at line 309). `getSummary` now returns `rows[0] || this.getEmptySummary()`.

5. **[MINOR] Per-hook staleTime not specified in TODO 7**: Added explicit per-hook staleTime table: `useJobMonitoringSummary` (SHORT/5min), `useJobMonitoringLogs` (SHORT/5min), `useJobConfigSummary` (SHORT/5min), `useJobMonitoringHealth` (LONG/60min).

---

## File Summary

### New Files (8)
1. `apps/backend/src/job-monitoring/dto/job-monitoring.dto.ts`
2. `apps/backend/src/job-monitoring/job-monitoring.datasource.ts`
3. `apps/backend/src/job-monitoring/job-monitoring.service.ts`
4. `apps/backend/src/job-monitoring/job-monitoring.controller.ts`
5. `apps/backend/src/job-monitoring/job-monitoring.module.ts`
6. `apps/frontend-next/src/services/jobMonitoringService.ts`
7. `apps/frontend-next/src/hooks/queries/use-job-monitoring.ts`
8. `apps/frontend-next/src/app/dashboard/job-monitoring/page.tsx`

### Modified Files (2)
1. `apps/backend/src/app.module.ts` - JobMonitoringModule import 추가
2. `apps/frontend-next/src/components/Sidebar.tsx` - Job 모니터링 메뉴 추가

### Total: 10 files (8 new + 2 modified)
