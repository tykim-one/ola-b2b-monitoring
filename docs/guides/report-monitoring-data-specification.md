# Report Monitoring 데이터 명세서

> 이 문서는 Report Monitoring 기능의 데이터 소스, 컬럼, 연산식을 기술적으로 상세히 기술합니다.

---

## 1. 데이터 소스 개요

### 1.1 사용 테이블 목록

| 테이블명 | 용도 | 스키마 |
|----------|------|--------|
| `gold.daily_item_info` | 실제 리포트 데이터 저장소 | 데이터 테이블 |
| `gold.target_ai_stock` | AI 주식 검증 대상 심볼 | 타겟 테이블 |
| `gold.target_commodity` | 원자재 검증 대상 심볼 | 타겟 테이블 |
| `gold.target_forex` | 환율 검증 대상 심볼 | 타겟 테이블 |
| `gold.target_dividend` | 배당주 검증 대상 심볼 | 타겟 테이블 |

### 1.2 지원 데이터베이스

- MySQL (mysql2/promise)
- PostgreSQL (pg)

환경변수 `REPORT_DB_TYPE`으로 설정 (`mysql` 또는 `postgresql`)

---

## 2. 테이블 스키마

### 2.1 데이터 테이블: `gold.daily_item_info`

| 컬럼명 | 타입 | 설명 | 사용처 |
|--------|------|------|--------|
| `symbol` | VARCHAR | 종목/항목 식별자 | 존재 여부 체크, 신선도 체크 |
| `updated_at` | TIMESTAMP | 마지막 업데이트 시각 | 신선도 판정 |

### 2.2 타겟 테이블: `gold.target_{report_type}`

**공통 컬럼:**

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `symbol` | VARCHAR | 검증 대상 심볼 |
| `display_name` | VARCHAR | 표시용 이름 |

**특이사항 - Forex 테이블:**

| 컬럼명 | 타입 | 설명 | 매핑 |
|--------|------|------|------|
| `item_code` | VARCHAR | 환율 코드 | → `symbol`로 변환 |
| `display_name` | VARCHAR | 표시용 이름 | - |

---

## 3. SQL 쿼리 상세

### 3.1 타겟 심볼 로드

**파일:** `external-db.service.ts` → `loadTargetsFromDb()`

```sql
-- MySQL
SELECT `symbol`, `display_name`
FROM `gold.target_ai_stock`;

SELECT `symbol`, `display_name`
FROM `gold.target_commodity`;

SELECT `item_code` as `symbol`, `display_name`
FROM `gold.target_forex`;

SELECT `symbol`, `display_name`
FROM `gold.target_dividend`;

-- PostgreSQL
SELECT "symbol", "display_name"
FROM gold.target_ai_stock;

SELECT "symbol", "display_name"
FROM gold.target_commodity;

SELECT "item_code" as "symbol", "display_name"
FROM gold.target_forex;

SELECT "symbol", "display_name"
FROM gold.target_dividend;
```

### 3.2 존재 여부 체크

**파일:** `external-db.service.ts` → `checkDataExists()`

```sql
-- MySQL
SELECT DISTINCT `symbol`
FROM `gold.daily_item_info`
WHERE `symbol` IN (?, ?, ?, ...);

-- PostgreSQL
SELECT DISTINCT "symbol"
FROM gold.daily_item_info
WHERE "symbol" IN ($1, $2, $3, ...);
```

**파라미터:** 타겟 테이블에서 로드한 심볼 배열

### 3.3 신선도 체크

**파일:** `external-db.service.ts` → `checkDataFreshness()`

```sql
-- MySQL
SELECT `symbol`, MAX(`updated_at`) as updatedAt
FROM `gold.daily_item_info`
WHERE `symbol` IN (?, ?, ?, ...)
GROUP BY `symbol`;

-- PostgreSQL
SELECT "symbol", MAX("updated_at") as "updatedAt"
FROM gold.daily_item_info
WHERE "symbol" IN ($1, $2, $3, ...)
GROUP BY "symbol";
```

**파라미터:** 존재 여부 체크에서 "존재함"으로 판정된 심볼 배열

---

## 4. 연산식 상세

### 4.1 존재 여부 판정

**파일:** `external-db.service.ts` → `checkDataExists()`

```typescript
// 입력
const targetSymbols: string[];  // 타겟 테이블에서 로드한 전체 심볼
const dbSymbols: string[];      // SQL 쿼리 결과에서 반환된 심볼

// 연산
const existing = dbSymbols;                                    // DB에 존재하는 심볼
const missing = targetSymbols.filter(s => !dbSymbols.includes(s));  // 누락된 심볼

// 출력
interface ExistenceCheckResult {
  existing: string[];  // 존재하는 심볼 목록
  missing: string[];   // 누락된 심볼 목록
}
```

### 4.2 신선도 판정

**파일:** `external-db.service.ts` → `checkDataFreshness()`

