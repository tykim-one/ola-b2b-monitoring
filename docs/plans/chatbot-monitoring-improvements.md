# 챗봇 성능 분석 및 개선을 위한 모니터링 시스템 추천

> 작성일: 2026-01-16

## 현재 시스템 현황

### 구현된 것
- 토큰 사용량, 비용, 에러율 모니터링
- Z-Score 기반 이상 탐지 (토큰/트래픽/에러 스파이크)
- 반복 쿼리 패턴 탐지 (`repeatedQueryPatterns`)
- 사용자별 질문 패턴 (`userQuestionPatterns`)

### 미구현된 것 (챗봇 품질 개선에 필수)
- 신규 질문 탐지
- 감정/불만 분석
- 세션 레벨 분석
- 응답 품질 지표

---

## 추천 1: 신규 질문 탐지 시스템

### A. 클러스터 기반 신규 질문 탐지

```sql
-- 최근 7일 대비 새로운 패턴 탐지
WITH recent_patterns AS (
  SELECT LOWER(REGEXP_REPLACE(user_input, r'[0-9]+', 'N')) AS normalized_query,
         COUNT(*) as recent_count
  FROM `{table}`
  WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  GROUP BY normalized_query
),
historical_patterns AS (
  SELECT LOWER(REGEXP_REPLACE(user_input, r'[0-9]+', 'N')) AS normalized_query,
         COUNT(*) as historical_count
  FROM `{table}`
  WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
    AND timestamp < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  GROUP BY normalized_query
)
SELECT r.normalized_query, r.recent_count,
       COALESCE(h.historical_count, 0) as historical_count,
       CASE WHEN h.historical_count IS NULL THEN 'NEW' ELSE 'EMERGING' END as pattern_type
FROM recent_patterns r
LEFT JOIN historical_patterns h ON r.normalized_query = h.normalized_query
WHERE h.historical_count IS NULL OR r.recent_count > h.historical_count * 3
ORDER BY r.recent_count DESC
LIMIT 100
```

### B. 키워드 임베딩 기반 탐지 (고급)

| 구현 방식 | 난이도 | 효과 |
|-----------|--------|------|
| TF-IDF + 코사인 유사도 | 중 | 유사 질문 클러스터링 |
| 문장 임베딩 (BGE/E5) | 고 | 의미 기반 신규 탐지 |
| LLM 분류 (Claude/GPT) | 고 | 인텐트 자동 분류 |

---

## 추천 2: 공격적/불만 질문 탐지

### A. 키워드 기반 빠른 구현

```sql
-- 불만/공격적 키워드 패턴 탐지
SELECT
  timestamp, tenant_id, user_input,
  CASE
    WHEN REGEXP_CONTAINS(LOWER(user_input), r'(왜|도대체|짜증|화나|답답|이상해|바보|멍청|안돼|못해|실망|최악|쓰레기|환불|고소|신고)') THEN 'FRUSTRATED'
    WHEN REGEXP_CONTAINS(LOWER(user_input), r'(stupid|useless|terrible|worst|angry|frustrated|refund|sue|report)') THEN 'FRUSTRATED'
    WHEN REGEXP_CONTAINS(LOWER(user_input), r'(ㅋㅋ|ㅎㅎ|ㅠㅠ|ㅡㅡ|;;|!{3,}|\?{3,})') THEN 'EMOTIONAL'
    ELSE 'NEUTRAL'
  END as sentiment_flag,
  success
FROM `{table}`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
HAVING sentiment_flag != 'NEUTRAL'
```

### B. 감정 분석 점수 시스템 (추천)

새 테이블 필드 또는 후처리 파이프라인 추가:

```typescript
// sentiment-analysis.service.ts (새 파일)
export interface SentimentScore {
  frustration_level: number;  // 0-1 (키워드 + 패턴 기반)
  urgency_level: number;      // 반복 질문, 느낌표 수
  formality_level: number;    // 경어 사용 여부
  is_complaint: boolean;
}
```

### C. 실시간 알림 시스템

| 트리거 조건 | 액션 |
|-------------|------|
| frustration_level > 0.7 | Slack 알림 |
| 동일 세션 3회 이상 실패 | 우선 대응 플래그 |
| 특정 테넌트 불만률 급증 | 대시보드 경고 |

---

