# OLA B2B Monitoring 대시보드 메트릭 가이드

> 세미나용 문서 - 각 페이지별 데이터 및 계산식 정리

---

## 목차

1. [시스템 아키텍처 개요](#1-시스템-아키텍처-개요)
2. [Operations 대시보드](#2-operations-대시보드-실시간-운영-모니터링)
3. [Business 대시보드](#3-business-대시보드-비즈니스-분석)
4. [Quality 대시보드](#4-quality-대시보드-품질-분석)
5. [AI Performance 대시보드](#5-ai-performance-대시보드-ai-성능-분석)
6. [Chatbot Quality 대시보드](#6-chatbot-quality-대시보드-챗봇-품질-분석)
7. [User Analytics 대시보드](#7-user-analytics-대시보드-사용자-분석)
8. [ETL Monitoring 대시보드](#8-etl-monitoring-대시보드)
9. [Report Monitoring 대시보드](#9-report-monitoring-대시보드-리포트-검증)
10. [공통 기술 스택](#10-공통-기술-스택)

---

## 1. 시스템 아키텍처 개요

### 전체 데이터 흐름

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 16)                        │
│  React 19 + TanStack Query + Recharts + Tailwind CSS (Dark Theme)  │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │ REST API
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        BACKEND (NestJS)                             │
│              Controller → Service (Cache) → DataSource              │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          ▼                       ▼                       ▼
    ┌───────────┐          ┌───────────┐          ┌───────────┐
    │  BigQuery │          │ PostgreSQL│          │   SQLite  │
    │  (Logs)   │          │   (ETL)   │          │  (Admin)  │
    └───────────┘          └───────────┘          └───────────┘
```

### 캐싱 전략

| TTL | 시간 | 적용 대상 |
|-----|------|----------|
| **SHORT** | 5분 | 실시간 KPI, 에러 분석, 이상 탐지 |
| **MEDIUM** | 15분 | 시간별/일별 트래픽, 비용 트렌드, 테넌트 사용량 |
| **LONG** | 1시간 | 정적 데이터 |

### BigQuery 테이블 스키마 (Flat Schema)

```sql
-- 주요 필드
timestamp: TIMESTAMP          -- 로그 발생 시간
tenant_id: STRING            -- 테넌트 식별자
success: BOOL                -- 성공 여부 (TRUE/FALSE)
input_tokens: STRING         -- 입력 토큰 (CAST 필요)
output_tokens: STRING        -- 출력 토큰 (CAST 필요)
total_tokens: STRING         -- 전체 토큰 (CAST 필요)
user_input: STRING           -- 사용자 질문
llm_response: STRING         -- LLM 응답
severity: STRING             -- 로그 레벨 (INFO/WARN/ERROR)
request_metadata: STRUCT     -- 메타데이터 (session_id, x_enc_data 등)
```

---

## 2. Operations 대시보드 (실시간 운영 모니터링)

**경로**: `/dashboard/operations`

### KPI 카드 (4개)

| 메트릭 | 설명 | 계산식 |
|--------|------|--------|
| **총 요청 (24h)** | 24시간 총 요청 수 | `COUNT(*)` |
| **에러율** | 실패 요청 비율 | `COUNTIF(success = FALSE) * 100.0 / COUNT(*)` |
| **평균 토큰** | 요청당 평균 토큰 | `AVG(CAST(total_tokens AS FLOAT64))` |
| **활성 테넌트** | 고유 테넌트 수 | `COUNT(DISTINCT tenant_id)` |

### 차트

#### 1) 시간별 트래픽 (RealtimeTrafficChart)
```sql
SELECT
  TIMESTAMP_TRUNC(timestamp, HOUR) as hour,
  COUNT(*) as request_count,           -- 파란색 영역
  COUNTIF(success = FALSE) as fail_count  -- 빨간색 영역
FROM logs
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
GROUP BY hour
ORDER BY hour DESC
```

#### 2) 서비스 가용성 게이지 (ErrorGauge)
- **표시값**: `successRate = 100 - error_rate`
- **임계값**: 1% (에러율 1% 초과 시 빨간색)

### API 엔드포인트

| 엔드포인트 | 캐시 TTL | 반환 타입 |
|-----------|---------|----------|
| `GET /api/metrics/realtime?days=1` | 5분 | RealtimeKPI |
| `GET /api/metrics/hourly?days=1` | 15분 | HourlyTraffic[] |

---

## 3. Business 대시보드 (비즈니스 분석)

**경로**: `/dashboard/business`

### KPI 카드 (4개)

| 메트릭 | 설명 | 계산식 |
|--------|------|--------|
| **총 토큰 사용량** | 30일 전체 토큰 | `SUM(tenantUsage.total_tokens)` |
| **예상 비용** | 30일 추정 비용 | `SUM(costTrend.total_cost)` |
| **총 요청 수** | 30일 전체 요청 | `SUM(tenantUsage.request_count)` |
| **활성 테넌트** | 테넌트 수 | `tenantUsage.length` |

### 비용 계산 공식 ⭐

```sql
-- 기본 가격 (100만 토큰당)
INPUT_PRICE  = $0.03 (3센트)
OUTPUT_PRICE = $0.15 (15센트)

-- 일별 비용 계산
input_cost = SUM(input_tokens) * 3 / 1,000,000
output_cost = SUM(output_tokens) * 15 / 1,000,000
total_cost = input_cost + output_cost
```

**예시**: 100만 input + 200만 output 토큰
- input_cost = $3.00
- output_cost = $30.00
- **total_cost = $33.00**

### 차트

#### 1) 비용 트렌드 (CostTrendChart)
```sql
SELECT
  DATE(timestamp) as date,
  ROUND(SUM(CAST(input_tokens AS FLOAT64)) * 3 / 1000000, 4) as input_cost,
  ROUND(SUM(CAST(output_tokens AS FLOAT64)) * 15 / 1000000, 4) as output_cost,
  ROUND(input_cost + output_cost, 4) as total_cost
FROM logs
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY date
ORDER BY date DESC
```

#### 2) 테넌트 사용량 파이차트 (TenantPieChart)
- X축: 테넌트 ID
- Y축: 총 토큰 사용량

#### 3) 사용량 히트맵 (UsageHeatmap)
```sql
SELECT
  EXTRACT(DAYOFWEEK FROM timestamp) as day_of_week,  -- 1-7 (일-토)
  EXTRACT(HOUR FROM timestamp) as hour,               -- 0-23
  COUNT(*) as request_count
FROM logs
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY day_of_week, hour
```
- **색상 강도**: `intensity = request_count / max_request_count`

### API 엔드포인트

| 엔드포인트 | 캐시 TTL | 반환 타입 |
|-----------|---------|----------|
| `GET /api/analytics/tenant-usage?days=30` | 15분 | TenantUsage[] |
| `GET /api/analytics/cost-trend` | 15분 | CostTrend[] |
| `GET /api/analytics/heatmap` | 15분 | UsageHeatmapCell[] |

---

## 4. Quality 대시보드 (품질 분석)

**경로**: `/dashboard/quality`

### KPI 카드 (4개)

| 메트릭 | 설명 | 계산식 |
|--------|------|--------|
| **평균 효율성** | Output/Input 비율 | `AVG(output_tokens / input_tokens)` |
| **총 요청 수** | 기간 내 요청 | `SUM(total_requests)` |
| **평균 응답 길이** | 응답 문자 수 | `AVG(LENGTH(llm_response))` |
| **FAQ 후보** | 고빈도 패턴 | `COUNT(occurrence_count >= 5)` |

### 핵심 공식

#### 1) 토큰 효율성 비율
```sql
efficiency_ratio = output_tokens / NULLIF(input_tokens, 0)

-- 해석
-- > 1.0: 입력보다 긴 응답 (상세한 답변)
-- < 1.0: 입력보다 짧은 응답 (간결한 답변)
-- ≈ 1.0: 균형잡힌 응답
```

#### 2) 쿼리-응답 상관관계 (Pearson 상관계수)
```
r = (n∑xy - ∑x∑y) / √[(n∑x² - (∑x)²)(n∑y² - (∑y)²)]

x = query_length (질문 길이)
y = response_length (응답 길이)
```
- **r > 0.5**: 강한 양의 상관관계 (긴 질문 → 긴 응답)

#### 3) 반복 질문 패턴 (FAQ 후보)
```sql
-- 질문 정규화
normalized = LOWER(REGEXP_REPLACE(
  TRIM(SUBSTR(user_input, 1, 100)),
  r'[0-9]+', '#'  -- 숫자를 #로 대체
))

-- 그룹화
GROUP BY normalized_query
HAVING COUNT(*) >= 2  -- 2회 이상 반복
```

### 차트

| 차트 | 시각화 | 데이터 |
|-----|--------|--------|
| **효율성 트렌드** | 라인 차트 (min/avg/max 밴드) | 30일 일별 효율성 |
| **상관관계 산점도** | 스캐터 플롯 + Pearson r | 질문/응답 길이 |
| **FAQ 패턴 테이블** | 테이블 | 반복 질문 Top 20 |

### API 엔드포인트

| 엔드포인트 | 캐시 TTL | 반환 타입 |
|-----------|---------|----------|
| `GET /api/quality/efficiency-trend?days=30` | 15분 | EfficiencyTrend[] |
| `GET /api/quality/query-response-correlation?days=7` | 15분 | CorrelationData[] |
| `GET /api/quality/repeated-patterns?days=30` | 15분 | RepeatedPattern[] |

---

## 5. AI Performance 대시보드 (AI 성능 분석)

**경로**: `/dashboard/ai-performance`

### KPI 카드 (4개)

| 메트릭 | 설명 | 계산식 |
|--------|------|--------|
| **평균 효율 비율** | Output/Input | `AVG(efficiency_ratio)` |
| **평균 토큰/요청** | 요청당 토큰 | `AVG(total_tokens)` |
| **응답 성공률** | 성공 비율 | `(success_count / total) * 100` |
| **P99 토큰** | 99번째 백분위 | `APPROX_QUANTILES(..., 100)[99]` |

### 이상 탐지 알고리즘 (Z-Score) ⭐

```typescript
// Z-Score 계산
Z = (X - μ) / σ

// X: 관측값, μ: 평균, σ: 표준편차
```

#### 심각도 분류

| Z-Score | 심각도 | 신뢰구간 | 의미 |
|---------|--------|----------|------|
| |Z| ≥ 4 | 🔴 Critical | 99.99% | 극단적 이상치 |
| |Z| ≥ 3 | 🟠 High | 99.7% | 이상치 (3-sigma) |
| |Z| ≥ 2 | 🟡 Medium | 95% | 주의 필요 |
| |Z| < 2 | 🟢 Low | - | 정상 범위 |

#### 이상 탐지 임계값
```sql
-- 프론트엔드에서 표시하는 임계값
threshold = avg_tokens + 3 * stddev_tokens
-- 이 값을 초과하면 "이상치"로 판정
```

### BigQuery 통계 쿼리

```sql
SELECT
  tenant_id,
  AVG(CAST(total_tokens AS FLOAT64)) as avg_tokens,
  STDDEV(CAST(total_tokens AS FLOAT64)) as stddev_tokens,
  APPROX_QUANTILES(
    CAST(CAST(total_tokens AS FLOAT64) AS INT64),
    100
  )[OFFSET(99)] as p99_tokens,
  COUNT(*) as sample_count
FROM logs
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY tenant_id
```

### API 엔드포인트

| 엔드포인트 | 캐시 TTL | 반환 타입 |
|-----------|---------|----------|
| `GET /api/ai/token-efficiency?days=7` | 15분 | TokenEfficiency[] |
| `GET /api/ai/anomaly-stats?days=30` | 5분 | AnomalyStats[] |
| `GET /ml/anomaly/detect` | - | AnomalyResult[] |

---

## 6. Chatbot Quality 대시보드 (챗봇 품질 분석)

**경로**: `/dashboard/chatbot-quality`

### KPI 카드 (4개)

| 메트릭 | 설명 | 계산식 |
|--------|------|--------|
| **불만 표현 쿼리** | 감정 키워드 포함 | `COUNT(sentimentFlag IN ('FRUSTRATED', 'EMOTIONAL'))` |
| **신규 패턴 발견** | 새로운 질문 유형 | `COUNT(patternType = 'NEW')` |
| **세션 성공률** | 평균 성공률 | `AVG(sessionSuccessRate)` |
| **평균 불만율** | 불만 세션 비율 | `AVG(frustrationRate)` |

### 감정 분석 키워드 탐지 ⭐

#### 감정 분류 기준

| 분류 | 한국어 키워드 | 영어 키워드 |
|------|-------------|------------|
| **FRUSTRATED** | 왜, 짜증, 화나, 답답, 최악, 환불, 고소 | stupid, useless, terrible, worst, refund |
| **URGENT** | 급해, 빨리, 당장, 지금, 즉시 | urgent, asap, immediately, hurry |
| **EMOTIONAL** | ㅠㅠ, ㅜㅜ, ㅡㅡ, ;;, !!!, ??? | - |
| **NEUTRAL** | (위 패턴 없음) | - |

#### 불만 점수 계산
```typescript
frustrationLevel = min(1.0,
  (negativeKeywordCount * 0.15) +  // 최대 0.6
  (negativePatternCount * 0.1) +   // 최대 0.3
  (capsRatio > 0.5 ? 0.1 : 0)      // 대문자 비율
)
```

### 신규 패턴 탐지 로직

```sql
-- 질문 정규화
normalized = LOWER(REGEXP_REPLACE(user_input, r'[0-9]+', 'N'))

-- 패턴 분류
NEW: 최근 7일 출현 + 과거 90일 미출현
EMERGING: recent_count > historical_count * 3 (3배 이상 증가)
```

### 재질문 패턴 탐지

```typescript
// Jaccard 유사도 기반
similarityScore = 1.0 - (uniqueQueries / totalQueries)

// 재질문 조건: 50% 이상 중복
totalQueries > uniqueQueries * 1.5
```

### API 엔드포인트

| 엔드포인트 | 캐시 TTL | 반환 타입 |
|-----------|---------|----------|
| `GET /api/quality/emerging-patterns?recentDays=7` | 15분 | EmergingPattern[] |
| `GET /api/quality/sentiment?days=7` | 5분 | SentimentResult[] |
| `GET /api/quality/rephrased-queries?days=7` | 15분 | RephrasedQuery[] |
| `GET /api/quality/tenant-summary?days=7` | 15분 | TenantSummary[] |

---

## 7. User Analytics 대시보드 (사용자 분석)

**경로**: `/dashboard/user-analytics`

### 사용자 식별 방식

```sql
-- x_enc_data: 암호화된 사용자 식별자
-- request_metadata STRUCT에서 직접 접근
request_metadata.x_enc_data AS userId
```

### KPI 카드 (4개)

| 메트릭 | 설명 | 계산식 |
|--------|------|--------|
| **총 유저 수** | 고유 사용자 | `COUNT(DISTINCT x_enc_data)` |
| **총 질문 수** | 전체 요청 | `SUM(questionCount)` |
| **총 토큰 사용량** | 전체 토큰 | `SUM(totalTokens)` |
| **유저당 평균 요청** | 평균 활동량 | `totalQuestions / totalUsers` |

### 사용자별 집계 쿼리

```sql
SELECT
  request_metadata.x_enc_data AS userId,
  COUNT(*) AS questionCount,
  COUNTIF(success = TRUE) AS successCount,
  ROUND(COUNTIF(success = TRUE) * 100.0 / COUNT(*), 2) AS successRate,
  SUM(CAST(total_tokens AS FLOAT64)) AS totalTokens,
  MIN(timestamp) AS firstActivity,
  MAX(timestamp) AS lastActivity
FROM logs
WHERE request_metadata.x_enc_data IS NOT NULL
GROUP BY userId
ORDER BY questionCount DESC
```

### API 엔드포인트

| 엔드포인트 | 캐시 TTL | 반환 타입 |
|-----------|---------|----------|
| `GET /api/analytics/user-list?days=7` | 15분 | UserListItem[] |
| `GET /api/analytics/user-patterns?userId=xxx` | 15분 | UserPattern[] |
| `GET /api/analytics/user-activity/:userId` | 5분 | UserActivity[] |

---

## 8. ETL Monitoring 대시보드

### Wind ETL (`/dashboard/etl/wind`)

**데이터소스**: PostgreSQL (`ops.cn_wind_etl_runs`)

#### KPI 카드

| 메트릭 | 계산식 |
|--------|--------|
| **Total Runs** | `COUNT(*)` |
| **Success Rate** | `(success_count / total_runs) * 100` |
| **Avg Duration** | `AVG(duration_ms) / 1000` (초) |
| **Current Status** | `lastRunStatus` |

#### 핵심 쿼리
```sql
-- 성공률 계산
SELECT
  COUNT(*) as total_runs,
  COUNT(*) FILTER (WHERE status = 'success') as success_count,
  ROUND((success_count::numeric / total_runs) * 100, 2) as success_rate,
  AVG(duration_ms) as avg_duration
FROM ops.cn_wind_etl_runs
WHERE started_at >= NOW() - INTERVAL '7 days'
```

### Minkabu ETL (`/dashboard/etl/minkabu`)

**데이터소스**: PostgreSQL (`ops.jp_minkabu_etl_runs`)

#### KPI 카드

| 메트릭 | 계산식 |
|--------|--------|
| **Total Runs** | `COUNT(*)` |
| **Success Rate** | `(success_count / total_runs) * 100` |
| **Avg Articles** | `AVG(articles_fetched)` |
| **Current Status** | `lastRunStatus` |

### API 엔드포인트

| 모듈 | 엔드포인트 | 캐시 TTL |
|------|-----------|---------|
| Wind | `GET /api/wind-etl/summary?days=7` | 5분 |
| Wind | `GET /api/wind-etl/trend/daily?days=30` | 15분 |
| Minkabu | `GET /api/minkabu-etl/summary?days=7` | 5분 |
| Minkabu | `GET /api/minkabu-etl/stats/headlines?days=30` | 15분 |

---

## 9. Report Monitoring 대시보드 (리포트 검증)

**경로**: `/dashboard/report-monitoring`

### 검증 대상 리포트 (4종)

| 리포트 | 테이블 |
|--------|--------|
| AI Stock | `gold.target_ai_stock` |
| Commodity | `gold.target_commodity` |
| Forex | `gold.target_forex` |
| Dividend | `gold.target_dividend` |

### 이슈 카테고리 (4가지) ⭐

| 카테고리 | 심각도 | 조건 | 의미 |
|---------|--------|------|------|
| 🔴 **Missing** | Critical | 심볼이 DB에 없음 | 데이터 완전 누락 |
| 🟠 **Incomplete** | Critical | 필수 필드가 NULL | 불완전한 데이터 |
| 🟡 **Suspicious** | Warning | 어제와 값이 동일 | 파이프라인 멈춤 의심 |
| ⚠️ **Stale** | Warning | updated_at < 오늘 | 오래된 데이터 |

### 검증 로직

```sql
-- 1) 존재 확인
SELECT symbol FROM gold.daily_item_info
WHERE symbol IN (target_symbols)

-- 2) 완전성 확인 (오늘 데이터)
SELECT t.symbol, t.value, t.diff, y.value as yesterday_value
FROM gold.daily_item_info t
LEFT JOIN gold.daily_item_info y
  ON t.symbol = y.symbol
  AND DATE(y.updated_at) = DATE(t.updated_at) - INTERVAL 1 DAY
WHERE DATE(t.updated_at) = CURDATE()

-- 3) 신선도 확인
SELECT symbol, MAX(updated_at) as updatedAt
FROM gold.daily_item_info
GROUP BY symbol
```

### API 엔드포인트

| 엔드포인트 | 설명 |
|-----------|------|
| `POST /api/report-monitoring/check` | 전체 검증 실행 |
| `GET /api/report-monitoring/status` | 마지막 결과 조회 |
| `GET /api/report-monitoring/health` | 시스템 상태 |

### 스케줄링

- **기본 시간**: 매일 08:00 (Asia/Seoul)
- **환경 변수**: `REPORT_MONITOR_CRON`, `REPORT_MONITOR_TIMEZONE`

---

## 10. 공통 기술 스택

### Frontend

| 기술 | 버전 | 용도 |
|-----|------|------|
| Next.js | 16 | App Router |
| React | 19 | UI 라이브러리 |
| TanStack Query | - | 서버 상태 관리 |
| Recharts | - | 차트 시각화 |
| Tailwind CSS | - | 스타일링 (Dark Theme) |

### Backend

| 기술 | 버전 | 용도 |
|-----|------|------|
| NestJS | - | API 서버 |
| Prisma | - | SQLite ORM (Admin) |
| node-cache | - | 메모리 캐싱 |
| BigQuery | - | 로그 데이터 |
| PostgreSQL | - | ETL 데이터 |

### 차트 색상 팔레트

```css
/* Recharts 기본 색상 */
--blue:   #3b82f6  /* 주요 데이터 */
--purple: #8b5cf6  /* 보조 데이터 */
--green:  #10b981  /* 성공/긍정 */
--red:    #f43f5e  /* 에러/부정 */
--amber:  #fbbf24  /* 경고 */
```

### BigQuery 주의사항

1. **토큰 필드 캐스팅**: `CAST(total_tokens AS FLOAT64)`
2. **success 비교**: `success = TRUE` (문자열 아님)
3. **DATE 정규화**: BigQuery는 `{value: 'YYYY-MM-DD'}` 객체 반환
4. **STRUCT 접근**: `request_metadata.x_enc_data` (JSON_VALUE 불필요)

---

## 부록: 전체 API 엔드포인트 요약

### Metrics API (`/api/metrics/*`)

| 엔드포인트 | 설명 |
|-----------|------|
| `GET /metrics/realtime` | 실시간 KPI |
| `GET /metrics/hourly` | 시간별 트래픽 |

### Analytics API (`/api/analytics/*`)

| 엔드포인트 | 설명 |
|-----------|------|
| `GET /analytics/tenant-usage` | 테넌트 사용량 |
| `GET /analytics/cost-trend` | 비용 트렌드 |
| `GET /analytics/heatmap` | 사용량 히트맵 |
| `GET /analytics/user-list` | 사용자 목록 |
| `GET /analytics/user-activity/:userId` | 사용자 활동 |

### Quality API (`/api/quality/*`)

| 엔드포인트 | 설명 |
|-----------|------|
| `GET /quality/efficiency-trend` | 효율성 트렌드 |
| `GET /quality/query-response-correlation` | 상관관계 |
| `GET /quality/repeated-patterns` | FAQ 패턴 |
| `GET /quality/emerging-patterns` | 신규 패턴 |
| `GET /quality/sentiment` | 감정 분석 |
| `GET /quality/tenant-summary` | 테넌트 요약 |

### AI API (`/api/ai/*`)

| 엔드포인트 | 설명 |
|-----------|------|
| `GET /ai/token-efficiency` | 토큰 효율성 |
| `GET /ai/anomaly-stats` | 이상 탐지 통계 |

### ML API (`/ml/anomaly/*`)

| 엔드포인트 | 설명 |
|-----------|------|
| `GET /ml/anomaly/detect` | 이상 탐지 실행 |
| `GET /ml/anomaly/tokens` | 토큰 이상치 |
| `GET /ml/anomaly/errors` | 에러율 이상치 |
| `GET /ml/anomaly/traffic` | 트래픽 스파이크 |

---

*문서 작성일: 2025-02-02*
*버전: 1.0*
