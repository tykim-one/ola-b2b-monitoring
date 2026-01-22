<!-- Parent: ../AGENTS.md -->
# Wind ETL DTOs

## Purpose

Wind ETL 모듈의 데이터 전송 객체(DTO) 및 응답 타입을 정의합니다.

## Key Files

- `wind-etl.dto.ts` - ETL 실행 이력, 요약, 트렌드, 에러 분석 등의 타입 정의

## Key Types

| Type | Description |
|------|-------------|
| `WindETLRun` | 개별 ETL 실행 기록 |
| `WindETLSummary` | 실행 현황 요약 (성공률, 평균값 등) |
| `WindETLTrend` | 시간별/일별 트렌드 데이터 |
| `WindETLError` | 에러 분석 결과 |
| `WindETLFileStats` | 파일 처리 통계 |
| `WindETLRecordStats` | 레코드 처리 통계 |

## For AI Agents

- 모든 타입은 PostgreSQL 쿼리 결과와 1:1 매핑됨
- camelCase 변환은 SQL alias로 처리 (`started_at as "startedAt"`)