```typescript
// 오늘 날짜 기준 설정 (00:00:00으로 정규화)
const today = new Date();
today.setHours(0, 0, 0, 0);

// 각 심볼별 판정
for (const item of queryResults) {
  const updatedDate = new Date(item.updatedAt);
  updatedDate.setHours(0, 0, 0, 0);  // 날짜만 비교하기 위해 시간 제거

  if (updatedDate.getTime() >= today.getTime()) {
    // FRESH: 오늘 또는 미래 날짜
    fresh.push(item.symbol);
  } else {
    // STALE: 어제 이전 날짜
    stale.push(item.symbol);

    // 지연 일수 계산
    const daysBehind = Math.floor(
      (today.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    staleDetails.push({
      symbol: item.symbol,
      updatedAt: item.updatedAt,
      daysBehind: daysBehind
    });
  }
}

// 출력
interface FreshnessCheckResult {
  fresh: string[];          // 신선한 심볼 목록
  stale: string[];          // 오래된 심볼 목록
  staleDetails: Array<{     // 오래된 데이터 상세
    symbol: string;
    updatedAt: string;
    daysBehind: number;
  }>;
}
```

### 4.3 이슈 판정

**파일:** `report-monitoring.service.ts` → `checkReport()`

```typescript
// 중요 이슈 여부 판정
const hasCriticalIssues =
  (existence.missing.length > 0) ||    // 누락 데이터 존재
  (freshness.stale.length > 0);        // 오래된 데이터 존재

// 결과: true면 Slack 알림 발송
```

### 4.4 요약 집계

**파일:** `report-monitoring.service.ts` → `runFullCheck()`

```typescript
// 입력: 각 리포트 타입별 체크 결과 배열
const results: ReportCheckResult[];

// 연산
const summary = {
  // 전체 리포트 수 (고정값: 4)
  totalReports: results.length,

  // 정상 리포트 수
  healthyReports: results.filter(r => !r.hasCriticalIssues).length,

  // 이슈 리포트 수
  issueReports: results.filter(r => r.hasCriticalIssues).length,

  // 전체 누락 수 (모든 리포트의 누락 합계)
  totalMissing: results.reduce(
    (sum, r) => sum + r.missingSymbols.length, 0
  ),

  // 전체 오래됨 수 (모든 리포트의 오래됨 합계)
  totalStale: results.reduce(
    (sum, r) => sum + r.staleSymbols.length, 0
  )
};
```

---

## 5. 결과 데이터 구조

### 5.1 단일 리포트 체크 결과

```typescript
interface ReportCheckResult {
  reportType: 'ai_stock' | 'commodity' | 'forex' | 'dividend';

  // 타겟 정보
  totalTargets: number;           // 타겟 테이블의 심볼 수

  // 존재 여부 결과
  existingCount: number;          // DB에 존재하는 심볼 수
  missingSymbols: string[];       // 누락된 심볼 목록

  // 신선도 결과
  freshCount: number;             // 오늘 업데이트된 심볼 수
  staleSymbols: string[];         // 오래된 심볼 목록
  staleDetails: StaleDetail[];    // 오래된 데이터 상세 정보

  // 판정 결과
  hasCriticalIssues: boolean;     // missing > 0 OR stale > 0

  // 메타데이터
  checkedAt: string;              // ISO 8601 타임스탬프
}
```

### 5.2 전체 모니터링 결과

```typescript
interface MonitoringResult {
  results: ReportCheckResult[];   // 4개 리포트 타입별 결과

  summary: {
    totalReports: number;         // 4 (고정)
    healthyReports: number;       // 이슈 없는 리포트 수
    issueReports: number;         // 이슈 있는 리포트 수
    totalMissing: number;         // 전체 누락 심볼 수
    totalStale: number;           // 전체 오래된 심볼 수
  };

  timestamp: string;              // ISO 8601 타임스탬프
}
```

---

