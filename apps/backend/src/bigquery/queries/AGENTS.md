<!-- Parent: ../AGENTS.md -->
# queries

## Purpose
BigQuery SQL 쿼리 빌더입니다. 메트릭별 SQL 쿼리를 생성하는 정적 메서드를 제공합니다.

## Key Files
- `metrics.queries.ts` - 모든 메트릭 SQL 쿼리 정의 (MetricsQueries 클래스)

## For AI Agents
- SQL 쿼리는 정적 메서드로 구성
- 쿼리 파라미터: projectId, datasetId, tableName
- 새 쿼리 추가 시 MetricsQueries 클래스에 정적 메서드 추가
- BigQuery SQL 문법 사용 (TIMESTAMP_SUB, EXTRACT 등)
