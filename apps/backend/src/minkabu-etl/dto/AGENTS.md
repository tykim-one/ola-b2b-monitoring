<!-- Parent: ../AGENTS.md -->
# dto

## Purpose
Minkabu ETL 모듈의 데이터 전송 객체(DTO) 및 응답 타입을 정의합니다. PostgreSQL 쿼리 결과와 1:1 매핑됩니다.

## Key Files
- `minkabu-etl.dto.ts` - ETL 실행 이력, 요약, 트렌드, 에러 분석 등의 인터페이스 정의

## Key Types
| Type | Description | Key Fields |
|------|-------------|------------|
| `MinkabuETLRun` | 개별 ETL 실행 기록 | id, startedAt, finishedAt, status, indexCount, todayHeadlines, yesterdayHeadlines, articlesFetched, errorCount, errors (string[]), durationMs |
| `MinkabuETLSummary` | 실행 현황 요약 | totalRuns, successCount, failureCount, runningCount, successRate, avgDurationMs, avgArticlesFetched, avgTodayHeadlines, lastRunAt, lastRunStatus |
| `MinkabuETLTrend` | 시간별/일별 트렌드 데이터 | period, runCount, successCount, failureCount, successRate, totalArticlesFetched, totalTodayHeadlines, avgDurationMs |
| `MinkabuETLError` | 에러 분석 결과 | errorMessage, occurrenceCount, firstSeen, lastSeen, affectedRuns (number[]) |
| `MinkabuETLHeadlineStats` | 헤드라인 수집 통계 | date, totalTodayHeadlines, totalYesterdayHeadlines, totalArticlesFetched, avgHeadlinesPerRun |
| `MinkabuETLIndexStats` | 인덱스 통계 | date, totalIndexCount, avgIndexPerRun, runCount |

## For AI Agents
- 모든 타입은 PostgreSQL 쿼리 결과와 1:1 매핑됨
- camelCase 변환은 SQL alias로 처리 (`started_at as "startedAt"`)
- null 허용 필드: finishedAt, indexCount, todayHeadlines, yesterdayHeadlines, articlesFetched, errors, durationMs
