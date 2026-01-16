# 대시보드 메트릭 가이드

이 문서는 OLA B2B Monitoring 대시보드에서 표시하는 각 메트릭의 정의, 계산 로직, 데이터 원천을 설명합니다.

---

## 목차

1. [Operations (운영 모니터링)](#1-operations-운영-모니터링)
2. [Business (비즈니스 분석)](#2-business-비즈니스-분석)
3. [AI Performance (AI 성능 분석)](#3-ai-performance-ai-성능-분석)
4. [Quality (품질 모니터링)](#4-quality-품질-모니터링)
5. [부록 A: 캐시 전략](#부록-a-캐시-전략)
6. [부록 B: 상태 색상 기준](#부록-b-상태-색상-기준)

---

## 1. Operations (운영 모니터링)

실시간 시스템 상태와 트래픽을 모니터링하는 대시보드입니다.

### 1.1 KPI 카드

#### 총 요청 (24h)
| 항목 | 내용 |
|------|------|
| **정의** | 최근 24시간 동안의 전체 API 요청 수 |
| **계산식** | `COUNT(*)` |
| **API** | `GET /api/metrics/realtime` |
| **데이터 필드** | `total_requests` |

#### 에러율
| 항목 | 내용 |
|------|------|
| **정의** | 최근 24시간 동안 실패한 요청의 비율 |
| **계산식** | `COUNTIF(success = FALSE) * 100.0 / COUNT(*)` |
| **단위** | % (백분율) |
| **API** | `GET /api/metrics/realtime` |
| **데이터 필드** | `error_rate` |
| **상태 기준** | ≤1%: 초록 (success), >1%: 빨강 (error) |

#### 평균 토큰
| 항목 | 내용 |
|------|------|
| **정의** | 요청당 평균 토큰 사용량 (입력+출력) |
| **계산식** | `AVG(CAST(total_tokens AS FLOAT64))` |
| **API** | `GET /api/metrics/realtime` |
| **데이터 필드** | `avg_tokens` |

#### 활성 테넌트
| 항목 | 내용 |
|------|------|
| **정의** | 최근 24시간 동안 요청을 보낸 고유 테넌트 수 |
| **계산식** | `COUNT(DISTINCT tenant_id)` |
| **API** | `GET /api/metrics/realtime` |
| **데이터 필드** | `active_tenants` |

### 1.2 차트

#### RealtimeTrafficChart (시간별 트래픽)
| 항목 | 내용 |
|------|------|
| **정의** | 최근 24시간 동안의 시간별 트래픽 추이 |
| **X축** | 시간 (TIMESTAMP_TRUNC(timestamp, HOUR)) |
| **Y축** | 요청 수, 성공/실패 수, 토큰 수 |
| **API** | `GET /api/metrics/hourly` |
| **차트 타입** | Area Chart (Recharts) |

**데이터 구조:**
```typescript
interface HourlyData {
  hour: string;           // ISO 타임스탬프
  request_count: number;  // 해당 시간 총 요청 수
  success_count: number;  // 성공한 요청 수
  fail_count: number;     // 실패한 요청 수
  total_tokens: number;   // 해당 시간 총 토큰 사용량
  avg_tokens: number;     // 해당 시간 평균 토큰
}
```

#### ErrorGauge (서비스 가용성)
| 항목 | 내용 |
|------|------|
| **정의** | 현재 에러율을 게이지 형태로 표시 |
| **임계값** | 1% (이 값을 기준으로 색상 변경) |
| **데이터 소스** | `GET /api/metrics/realtime` → `error_rate` |

### 1.3 데이터 원천

#### SQL 쿼리: getRealtimeKPI

```sql
SELECT
  COUNT(*) as total_requests,
  COUNTIF(success = TRUE) as success_count,
  COUNTIF(success = FALSE) as fail_count,
  ROUND(COUNTIF(success = FALSE) * 100.0 / NULLIF(COUNT(*), 0), 2) as error_rate,
  CAST(COALESCE(SUM(CAST(total_tokens AS FLOAT64)), 0) AS INT64) as total_tokens,
  ROUND(AVG(CAST(total_tokens AS FLOAT64)), 2) as avg_tokens,
  CAST(COALESCE(SUM(CAST(input_tokens AS FLOAT64)), 0) AS INT64) as total_input_tokens,
  CAST(COALESCE(SUM(CAST(output_tokens AS FLOAT64)), 0) AS INT64) as total_output_tokens,
  COUNT(DISTINCT tenant_id) as active_tenants
FROM `{projectId}.{datasetId}.{tableName}`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
```

#### SQL 쿼리: getHourlyTraffic

```sql
SELECT
  TIMESTAMP_TRUNC(timestamp, HOUR) as hour,
  COUNT(*) as request_count,
  COUNTIF(success = TRUE) as success_count,
  COUNTIF(success = FALSE) as fail_count,
  CAST(COALESCE(SUM(CAST(total_tokens AS FLOAT64)), 0) AS INT64) as total_tokens,
  ROUND(AVG(CAST(total_tokens AS FLOAT64)), 2) as avg_tokens
FROM `{projectId}.{datasetId}.{tableName}`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
GROUP BY hour
ORDER BY hour DESC
```

| API | 캐시 TTL | 갱신 주기 |
|-----|----------|-----------|
| `/api/metrics/realtime` | 5분 (SHORT) | 프론트엔드 5분 자동 갱신 |
| `/api/metrics/hourly` | 15분 (MEDIUM) | 프론트엔드 5분 자동 갱신 |

---

## 2. Business (비즈니스 분석)

테넌트별 사용량, 비용 트렌드, 사용 패턴을 분석하는 대시보드입니다.

### 2.1 KPI 카드

#### 총 토큰 사용량
| 항목 | 내용 |
|------|------|
| **정의** | 최근 30일 동안의 전체 토큰 사용량 |
| **계산식** | `sum(tenantUsage.total_tokens)` (프론트엔드 집계) |
| **API** | `GET /api/analytics/tenant-usage?days=30` |
| **표시 형식** | tokens (예: 1.2M) |

#### 예상 비용
| 항목 | 내용 |
|------|------|
| **정의** | 최근 30일 동안의 예상 API 비용 |
| **계산식** | `sum(costTrend.total_cost)` (프론트엔드 집계) |
| **비용 산정 기준** | 입력: $3/1M 토큰, 출력: $15/1M 토큰 |
| **API** | `GET /api/analytics/cost-trend` |
| **표시 형식** | currency (예: $12.34) |

#### 총 요청 수
| 항목 | 내용 |
|------|------|
| **정의** | 최근 30일 동안의 전체 요청 수 |
| **계산식** | `sum(tenantUsage.request_count)` (프론트엔드 집계) |
| **API** | `GET /api/analytics/tenant-usage?days=30` |
| **표시 형식** | number |

#### 활성 테넌트
| 항목 | 내용 |
|------|------|
| **정의** | 최근 30일 동안 활동한 고유 테넌트 수 |
| **계산식** | `tenantUsage.length` (프론트엔드 집계) |
| **API** | `GET /api/analytics/tenant-usage?days=30` |
| **표시 형식** | number |

### 2.2 차트 및 테이블

#### TenantPieChart (테넌트별 토큰 사용량)
| 항목 | 내용 |
|------|------|
| **정의** | 테넌트별 토큰 사용량 비율을 파이 차트로 표시 |
| **데이터 키** | `total_tokens` |
| **API** | `GET /api/analytics/tenant-usage?days=30` |
| **차트 타입** | Pie Chart (Recharts) |

#### CostTrendChart (일별 비용 트렌드)
| 항목 | 내용 |
|------|------|
| **정의** | 최근 30일 동안의 일별 비용 추이 |
| **X축** | 날짜 (DATE(timestamp)) |
| **Y축** | input_cost, output_cost, total_cost |
| **API** | `GET /api/analytics/cost-trend` |
| **차트 타입** | Area/Line Chart (Recharts) |

**데이터 구조:**
```typescript
interface CostData {
  date: string;           // YYYY-MM-DD
  input_tokens: number;   // 해당 일자 입력 토큰
  output_tokens: number;  // 해당 일자 출력 토큰
  total_tokens: number;   // 해당 일자 총 토큰
  input_cost: number;     // 입력 비용 ($)
  output_cost: number;    // 출력 비용 ($)
  total_cost: number;     // 총 비용 ($)
}
```

#### UsageHeatmap (시간대별 사용량 히트맵)
| 항목 | 내용 |
|------|------|
| **정의** | 요일×시간별 사용량 패턴을 히트맵으로 표시 |
| **X축** | 시간 (0-23) |
| **Y축** | 요일 (1=일요일, 7=토요일) |
| **값** | 요청 수 또는 평균 토큰 |
| **API** | `GET /api/analytics/heatmap` |

**데이터 구조:**
```typescript
interface HeatmapData {
  day_of_week: number;  // 1-7 (일요일~토요일)
  hour: number;         // 0-23
  request_count: number;
  avg_tokens: number;
}
```

#### Tenant Table (테넌트별 상세 현황)
| 항목 | 내용 |
|------|------|
| **정의** | 테넌트별 상세 사용 현황 테이블 |
| **컬럼** | 테넌트, 요청 수, 총 토큰, 평균 토큰, 에러율 |
| **정렬** | 총 토큰 기준 내림차순 |
| **API** | `GET /api/analytics/tenant-usage?days=30` |

**데이터 구조:**
```typescript
interface TenantData {
  tenant_id: string;
  request_count: number;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  avg_tokens: number;
  fail_count: number;
  error_rate: number;     // % (백분율)
}
```

### 2.3 데이터 원천

#### SQL 쿼리: getTenantUsage

```sql
SELECT
  tenant_id,
  COUNT(*) as request_count,
  CAST(COALESCE(SUM(CAST(total_tokens AS FLOAT64)), 0) AS INT64) as total_tokens,
  CAST(COALESCE(SUM(CAST(input_tokens AS FLOAT64)), 0) AS INT64) as input_tokens,
  CAST(COALESCE(SUM(CAST(output_tokens AS FLOAT64)), 0) AS INT64) as output_tokens,
  ROUND(AVG(CAST(total_tokens AS FLOAT64)), 2) as avg_tokens,
  COUNTIF(success = FALSE) as fail_count,
  ROUND(COUNTIF(success = FALSE) * 100.0 / NULLIF(COUNT(*), 0), 2) as error_rate
FROM `{projectId}.{datasetId}.{tableName}`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL {days} DAY)
GROUP BY tenant_id
ORDER BY total_tokens DESC
```

#### SQL 쿼리: getCostTrend

```sql
SELECT
  DATE(timestamp) as date,
  CAST(COALESCE(SUM(CAST(input_tokens AS FLOAT64)), 0) AS INT64) as input_tokens,
  CAST(COALESCE(SUM(CAST(output_tokens AS FLOAT64)), 0) AS INT64) as output_tokens,
  CAST(COALESCE(SUM(CAST(total_tokens AS FLOAT64)), 0) AS INT64) as total_tokens,
  ROUND(COALESCE(SUM(CAST(input_tokens AS FLOAT64)), 0) * 3 / 1000000, 4) as input_cost,
  ROUND(COALESCE(SUM(CAST(output_tokens AS FLOAT64)), 0) * 15 / 1000000, 4) as output_cost,
  ROUND(
    COALESCE(SUM(CAST(input_tokens AS FLOAT64)), 0) * 3 / 1000000 +
    COALESCE(SUM(CAST(output_tokens AS FLOAT64)), 0) * 15 / 1000000, 4
  ) as total_cost
FROM `{projectId}.{datasetId}.{tableName}`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY date
ORDER BY date DESC
```

**비용 계산식:**
- **입력 비용**: `input_tokens × $3 / 1,000,000`
- **출력 비용**: `output_tokens × $15 / 1,000,000`
- **총 비용**: `input_cost + output_cost`

#### SQL 쿼리: getUsageHeatmap

```sql
SELECT
  EXTRACT(DAYOFWEEK FROM timestamp) as day_of_week,
  EXTRACT(HOUR FROM timestamp) as hour,
  COUNT(*) as request_count,
  ROUND(AVG(CAST(total_tokens AS FLOAT64)), 2) as avg_tokens
FROM `{projectId}.{datasetId}.{tableName}`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY day_of_week, hour
ORDER BY day_of_week, hour
```

| API | 캐시 TTL | 갱신 주기 |
|-----|----------|-----------|
| `/api/analytics/tenant-usage` | 15분 (MEDIUM) | 프론트엔드 15분 자동 갱신 |
| `/api/analytics/cost-trend` | 15분 (MEDIUM) | 프론트엔드 15분 자동 갱신 |
| `/api/analytics/heatmap` | 15분 (MEDIUM) | 프론트엔드 15분 자동 갱신 |

---

## 3. AI Performance (AI 성능 분석)

AI 모델의 토큰 효율성과 이상 탐지 통계를 분석하는 대시보드입니다.

### 3.1 KPI 카드

#### 평균 효율성 비율
| 항목 | 내용 |
|------|------|
| **정의** | 입력 대비 출력 토큰의 평균 비율 |
| **계산식** | `avg(tokenEfficiency.efficiency_ratio)` (프론트엔드 집계) |
| **개별 레코드 계산** | `output_tokens / input_tokens` |
| **API** | `GET /api/ai/token-efficiency` |
| **표시 형식** | 소수점 3자리 (예: 0.823) |
| **부제** | "출력/입력 토큰 비율" |

#### 평균 토큰/요청
| 항목 | 내용 |
|------|------|
| **정의** | 요청당 평균 총 토큰 사용량 |
| **계산식** | `avg(tokenEfficiency.total_tokens)` (프론트엔드 집계) |
| **API** | `GET /api/ai/token-efficiency` |
| **표시 형식** | number (반올림) |

#### 응답 성공률
| 항목 | 내용 |
|------|------|
| **정의** | 최근 7일간 성공한 요청의 비율 |
| **계산식** | `(success_count / total_count) × 100` (프론트엔드 집계) |
| **API** | `GET /api/ai/token-efficiency` |
| **표시 형식** | % (백분율) |
| **상태 기준** | ≥95%: 초록, 90-95%: 노랑, <90%: 빨강 |

#### P99 토큰
| 항목 | 내용 |
|------|------|
| **정의** | 99번째 백분위수 토큰 사용량 (최대값) |
| **계산식** | `max(anomalyStats.p99_tokens)` (프론트엔드 집계) |
| **API** | `GET /api/ai/anomaly-stats` |
| **표시 형식** | tokens |
| **부제** | "99번째 백분위수" |

### 3.2 차트 및 테이블

#### TokenScatterPlot (토큰 입출력 분포)
| 항목 | 내용 |
|------|------|
| **정의** | 입력 토큰 vs 출력 토큰의 산점도 |
| **X축** | 입력 토큰 (`input_tokens`) |
| **Y축** | 출력 토큰 (`output_tokens`) |
| **색상 구분** | 성공/실패 (success 필드) |
| **API** | `GET /api/ai/token-efficiency` |
| **차트 타입** | Scatter Chart (Recharts) |

**데이터 구조:**
```typescript
interface TokenEfficiencyData {
  tenant_id: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  efficiency_ratio: number;  // output_tokens / input_tokens
  success: boolean;
  timestamp: string;
}
```

#### Anomaly Stats Table (테넌트별 이상 탐지 통계)
| 항목 | 내용 |
|------|------|
| **정의** | 테넌트별 토큰 사용량 통계 및 이상 탐지 임계값 |
| **컬럼** | 테넌트, 평균 토큰, 표준편차, P99 토큰, 샘플 수, 이상 임계값 |
| **이상 임계값** | `avg_tokens + 3 × stddev_tokens` (Z-Score 기반) |
| **API** | `GET /api/ai/anomaly-stats` |

**데이터 구조:**
```typescript
interface AnomalyStats {
  tenant_id: string;
  avg_tokens: number;          // 평균 토큰
  stddev_tokens: number;       // 표준편차
  avg_input_tokens: number;    // 평균 입력 토큰
  stddev_input_tokens: number; // 입력 토큰 표준편차
  sample_count: number;        // 샘플 수 (요청 건수)
  p99_tokens: number;          // 99번째 백분위수
}
```

**이상 탐지 로직:**
```
이상 임계값 = 평균 + 3 × 표준편차
해당 임계값을 초과하는 토큰 사용은 이상(Anomaly)으로 판단
```

### 3.3 데이터 원천

#### SQL 쿼리: getTokenEfficiency

```sql
SELECT
  tenant_id,
  CAST(COALESCE(SAFE_CAST(input_tokens AS FLOAT64), 0) AS INT64) as input_tokens,
  CAST(COALESCE(SAFE_CAST(output_tokens AS FLOAT64), 0) AS INT64) as output_tokens,
  CAST(COALESCE(SAFE_CAST(total_tokens AS FLOAT64), 0) AS INT64) as total_tokens,
  ROUND(
    SAFE_CAST(output_tokens AS FLOAT64) / NULLIF(SAFE_CAST(input_tokens AS FLOAT64), 0),
    3
  ) as efficiency_ratio,
  success,
  timestamp
FROM `{projectId}.{datasetId}.{tableName}`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  AND SAFE_CAST(total_tokens AS FLOAT64) > 0
ORDER BY timestamp DESC
LIMIT 1000
```

#### SQL 쿼리: getAnomalyStats

```sql
SELECT
  tenant_id,
  AVG(CAST(total_tokens AS FLOAT64)) as avg_tokens,
  STDDEV(CAST(total_tokens AS FLOAT64)) as stddev_tokens,
  AVG(CAST(input_tokens AS FLOAT64)) as avg_input_tokens,
  STDDEV(CAST(input_tokens AS FLOAT64)) as stddev_input_tokens,
  COUNT(*) as sample_count,
  APPROX_QUANTILES(CAST(CAST(total_tokens AS FLOAT64) AS INT64), 100)[OFFSET(99)] as p99_tokens
FROM `{projectId}.{datasetId}.{tableName}`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY tenant_id
```

| API | 캐시 TTL | 갱신 주기 |
|-----|----------|-----------|
| `/api/ai/token-efficiency` | 15분 (MEDIUM) | 프론트엔드 15분 자동 갱신 |
| `/api/ai/anomaly-stats` | 5분 (SHORT) | 프론트엔드 15분 자동 갱신 |

---

## 4. Quality (품질 모니터링)

토큰 효율성 트렌드, 질문-응답 상관관계, 반복 패턴을 분석하는 대시보드입니다.

### 4.1 KPI 카드

#### 평균 효율성
| 항목 | 내용 |
|------|------|
| **정의** | 30일간 일별 효율성 비율의 평균 |
| **계산식** | `avg(efficiencyTrend.avg_efficiency_ratio)` (프론트엔드 집계) |
| **API** | `GET /api/quality/efficiency-trend` |
| **표시 형식** | `{value}x` (예: 0.82x) |
| **상태 기준** | ≥1.0x: 초록, 0.5-1.0x: 노랑, <0.5x: 빨강 |
| **부제** | "출력/입력 토큰 비율" |

#### 총 요청 수
| 항목 | 내용 |
|------|------|
| **정의** | 30일간 총 요청 수 |
| **계산식** | `sum(efficiencyTrend.total_requests)` (프론트엔드 집계) |
| **API** | `GET /api/quality/efficiency-trend` |
| **표시 형식** | number |
| **부제** | "30일 기준" |

#### 평균 응답 길이
| 항목 | 내용 |
|------|------|
| **정의** | LLM 응답의 평균 문자 수 |
| **계산식** | `avg(correlation.response_length)` (프론트엔드 집계) |
| **API** | `GET /api/quality/query-response-correlation` |
| **표시 형식** | number 또는 `{value}K` (1000 이상 시) |
| **부제** | "문자 수" |

#### FAQ 후보
| 항목 | 내용 |
|------|------|
| **정의** | 고빈도 반복 패턴 수 / 전체 패턴 수 |
| **계산식** | `filter(occurrence_count >= 5).length / total_patterns.length` |
| **고빈도 기준** | 5회 이상 반복된 패턴 |
| **API** | `GET /api/quality/repeated-patterns` |
| **표시 형식** | `{high}/{total}` (예: 3/12) |
| **상태 기준** | 고빈도 >5개: 노랑, ≤5개: 초록 |
| **부제** | "고빈도/전체 패턴" |

### 4.2 차트 및 테이블

#### TokenEfficiencyTrendChart (토큰 효율성 트렌드)
| 항목 | 내용 |
|------|------|
| **정의** | 30일간 일별 토큰 효율성 추이 |
| **X축** | 날짜 |
| **Y축** | 효율성 비율 (평균, 최소, 최대) |
| **API** | `GET /api/quality/efficiency-trend` |
| **차트 타입** | Line/Area Chart (Recharts) |

**데이터 구조:**
```typescript
interface EfficiencyTrendData {
  date: string;                // YYYY-MM-DD
  avg_efficiency_ratio: number; // 해당 일자 평균 효율성
  min_efficiency_ratio: number; // 해당 일자 최소 효율성
  max_efficiency_ratio: number; // 해당 일자 최대 효율성
  total_requests: number;       // 해당 일자 요청 수
  avg_input_tokens: number;     // 해당 일자 평균 입력 토큰
  avg_output_tokens: number;    // 해당 일자 평균 출력 토큰
}
```

#### QueryResponseScatterPlot (질문-응답 길이 상관관계)
| 항목 | 내용 |
|------|------|
| **정의** | 질문 길이 vs 응답 길이의 산점도 |
| **X축** | 질문 길이 (`query_length`, 문자 수) |
| **Y축** | 응답 길이 (`response_length`, 문자 수) |
| **API** | `GET /api/quality/query-response-correlation` |
| **차트 타입** | Scatter Chart (Recharts) |

**데이터 구조:**
```typescript
interface CorrelationData {
  tenant_id: string;
  query_length: number;     // LENGTH(user_input)
  response_length: number;  // LENGTH(llm_response)
  input_tokens: number;
  output_tokens: number;
  efficiency_ratio: number;
  timestamp: string;
}
```

#### RepeatedQueriesTable (반복 질문 패턴)
| 항목 | 내용 |
|------|------|
| **정의** | FAQ 후보로 식별된 반복 질문 패턴 목록 |
| **컬럼** | 패턴, 발생 횟수, 고유 테넌트, 평균 응답 길이, 평균 출력 토큰, 최초/최종 발생 |
| **정렬** | 발생 횟수 기준 내림차순 |
| **API** | `GET /api/quality/repeated-patterns` |

**데이터 구조:**
```typescript
interface RepeatedQueryData {
  query_pattern: string;      // 정규화된 질문 패턴 (앞 100자)
  occurrence_count: number;   // 발생 횟수 (2 이상)
  unique_tenants: number;     // 고유 테넌트 수
  avg_response_length: number; // 평균 응답 길이
  avg_output_tokens: number;   // 평균 출력 토큰
  first_seen: string;         // 최초 발생 시각
  last_seen: string;          // 최종 발생 시각
}
```

**패턴 정규화 로직:**
```sql
REGEXP_REPLACE(
  LOWER(TRIM(SUBSTR(user_input, 1, 100))),
  r'[0-9]+',
  '#'
)
```
- 질문의 앞 100자만 사용
- 소문자로 변환
- 숫자를 `#`으로 치환 (예: "주문번호 12345" → "주문번호 #")

### 4.3 데이터 원천

#### SQL 쿼리: getTokenEfficiencyTrend

```sql
SELECT
  DATE(timestamp) as date,
  ROUND(AVG(
    SAFE_CAST(output_tokens AS FLOAT64) / NULLIF(SAFE_CAST(input_tokens AS FLOAT64), 0)
  ), 3) as avg_efficiency_ratio,
  ROUND(MIN(
    SAFE_CAST(output_tokens AS FLOAT64) / NULLIF(SAFE_CAST(input_tokens AS FLOAT64), 0)
  ), 3) as min_efficiency_ratio,
  ROUND(MAX(
    SAFE_CAST(output_tokens AS FLOAT64) / NULLIF(SAFE_CAST(input_tokens AS FLOAT64), 0)
  ), 3) as max_efficiency_ratio,
  COUNT(*) as total_requests,
  ROUND(AVG(SAFE_CAST(input_tokens AS FLOAT64)), 0) as avg_input_tokens,
  ROUND(AVG(SAFE_CAST(output_tokens AS FLOAT64)), 0) as avg_output_tokens
FROM `{projectId}.{datasetId}.{tableName}`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  AND SAFE_CAST(input_tokens AS FLOAT64) > 0
  AND SAFE_CAST(output_tokens AS FLOAT64) > 0
GROUP BY date
ORDER BY date ASC
```

#### SQL 쿼리: getQueryResponseCorrelation

```sql
SELECT
  tenant_id,
  LENGTH(user_input) as query_length,
  LENGTH(llm_response) as response_length,
  CAST(COALESCE(SAFE_CAST(input_tokens AS FLOAT64), 0) AS INT64) as input_tokens,
  CAST(COALESCE(SAFE_CAST(output_tokens AS FLOAT64), 0) AS INT64) as output_tokens,
  ROUND(
    SAFE_CAST(output_tokens AS FLOAT64) / NULLIF(SAFE_CAST(input_tokens AS FLOAT64), 0),
    3
  ) as efficiency_ratio,
  timestamp
FROM `{projectId}.{datasetId}.{tableName}`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  AND user_input IS NOT NULL
  AND llm_response IS NOT NULL
  AND LENGTH(user_input) > 0
  AND LENGTH(llm_response) > 0
ORDER BY timestamp DESC
LIMIT 1000
```

#### SQL 쿼리: getRepeatedQueryPatterns

```sql
WITH normalized_queries AS (
  SELECT
    REGEXP_REPLACE(
      LOWER(TRIM(SUBSTR(user_input, 1, 100))),
      r'[0-9]+',
      '#'
    ) as query_pattern,
    LENGTH(llm_response) as response_length,
    SAFE_CAST(output_tokens AS FLOAT64) as output_tokens,
    tenant_id,
    timestamp
  FROM `{projectId}.{datasetId}.{tableName}`
  WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
    AND user_input IS NOT NULL
    AND LENGTH(user_input) > 10
)
SELECT
  query_pattern,
  COUNT(*) as occurrence_count,
  COUNT(DISTINCT tenant_id) as unique_tenants,
  ROUND(AVG(response_length), 0) as avg_response_length,
  ROUND(AVG(output_tokens), 0) as avg_output_tokens,
  MIN(timestamp) as first_seen,
  MAX(timestamp) as last_seen
FROM normalized_queries
GROUP BY query_pattern
HAVING COUNT(*) >= 2
ORDER BY occurrence_count DESC
LIMIT 100
```

| API | 캐시 TTL | 갱신 주기 |
|-----|----------|-----------|
| `/api/quality/efficiency-trend` | 15분 (MEDIUM) | 프론트엔드 15분 자동 갱신 |
| `/api/quality/query-response-correlation` | 15분 (MEDIUM) | 프론트엔드 15분 자동 갱신 |
| `/api/quality/repeated-patterns` | 15분 (MEDIUM) | 프론트엔드 15분 자동 갱신 |

---

## 부록 A: 캐시 전략

### 캐시 TTL 설정

| TTL 유형 | 시간 | 초 | 용도 |
|---------|------|-----|------|
| **SHORT** | 5분 | 300 | 실시간 KPI, 에러 분석, 이상 탐지 |
| **MEDIUM** | 15분 | 900 | 시간별/일별 트래픽, 테넌트 사용량, 비용 트렌드 |
| **LONG** | 1시간 | 3600 | 정적 데이터 (거의 변하지 않는 데이터) |
| **HEALTH** | 1분 | 60 | 헬스 체크 |

### API별 캐시 TTL 매핑

| API 엔드포인트 | 캐시 TTL | 용도 |
|---------------|----------|------|
| `/api/metrics/realtime` | SHORT (5분) | 실시간 KPI |
| `/api/metrics/hourly` | MEDIUM (15분) | 시간별 트래픽 |
| `/api/metrics/daily` | MEDIUM (15분) | 일별 트래픽 |
| `/api/analytics/tenant-usage` | MEDIUM (15분) | 테넌트 사용량 |
| `/api/analytics/cost-trend` | MEDIUM (15분) | 비용 트렌드 |
| `/api/analytics/heatmap` | MEDIUM (15분) | 사용량 히트맵 |
| `/api/ai/token-efficiency` | MEDIUM (15분) | 토큰 효율성 |
| `/api/ai/anomaly-stats` | SHORT (5분) | 이상 탐지 통계 |
| `/api/quality/efficiency-trend` | MEDIUM (15분) | 효율성 트렌드 |
| `/api/quality/query-response-correlation` | MEDIUM (15분) | 질문-응답 상관관계 |
| `/api/quality/repeated-patterns` | MEDIUM (15분) | 반복 패턴 |

### 캐시 키 생성 규칙

```typescript
CacheService.generateKey('domain', 'category', 'metric', ...params)
// 예: 'metrics:realtime:kpi'
// 예: 'metrics:tenant:usage:30' (days 파라미터 포함)
```

---

## 부록 B: 상태 색상 기준

### 메트릭별 상태 색상

| 메트릭 | 초록 (success) | 노랑 (warning) | 빨강 (error) |
|--------|----------------|----------------|--------------|
| **에러율** | ≤1% | - | >1% |
| **응답 성공률** | ≥95% | 90-95% | <90% |
| **토큰 효율성** | ≥1.0x | 0.5-1.0x | <0.5x |
| **테넌트 에러율** | ≤1% | - | >1% |
| **FAQ 후보 수** | ≤5개 | >5개 | - |

### CSS 색상 참조

```css
/* 상태 색상 */
--success: #10b981;  /* emerald-500 */
--warning: #f59e0b;  /* amber-500 */
--error: #ef4444;    /* rose-500 */
--neutral: #6b7280;  /* slate-500 */

/* 차트 색상 팔레트 */
--chart-1: #3b82f6;  /* blue-500 */
--chart-2: #8b5cf6;  /* violet-500 */
--chart-3: #10b981;  /* emerald-500 */
```

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2025-01-16 | 1.0 | 초기 문서 작성 |
