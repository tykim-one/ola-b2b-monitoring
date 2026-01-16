<!-- Parent: ../AGENTS.md -->
# queries

## Purpose
BigQuery SQL 쿼리 빌더입니다. 메트릭별 SQL 쿼리를 생성하는 정적 메서드를 제공합니다.

## Key Files
- `metrics.queries.ts` - 모든 메트릭 SQL 쿼리 정의 (MetricsQueries 클래스)

## Query Categories

- **Core Metrics**: realtimeKPI, hourlyTraffic, dailyTraffic, tenantUsage, usageHeatmap, errorAnalysis, tokenEfficiency, anomalyStats, costTrend, queryPatterns
- **Quality Analysis**: tokenEfficiencyTrend, queryResponseCorrelation, repeatedQueryPatterns
- **User Analytics**: userRequestCounts, userTokenUsage, userQuestionPatterns, userList, userActivityDetail

## For AI Agents
- SQL 쿼리는 정적 메서드로 구성
- 쿼리 파라미터: projectId, datasetId, tableName, days, limit 등
- 새 쿼리 추가 시 MetricsQueries 클래스에 정적 메서드 추가
- BigQuery SQL 문법 사용 (TIMESTAMP_SUB, EXTRACT 등)

## Schema 주의사항
- `success` 필드: **BOOL 타입** - `success = TRUE` 또는 `success = FALSE` 사용 (문자열 'true'/'false' 사용 금지)
- 토큰 필드 (`input_tokens`, `output_tokens`, `total_tokens`): STRING 타입 → `CAST(... AS FLOAT64)` 필요
