# Report Monitoring 완전 가이드

> 이 문서는 리포트 데이터 모니터링 시스템의 **개념부터 기술 구현까지** 모두 다룹니다.
>
> - 🔰 **일반 섹션**: 모든 독자
> - 💻 **기술 섹션**: 개발자 (접힌 상태로 제공)

---

## 목차

1. [개요](#1-개요-) - 시스템이 하는 일 (4단계 검증)
2. [검증 대상](#2-검증-대상-4종-리포트-) - 4종 리포트
3. [검증 프로세스](#3-검증-프로세스-) - 4단계 검증 흐름
4. [판정 기준](#4-판정-기준-) - 5가지 상태 판정 로직
5. [대시보드 해석](#5-대시보드-해석-) - 화면 읽는 법
6. [알림 시스템](#6-알림-시스템-) - Slack 알림
7. [자주 묻는 질문](#7-자주-묻는-질문-faq-) - FAQ
8. [기술 명세](#8-기술-명세-) - 개발자용 상세

---

## 1. 개요 🔰

리포트 모니터링 시스템은 **"우리가 제공해야 할 데이터가 제대로 있는가?"**를 자동으로 확인합니다.

### 핵심 질문 4가지

| 순서 | 질문 | 확인 내용 | 결과 |
|------|------|----------|------|
| 1️⃣ | **무엇을 검증할까?** | 타겟 테이블에서 검증 대상 목록 로드 | - |
| 2️⃣ | **데이터가 있는가?** | 실제 데이터 테이블에 존재 여부 확인 | 🔴 누락 |
| 3️⃣ | **필수값이 있는가?** | value, diff 등 필수 필드 NULL 체크 + 전날 비교 | 🟠 불완전 / 🟡 확인필요 |
| 4️⃣ | **데이터가 최신인가?** | 오늘 업데이트 되었는지 신선도 확인 | ⚠️ 오래됨 |

### 한눈에 보는 흐름

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           모니터링 검증 흐름 (4단계)                           │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1️⃣ 타겟 로드      2️⃣ 존재 여부       3️⃣ 완전성 체크       4️⃣ 신선도 확인   │
│  ────────────     ────────────      ────────────────      ─────────────    │
│                                                                              │
│  "검증 대상은     "DB에 레코드가     "필수 필드가 NULL?    "오늘 업데이트    │
│   무엇인가?"       있는가?"          전날과 값이 같은가?"   됐는가?"         │
│                                                                              │
│  gold.target_*   gold.daily_item   value, diff,           updated_at       │
│  (4개 테이블)     _info             change_value 체크     비교              │
│                       ↓                   ↓                   ↓             │
│                  🔴 누락            🟠 불완전 / 🟡 확인필요   ⚠️ 오래됨       │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 결과 상태 5가지

| 상태 | 아이콘 | 의미 | 심각도 |
|------|--------|------|--------|
| **누락 (Missing)** | 🔴 | 레코드 자체가 없음 | Critical |
| **불완전 (Incomplete)** | 🟠 | 필수 필드(value, diff 등)가 NULL | Critical |
| **확인필요 (Suspicious)** | 🟡 | 전날과 값이 동일 (ETL 이슈 의심) | Warning |
| **오래됨 (Stale)** | ⚠️ | updated_at이 오늘 아님 | Warning |
| **정상 (Valid)** | ✅ | 모든 검증 통과 | OK |

---

## 2. 검증 대상: 4종 리포트 🔰

| 리포트 타입 | 설명 | 타겟 테이블 | 예시 |
|-------------|------|-------------|------|
| **AI Stock** | AI 기반 주식 분석 | `gold.target_ai_stock` | AAPL, TSLA, NVDA |
| **Commodity** | 원자재 시세 | `gold.target_commodity` | GOLD, SILVER, OIL |
| **Forex** | 환율 | `gold.target_forex` | USD/KRW, EUR/USD |
| **Dividend** | 배당주 | `gold.target_dividend` | KO, JNJ, PG |

> 💡 **타겟 테이블에 등록된 심볼만 검증됩니다.** 새 종목을 검증하려면 해당 타겟 테이블에 추가해야 합니다.

<details>
<summary>💻 <b>개발자용: 테이블 스키마 상세</b></summary>

### 데이터 테이블: `gold.daily_item_info`

| 컬럼명 | 타입 | 설명 | 사용처 |
|--------|------|------|--------|
| `symbol` | VARCHAR | 종목/항목 식별자 | 존재 여부 체크 |
| `updated_at` | TIMESTAMP | 마지막 업데이트 시각 | 신선도 판정 |

### 타겟 테이블 공통 구조

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `symbol` | VARCHAR | 검증 대상 심볼 |
| `display_name` | VARCHAR | 표시용 이름 |

### 특이사항: Forex 테이블

Forex 테이블은 `item_code` 컬럼을 사용하며, 서비스 내부에서 `symbol`로 매핑됩니다.

```sql
-- Forex 타겟 로드 시
SELECT item_code AS symbol, display_name
FROM gold.target_forex;
```

</details>

---

## 3. 검증 프로세스 🔰

### 3.1 단계 1: 타겟 목록 로드

**무엇을 하나요?**
- 각 리포트 타입별로 "검증해야 할 심볼 목록"을 가져옵니다.

**타겟 테이블 예시 (AI Stock):**

| symbol | display_name |
|--------|--------------|
| AAPL | Apple Inc. |
| TSLA | Tesla Inc. |
| NVDA | NVIDIA Corp. |

<details>
<summary>💻 <b>개발자용: 타겟 로드 쿼리</b></summary>

```sql
-- MySQL
SELECT `symbol`, `display_name`
FROM `gold.target_ai_stock`;

-- PostgreSQL
SELECT "symbol", "display_name"
FROM gold.target_ai_stock;
```

**코드 위치:** `external-db.service.ts` → `loadTargetsFromDb()`

</details>

---

### 3.2 단계 2: 존재 여부 확인

**무엇을 하나요?**
- 타겟 목록의 각 심볼이 **실제 데이터 테이블에 있는지** 확인합니다.

**비교 방식:**

```
┌────────────────────────────────────────────────────────────────┐
│  타겟 테이블                    데이터 테이블                    │
│  (gold.target_ai_stock)        (gold.daily_item_info)          │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  AAPL  ────────────────────→   AAPL  ✅ 존재                   │
│  TSLA  ────────────────────→   TSLA  ✅ 존재                   │
│  NVDA  ────────────────────→   (없음) ❌ 누락                   │
│  AMZN  ────────────────────→   AMZN  ✅ 존재                   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**결과:**
| 상태 | 조건 | 의미 |
|------|------|------|
| ✅ **존재** | 데이터 테이블에 있음 | 정상 |
| ❌ **누락** | 데이터 테이블에 없음 | ⚠️ **심각** - 리포트 생성 불가 |

<details>
<summary>💻 <b>개발자용: 존재 여부 체크 쿼리 및 로직</b></summary>

```sql
-- MySQL
SELECT DISTINCT `symbol`
FROM `gold.daily_item_info`
WHERE `symbol` IN ('AAPL', 'TSLA', 'NVDA', 'AMZN');

-- PostgreSQL
SELECT DISTINCT "symbol"
FROM gold.daily_item_info
WHERE "symbol" IN ($1, $2, $3, $4);
```

**연산 로직:**

```typescript
// external-db.service.ts → checkDataExists()

const targetSymbols: string[];  // 타겟에서 로드한 전체 심볼
const dbSymbols: string[];      // DB 쿼리 결과

// 존재하는 심볼
const existing = dbSymbols;

// 누락된 심볼 = 타겟 - DB결과
const missing = targetSymbols.filter(s => !dbSymbols.includes(s));
```

</details>

---

### 3.3 단계 3: 완전성 체크 (NEW)

**무엇을 하나요?**
- 필수 필드(value, diff 등)가 **NULL인지** 확인합니다.
- 전날 데이터와 비교하여 **값이 동일한지** 확인합니다.
- 존재하는 데이터만 검사합니다 (누락된 건 이미 이슈).

**필수 필드 목록:**

| 리포트 타입 | NULL 체크 필드 | 전날 비교 필드 |
|-------------|---------------|---------------|
| **모든 타입** | value, diff | value, diff |
| **forex, commodity** | + change_value | + change_value, updated_at |

**판정 기준:**

| 상태 | 조건 | 의미 |
|------|------|------|
| ✅ **정상** | 모든 필수 필드 존재 + 값 변동 확인 | OK |
| 🟠 **불완전** | 필수 필드 중 NULL이 있음 | ⚠️ **심각** - 리포트에 빈 값 표시 |
| 🟡 **확인필요** | 전날과 값이 동일함 | 🔍 **경고** - ETL 파이프라인 이슈 의심 |

**예시:**

| 심볼 | value | diff | 전날 value | 판정 |
|------|-------|------|-----------|------|
| AAPL | 185.50 | 2.3% | 181.20 | ✅ 정상 |
| TSLA | NULL | 1.5% | 250.00 | 🟠 불완전 (value NULL) |
| NVDA | 890.00 | 0.0% | 890.00 | 🟡 확인필요 (값 동일) |

<details>
<summary>💻 <b>개발자용: 완전성 체크 쿼리 및 로직</b></summary>

```sql
-- PostgreSQL: 오늘/어제 데이터 비교
SELECT
  t.symbol,
  t.value as today_value,
  y.value as yesterday_value,
  t.diff as today_diff,
  y.diff as yesterday_diff
FROM gold.daily_item_info t
LEFT JOIN gold.daily_item_info y
  ON t.symbol = y.symbol
  AND DATE(y.updated_at) = DATE(t.updated_at) - INTERVAL '1 day'
WHERE t.symbol IN ($1, $2, $3)
  AND DATE(t.updated_at) = CURRENT_DATE;
```

**연산 로직:**

```typescript
// external-db.service.ts → checkDataCompleteness()

for (const item of queryResults) {
  // 1. NULL 체크
  for (const field of config.nullCheck) {
    if (item.today[field] === null) {
      missingFields.push(field);
    }
  }

  // 2. 전날 비교
  if (item.yesterday) {
    for (const field of config.compareYesterday) {
      if (item.today[field] === item.yesterday[field]) {
        unchangedFields.push(field);
      }
    }
  }

  // 결과 분류
  if (missingFields.length > 0) → incomplete
  else if (unchangedFields.length > 0) → suspicious
  else → complete
}
```

**설정 파일:** `config/required-fields.config.ts`

</details>

---

### 3.4 단계 4: 신선도 확인

**무엇을 하나요?**
- 데이터가 **오늘 업데이트 되었는지** 확인합니다.
- 존재하는 데이터만 검사합니다 (누락된 건 이미 이슈).

**판정 기준:**

| 상태 | 조건 | 의미 |
|------|------|------|
| ✅ **신선 (Fresh)** | `updated_at` ≥ 오늘 | 정상 - 최신 데이터 |
| ⚠️ **오래됨 (Stale)** | `updated_at` < 오늘 | 경고 - 어제 이전 데이터 |

**예시 (오늘: 2025-01-27):**

| 심볼 | updated_at | 판정 | 지연 일수 |
|------|------------|------|-----------|
| AAPL | 2025-01-27 | ✅ 신선 | 0일 |
| TSLA | 2025-01-26 | ⚠️ 오래됨 | 1일 |
| AMZN | 2025-01-24 | ⚠️ 오래됨 | 3일 |

<details>
<summary>💻 <b>개발자용: 신선도 체크 쿼리 및 로직</b></summary>

```sql
-- MySQL
SELECT `symbol`, MAX(`updated_at`) as updatedAt
FROM `gold.daily_item_info`
WHERE `symbol` IN ('AAPL', 'TSLA', 'AMZN')
GROUP BY `symbol`;

-- PostgreSQL
SELECT "symbol", MAX("updated_at") as "updatedAt"
FROM gold.daily_item_info
WHERE "symbol" IN ($1, $2, $3)
GROUP BY "symbol";
```

**연산 로직:**

```typescript
// external-db.service.ts → checkDataFreshness()

// 오늘 날짜 기준 (00:00:00으로 정규화)
const today = new Date();
today.setHours(0, 0, 0, 0);

for (const item of queryResults) {
  const updatedDate = new Date(item.updatedAt);
  updatedDate.setHours(0, 0, 0, 0);  // 날짜만 비교

  if (updatedDate.getTime() >= today.getTime()) {
    // FRESH: 오늘 이상
    fresh.push(item.symbol);
  } else {
    // STALE: 어제 이전
    stale.push(item.symbol);

    // 지연 일수 계산
    const daysBehind = Math.floor(
      (today.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    staleDetails.push({
      symbol: item.symbol,
      updatedAt: item.updatedAt,
      daysBehind
    });
  }
}
```

**왜 `setHours(0,0,0,0)`을 사용하나요?**

시간 부분을 제거하여 **날짜만 비교**합니다. 예를 들어:
- `2025-01-27 09:00:00` → `2025-01-27 00:00:00`
- `2025-01-27 23:59:59` → `2025-01-27 00:00:00`

이렇게 하면 "오늘 아무 시간에나 업데이트 되었으면 신선"으로 판정됩니다.

</details>

---

## 4. 판정 기준 🔰

### 4.1 개별 리포트 이슈 판정

```
hasCriticalIssues = true 조건:

  ┌─────────────────────────────────────────┐
  │                                         │
  │   누락된 심볼이 1개 이상 있거나          │
  │                 OR                      │
  │   오래된 심볼이 1개 이상 있을 때         │
  │                                         │
  └─────────────────────────────────────────┘
```

### 4.2 전체 요약 계산

| 지표 | 계산식 | 설명 |
|------|--------|------|
| 전체 리포트 수 | `4` (고정) | AI Stock, Commodity, Forex, Dividend |
| 정상 리포트 수 | 이슈 없는 리포트 개수 | `hasCriticalIssues = false` |
| 이슈 리포트 수 | 이슈 있는 리포트 개수 | `hasCriticalIssues = true` |
| 전체 누락 수 | 모든 리포트 누락 합계 | Σ `missingSymbols.length` |
| 전체 오래됨 수 | 모든 리포트 오래됨 합계 | Σ `staleSymbols.length` |

<details>
<summary>💻 <b>개발자용: 요약 집계 코드</b></summary>

```typescript
// report-monitoring.service.ts → runFullCheck()

const results: ReportCheckResult[] = [...];  // 4개 리포트 결과

const summary = {
  totalReports: results.length,  // 4

  healthyReports: results.filter(r => !r.hasCriticalIssues).length,

  issueReports: results.filter(r => r.hasCriticalIssues).length,

  totalMissing: results.reduce(
    (sum, r) => sum + r.missingSymbols.length, 0
  ),

  totalStale: results.reduce(
    (sum, r) => sum + r.staleSymbols.length, 0
  )
};
```

</details>

---

## 5. 대시보드 해석 🔰

### 5.1 KPI 카드

| 카드 | 표시 내용 | 정상 기준 |
|------|----------|----------|
| 전체 리포트 | 검증한 리포트 수 | 4 |
| 정상 | 이슈 없는 리포트 수 | 4 (모두 정상) |
| 누락 데이터 | 전체 누락 심볼 수 | 0 |
| 오래된 데이터 | 전체 오래된 심볼 수 | 0 |

### 5.2 색상 의미

| 색상 | 의미 | 조치 |
|------|------|------|
| 🟢 **초록** | 정상 | 없음 |
| 🔴 **빨강** | 이슈 있음 | 확인 필요 |

### 5.3 서비스 헬스 상태

| 상태 | 조건 | 의미 |
|------|------|------|
| 🟢 **Healthy** | DB 연결 OK + 모든 타겟 존재 | 정상 |
| 🟡 **Degraded** | DB 연결 OK + 일부 타겟 없음 | 일부 기능 제한 |
| 🔴 **Unhealthy** | DB 연결 실패 | 서비스 사용 불가 |

---

## 6. 알림 시스템 🔰

### 6.1 알림 발송 조건

| 상황 | 알림 레벨 | 색상 |
|------|----------|------|
| 누락 데이터 있음 | `critical` | 🔴 빨강 |
| 오래된 데이터만 있음 | `warning` | 🟡 노랑 |

### 6.2 알림 예시

```
🚨 리포트 데이터 이슈 감지: AI 주식

다음 이슈가 발견되었습니다:
• 3개 데이터 누락
• 2개 데이터 오래됨 (어제 이전)

리포트 타입: AI 주식
전체 타겟: 50개
누락 데이터: NVDA, META, AMD
오래된 데이터: TSLA(1일 전), AMZN(3일 전)
체크 시간: 2025-01-27T08:00:00Z
```

### 6.3 자동 실행 스케줄

| 설정 | 기본값 | 설명 |
|------|--------|------|
| 실행 시간 | 매일 08:00 | 한국 시간 기준 |
| Cron 표현식 | `0 8 * * *` | 환경변수로 변경 가능 |
| 시간대 | Asia/Seoul | 환경변수로 변경 가능 |

---

## 7. 자주 묻는 질문 (FAQ) 🔰

### Q1: "누락"과 "오래됨"의 차이는?

| 상태 | 데이터 존재 | 리포트 생성 | 심각도 |
|------|------------|------------|--------|
| **누락** | ❌ 없음 | ❌ 불가 | 🔴 심각 |
| **오래됨** | ✅ 있음 | ⚠️ 가능 (구버전) | 🟡 경고 |

### Q2: 왜 어제 이전이면 "오래됨"인가요?

리포트 데이터는 **매일 업데이트**되어야 합니다. `updated_at`이 오늘이 아니면 데이터 파이프라인에 문제가 있을 수 있습니다.

### Q3: 새 종목을 검증에 추가하려면?

해당 타겟 테이블에 레코드를 추가하면 됩니다.

```sql
-- 예: AI Stock에 META 추가
INSERT INTO gold.target_ai_stock (symbol, display_name)
VALUES ('META', 'Meta Platforms Inc.');
```

### Q4: 수동으로 체크를 실행하려면?

대시보드의 **"체크 실행"** 버튼을 클릭하면 즉시 전체 검증이 실행됩니다.

### Q5: 특정 리포트만 체크하려면?

API를 직접 호출하거나, 대시보드에서 개별 리포트의 "재검사" 버튼을 사용합니다.

---

## 8. 기술 명세 💻

> 이 섹션은 개발자를 위한 상세 기술 정보입니다.

### 8.1 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          시스템 아키텍처                                  │
└─────────────────────────────────────────────────────────────────────────┘

  Frontend (Next.js)
       │
       │ HTTP API
       ▼
  ┌─────────────────────────────────────────────────────────┐
  │  Backend (NestJS)                                        │
  │  ┌─────────────────────────────────────────────────────┐ │
  │  │ ReportMonitoringController                          │ │
  │  │   └─ API 라우팅                                     │ │
  │  └─────────────────────────────────────────────────────┘ │
  │                         │                                │
  │                         ▼                                │
  │  ┌─────────────────────────────────────────────────────┐ │
  │  │ ReportMonitoringService                             │ │
  │  │   └─ 비즈니스 로직, 알림 발송                        │ │
  │  └─────────────────────────────────────────────────────┘ │
  │           │                       │                      │
  │           ▼                       ▼                      │
  │  ┌──────────────────┐  ┌──────────────────┐              │
  │  │ ExternalDbService│  │ TargetLoaderSvc  │              │
  │  │  └─ SQL 쿼리     │  │  └─ 캐싱         │              │
  │  └──────────────────┘  └──────────────────┘              │
  │           │                       │                      │
  └───────────┼───────────────────────┼──────────────────────┘
              │                       │
              ▼                       ▼
  ┌──────────────────┐     ┌──────────────────┐
  │ gold.            │     │ gold.target_*    │
  │ daily_item_info  │     │ (4개 테이블)     │
  │ (MySQL/PostgreSQL)│     │                  │
  └──────────────────┘     └──────────────────┘
```

### 8.2 API 엔드포인트

| 엔드포인트 | Method | 설명 | 데이터 소스 |
|------------|--------|------|-------------|
| `/api/report-monitoring/status` | GET | 마지막 체크 결과 | 메모리 캐시 |
| `/api/report-monitoring/check` | POST | 전체 체크 실행 | DB 쿼리 |
| `/api/report-monitoring/check/:type` | POST | 특정 리포트 체크 | DB 쿼리 |
| `/api/report-monitoring/health` | GET | 서비스 헬스 | DB 연결 + 설정 |
| `/api/report-monitoring/targets` | GET | 타겟 목록 | 메모리 캐시 |
| `/api/report-monitoring/trigger` | POST | 스케줄러 수동 트리거 | - |

### 8.3 데이터 타입 정의

```typescript
// 리포트 타입
type ReportType = 'ai_stock' | 'commodity' | 'forex' | 'dividend';

// 단일 리포트 체크 결과
interface ReportCheckResult {
  reportType: ReportType;
  totalTargets: number;           // 타겟 심볼 수
  existingCount: number;          // 존재하는 심볼 수
  missingSymbols: string[];       // 누락된 심볼 목록
  freshCount: number;             // 신선한 심볼 수
  staleSymbols: string[];         // 오래된 심볼 목록
  staleDetails: StaleDetail[];    // 오래된 데이터 상세
  hasCriticalIssues: boolean;     // 이슈 여부
  checkedAt: string;              // ISO 타임스탬프
}

// 오래된 데이터 상세
interface StaleDetail {
  symbol: string;
  updatedAt: string;
  daysBehind: number;
}

// 전체 모니터링 결과
interface MonitoringResult {
  results: ReportCheckResult[];
  summary: MonitoringSummary;
  timestamp: string;
}

// 요약
interface MonitoringSummary {
  totalReports: number;
  healthyReports: number;
  issueReports: number;
  totalMissing: number;
  totalStale: number;
}
```

### 8.4 전체 계산 흐름도

```
STEP 1: 타겟 로드
──────────────────
gold.target_{type}
      │
      ▼
targetSymbols[] = ['AAPL', 'TSLA', 'NVDA', ...]


STEP 2: 존재 여부 체크
──────────────────────
SELECT DISTINCT symbol
FROM gold.daily_item_info
WHERE symbol IN (targetSymbols)
      │
      ▼
dbSymbols[] = ['AAPL', 'TSLA']
      │
      ▼
┌───────────────────────────────────┐
│ existing = dbSymbols             │
│ missing = targetSymbols - dbSymbols│
│                                   │
│ existing = ['AAPL', 'TSLA']      │
│ missing = ['NVDA']               │
└───────────────────────────────────┘


STEP 3: 신선도 체크 (existing만)
─────────────────────────────────
SELECT symbol, MAX(updated_at)
FROM gold.daily_item_info
WHERE symbol IN (existing)
GROUP BY symbol
      │
      ▼
┌───────────────────────────────────────┐
│ today = 2025-01-27 00:00:00          │
│                                       │
│ AAPL: 01-27 >= today → FRESH         │
│ TSLA: 01-25 < today  → STALE (2일)   │
│                                       │
│ fresh = ['AAPL']                     │
│ stale = ['TSLA']                     │
└───────────────────────────────────────┘


STEP 4: 이슈 판정
─────────────────
hasCriticalIssues =
  (missing.length > 0) OR (stale.length > 0)
      │
      ▼
true → Slack 알림 발송


STEP 5: 요약 집계
─────────────────
totalReports = 4
healthyReports = count(!hasCriticalIssues)
issueReports = count(hasCriticalIssues)
totalMissing = Σ missing.length
totalStale = Σ stale.length
```

### 8.5 환경변수

| 변수명 | 기본값 | 설명 |
|--------|--------|------|
| `REPORT_DB_TYPE` | - | DB 종류 (`mysql`/`postgresql`) |
| `REPORT_DB_HOST` | - | DB 호스트 |
| `REPORT_DB_PORT` | 3306/5432 | DB 포트 |
| `REPORT_DB_USER` | - | DB 사용자 |
| `REPORT_DB_PASSWORD` | - | DB 비밀번호 |
| `REPORT_DB_NAME` | - | DB 이름 |
| `REPORT_DATA_TABLE` | gold.daily_item_info | 데이터 테이블명 |
| `REPORT_MONITOR_CRON` | 0 8 * * * | 스케줄 Cron |
| `REPORT_MONITOR_TIMEZONE` | Asia/Seoul | 시간대 |
| `SLACK_WEBHOOK_URL` | - | Slack 알림 URL |

### 8.6 소스 파일 위치

| 파일 | 경로 | 역할 |
|------|------|------|
| Controller | `apps/backend/src/report-monitoring/report-monitoring.controller.ts` | API 라우팅 |
| Service | `apps/backend/src/report-monitoring/report-monitoring.service.ts` | 비즈니스 로직 |
| ExternalDB | `apps/backend/src/report-monitoring/external-db.service.ts` | SQL 쿼리 |
| TargetLoader | `apps/backend/src/report-monitoring/target-loader.service.ts` | 타겟 캐싱 |
| Scheduler | `apps/backend/src/report-monitoring/report-monitoring.scheduler.ts` | Cron 스케줄 |
| DTO | `apps/backend/src/report-monitoring/dto/` | 타입 정의 |
| Frontend | `apps/frontend-next/src/app/dashboard/report-monitoring/page.tsx` | UI |
| Service | `apps/frontend-next/src/services/reportMonitoringService.ts` | API 클라이언트 |

---

## 9. 용어 정리 🔰

| 용어 | 영문 | 설명 |
|------|------|------|
| 심볼 | Symbol | 종목 코드 (예: AAPL, TSLA) |
| 타겟 | Target | 검증해야 할 심볼 목록 |
| 신선 | Fresh | 오늘 업데이트된 데이터 |
| 오래됨 | Stale | 어제 이전에 업데이트된 데이터 |
| 누락 | Missing | 데이터 테이블에 없는 심볼 |
| 지연 일수 | Days Behind | 마지막 업데이트로부터 경과한 일수 |

---

*최종 업데이트: 2025-01-27*
