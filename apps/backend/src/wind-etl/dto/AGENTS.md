<!-- Parent: ../AGENTS.md -->
# dto

## Purpose
Wind ETL 모듈의 데이터 전송 객체(DTO) 및 응답 타입을 정의합니다. PostgreSQL 쿼리 결과와 1:1 매핑됩니다.

## Key Files
- `wind-etl.dto.ts` - ETL 실행 이력, 요약, 트렌드, 에러 분석 등의 인터페이스 정의

## Key Types
| Type | Description | Key Fields |
|------|-------------|------------|
| `WindETLRun` | 개별 ETL 실행 기록 | id, startedAt, finishedAt, status, filesFound, filesProcessed, filesSkipped, filesMoved, recordsInserted, recordsUpdated, totalRecords, errorCount, errors (string[]), durationMs |
| `WindETLSummary` | 실행 현황 요약 | totalRuns, successCount, failureCount, runningCount, successRate, avgDurationMs, avgFilesProcessed, avgRecordsInserted, lastRunAt, lastRunStatus |
| `WindETLTrend` | 시간별/일별 트렌드 데이터 | period, runCount, successCount, failureCount, successRate, totalFilesProcessed, totalRecordsInserted, avgDurationMs |
| `WindETLError` | 에러 분석 결과 | errorMessage, occurrenceCount, firstSeen, lastSeen, affectedRuns (number[]) |
| `WindETLFileStats` | 파일 처리 통계 | date, totalFilesFound, totalFilesProcessed, totalFilesSkipped, totalFilesMoved, processingRate (%) |
| `WindETLRecordStats` | 레코드 처리 통계 | date, totalRecordsInserted, totalRecordsUpdated, totalRecords, avgRecordsPerRun |

## For AI Agents
- 모든 타입은 PostgreSQL 쿼리 결과와 1:1 매핑됨
- camelCase 변환은 SQL alias로 처리 (`started_at as "startedAt"`)
- null 허용 필드: finishedAt, errors, durationMs, indexCount, todayHeadlines, yesterdayHeadlines, articlesFetched