## 추천 3: 세션 레벨 분석 (핵심)

현재 `request_metadata.session_id`가 있지만 활용되지 않고 있습니다.

```sql
-- 세션별 대화 흐름 분석
WITH session_stats AS (
  SELECT
    JSON_VALUE(request_metadata, '$.session_id') as session_id,
    tenant_id,
    COUNT(*) as turn_count,
    SUM(CASE WHEN success = TRUE THEN 1 ELSE 0 END) as success_count,
    MIN(timestamp) as session_start,
    MAX(timestamp) as session_end,
    ARRAY_AGG(STRUCT(timestamp, user_input, success) ORDER BY timestamp) as conversation
  FROM `{table}`
  WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  GROUP BY session_id, tenant_id
)
SELECT
  tenant_id,
  AVG(turn_count) as avg_turns,
  AVG(success_count / turn_count) as session_success_rate,
  COUNTIF(turn_count = 1) / COUNT(*) as single_turn_rate,  -- 한 번에 끝난 비율
  COUNTIF(turn_count > 5 AND success_count / turn_count < 0.5) as frustrated_sessions
FROM session_stats
GROUP BY tenant_id
```

---

## 추천 4: 응답 품질 모니터링

### A. 응답 길이 대비 품질 지표

```sql
-- 너무 짧거나 긴 응답 탐지
SELECT
  DATE(timestamp) as date,
  tenant_id,
  AVG(LENGTH(llm_response)) as avg_response_length,
  COUNTIF(LENGTH(llm_response) < 50) as too_short_count,  -- 불충분한 응답
  COUNTIF(LENGTH(llm_response) > 2000) as too_long_count, -- 과도한 응답
  AVG(CASE WHEN success = FALSE THEN LENGTH(user_input) END) as failed_query_avg_length
FROM `{table}`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY date, tenant_id
```

### B. 재질문 패턴 탐지 (불만족 신호)

```sql
-- 동일 세션 내 유사 질문 반복 (응답 불만족 신호)
WITH session_queries AS (
  SELECT
    JSON_VALUE(request_metadata, '$.session_id') as session_id,
    ARRAY_AGG(LOWER(user_input) ORDER BY timestamp) as queries
  FROM `{table}`
  WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  GROUP BY session_id
)
SELECT session_id, queries
FROM session_queries
WHERE EXISTS (
  SELECT 1 FROM UNNEST(queries) q1, UNNEST(queries) q2
  WHERE q1 != q2 AND EDIT_DISTANCE(q1, q2) / GREATEST(LENGTH(q1), LENGTH(q2)) < 0.3
)
```

---

## 구현 우선순위 추천

| 순위 | 기능 | 난이도 | 영향도 | 예상 작업 |
|------|------|--------|--------|-----------|
| 1 | 불만 키워드 탐지 | 낮음 | 높음 | 쿼리 1개 + 대시보드 |
| 2 | 세션 분석 | 중간 | 높음 | 쿼리 3개 + 타입 + 대시보드 |
| 3 | 신규 질문 탐지 | 중간 | 중간 | 쿼리 2개 + 대시보드 |
| 4 | 재질문 패턴 | 중간 | 높음 | 쿼리 1개 + 알림 |
| 5 | 감정 분석 서비스 | 높음 | 높음 | 새 서비스 + ML 모델 |

---

## 즉시 구현 가능한 것

현재 BigQuery 스키마와 코드 구조를 활용하면 **1~4번은 새 쿼리 추가만으로 구현 가능**합니다:

1. `metrics.queries.ts`에 새 쿼리 함수 추가
2. `metrics-datasource.interface.ts`에 메서드 추가
3. `shared-types/index.ts`에 타입 추가
4. 프론트엔드 대시보드 페이지 추가

---

## 관련 파일

### Backend
- `apps/backend/src/metrics/queries/metrics.queries.ts` - BigQuery 쿼리 정의
- `apps/backend/src/datasource/interfaces/metrics-datasource.interface.ts` - 데이터소스 인터페이스
- `apps/backend/src/ml/anomaly/anomaly.service.ts` - 이상 탐지 서비스

### Frontend
- `apps/frontend-next/src/app/dashboard/` - 대시보드 페이지들

### Shared
- `packages/shared-types/src/index.ts` - 공유 타입 정의
