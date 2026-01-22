<!-- Parent: ../AGENTS.md -->
# Wind ETL Module

## Purpose

중국 Wind 금융 데이터 ETL 파이프라인 모니터링 모듈입니다. PostgreSQL에 저장된 ETL 실행 이력을 조회하고 분석하는 API를 제공합니다.

## Key Files

- `wind-etl.module.ts` - NestJS 모듈 정의
- `wind-etl.controller.ts` - REST API 엔드포인트 (`/api/etl/wind/*`)
- `wind-etl.service.ts` - 비즈니스 로직 및 캐싱 레이어
- `wind-etl.datasource.ts` - PostgreSQL 데이터소스 (테이블: `ops.cn_wind_etl_runs`)

## Subdirectories

- `dto/` - 데이터 전송 객체 정의

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/etl/wind/summary` | 실행 현황 요약 (성공률, 평균 실행시간 등) |
| `GET /api/etl/wind/runs` | 최근 실행 목록 |
| `GET /api/etl/wind/trend/daily` | 일별 트렌드 |
| `GET /api/etl/wind/trend/hourly` | 시간별 트렌드 |
| `GET /api/etl/wind/errors` | 에러 분석 |
| `GET /api/etl/wind/stats/files` | 파일 처리 통계 |
| `GET /api/etl/wind/stats/records` | 레코드 처리 통계 |

## For AI Agents

- PostgreSQL 연결 설정: `WIND_PG_HOST`, `WIND_PG_PORT`, `WIND_PG_DATABASE`, `WIND_PG_USER`, `WIND_PG_PASSWORD`
- 테이블 스키마: `ops.cn_wind_etl_runs`
- 주요 필드: `started_at`, `finished_at`, `status`, `files_found`, `files_processed`, `files_skipped`, `files_moved`, `records_inserted`, `records_updated`, `total_records`, `error_count`, `errors`, `duration_ms`

## Dependencies

- `@nestjs/config` - 환경 변수 관리
- `pg` - PostgreSQL 클라이언트
- `../cache/` - 캐싱 서비스