## 6. 계산 흐름도

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       Report Monitoring 계산 흐름                        │
└─────────────────────────────────────────────────────────────────────────┘

  STEP 1: 타겟 로드
  ─────────────────
  gold.target_{type} 테이블
        │
        ▼
  SELECT symbol, display_name
  FROM gold.target_{type}
        │
        ▼
  targetSymbols[] = ['AAPL', 'TSLA', 'NVDA', ...]


  STEP 2: 존재 여부 체크
  ─────────────────────
  gold.daily_item_info 테이블
        │
        ▼
  SELECT DISTINCT symbol
  FROM gold.daily_item_info
  WHERE symbol IN (targetSymbols)
        │
        ▼
  dbSymbols[] = ['AAPL', 'TSLA']  (NVDA 없음)
        │
        ▼
  ┌─────────────────────────────────────┐
  │ existing = dbSymbols               │
  │ missing = targetSymbols - dbSymbols │
  │                                     │
  │ existing = ['AAPL', 'TSLA']        │
  │ missing = ['NVDA']                 │
  └─────────────────────────────────────┘


  STEP 3: 신선도 체크 (existing 심볼만)
  ────────────────────────────────────
  gold.daily_item_info 테이블
        │
        ▼
  SELECT symbol, MAX(updated_at) as updatedAt
  FROM gold.daily_item_info
  WHERE symbol IN (existing)
  GROUP BY symbol
        │
        ▼
  ┌────────────────────────────────────────────────────┐
  │  symbol  │  updatedAt           │  판정            │
  ├────────────────────────────────────────────────────┤
  │  AAPL    │  2025-01-27 09:00    │  FRESH (오늘)    │
  │  TSLA    │  2025-01-25 15:00    │  STALE (2일전)   │
  └────────────────────────────────────────────────────┘
        │
        ▼
  ┌─────────────────────────────────────────┐
  │ today = 2025-01-27 00:00:00            │
  │                                         │
  │ AAPL: 2025-01-27 >= today → FRESH      │
  │ TSLA: 2025-01-25 < today  → STALE      │
  │       daysBehind = (27-25) = 2일       │
  │                                         │
  │ fresh = ['AAPL']                       │
  │ stale = ['TSLA']                       │
  │ staleDetails = [{                      │
  │   symbol: 'TSLA',                      │
  │   updatedAt: '2025-01-25',             │
  │   daysBehind: 2                        │
  │ }]                                     │
  └─────────────────────────────────────────┘


  STEP 4: 이슈 판정
  ─────────────────
  ┌─────────────────────────────────────────┐
  │ hasCriticalIssues =                     │
  │   (missing.length > 0)  → true (NVDA)  │
  │   OR                                    │
  │   (stale.length > 0)    → true (TSLA)  │
  │                                         │
  │ 결과: hasCriticalIssues = true         │
  │       → Slack 알림 발송                 │
  └─────────────────────────────────────────┘


  STEP 5: 요약 집계 (4개 리포트 결과 종합)
  ─────────────────────────────────────────
  ┌─────────────────────────────────────────┐
  │ totalReports = 4                        │
  │ healthyReports = count(!hasCriticalIssues)│
  │ issueReports = count(hasCriticalIssues) │
  │ totalMissing = Σ missingSymbols.length  │
  │ totalStale = Σ staleSymbols.length      │
  └─────────────────────────────────────────┘
```

---

## 7. API 엔드포인트별 데이터 소스

| 엔드포인트 | HTTP | 데이터 소스 | 반환 타입 |
|------------|------|-------------|-----------|
| `/api/report-monitoring/status` | GET | 메모리 캐시 (lastResult) | `MonitoringResult` |
| `/api/report-monitoring/check` | POST | gold.daily_item_info + gold.target_* | `MonitoringResult` |
| `/api/report-monitoring/check/:type` | POST | gold.daily_item_info + gold.target_{type} | `ReportCheckResult` |
| `/api/report-monitoring/health` | GET | DB 연결 상태 + 설정값 | `HealthResponse` |
| `/api/report-monitoring/targets` | GET | gold.target_* (캐시) | `{ files: TargetFile[] }` |

---

## 8. 환경변수 참조

| 변수명 | 기본값 | 설명 | 사용처 |
|--------|--------|------|--------|
| `REPORT_DB_TYPE` | - | DB 종류 (mysql/postgresql) | ExternalDbService |
| `REPORT_DB_HOST` | - | DB 호스트 | ExternalDbService |
| `REPORT_DB_PORT` | 3306/5432 | DB 포트 | ExternalDbService |
| `REPORT_DB_USER` | - | DB 사용자 | ExternalDbService |
| `REPORT_DB_PASSWORD` | - | DB 비밀번호 | ExternalDbService |
| `REPORT_DB_NAME` | - | DB 이름 | ExternalDbService |
| `REPORT_DATA_TABLE` | gold.daily_item_info | 데이터 테이블명 | ExternalDbService |
| `REPORT_MONITOR_CRON` | 0 8 * * * | 스케줄 Cron 표현식 | Scheduler |
| `REPORT_MONITOR_TIMEZONE` | Asia/Seoul | 스케줄 시간대 | Scheduler |
| `SLACK_WEBHOOK_URL` | - | Slack 알림 URL | ReportMonitoringService |

---

## 9. 코드 파일 참조

| 파일 | 경로 | 주요 역할 |
|------|------|----------|
| Controller | `apps/backend/src/report-monitoring/report-monitoring.controller.ts` | API 라우팅 |
| Service | `apps/backend/src/report-monitoring/report-monitoring.service.ts` | 비즈니스 로직, 알림 |
| ExternalDB | `apps/backend/src/report-monitoring/external-db.service.ts` | SQL 쿼리 실행 |
| TargetLoader | `apps/backend/src/report-monitoring/target-loader.service.ts` | 타겟 캐싱 |
| Scheduler | `apps/backend/src/report-monitoring/report-monitoring.scheduler.ts` | Cron 스케줄 |
| DTO | `apps/backend/src/report-monitoring/dto/monitoring-result.dto.ts` | 타입 정의 |
| Frontend Service | `apps/frontend-next/src/services/reportMonitoringService.ts` | API 클라이언트 |
| Frontend Page | `apps/frontend-next/src/app/dashboard/report-monitoring/page.tsx` | UI 컴포넌트 |

---

*최종 업데이트: 2025-01-27*
