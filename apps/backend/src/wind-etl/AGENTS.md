<!-- Parent: ../AGENTS.md -->
# wind-etl

## Purpose
중국 Wind 금융 데이터 ETL 파이프라인 모니터링 모듈입니다. PostgreSQL(ops.cn_wind_etl_runs 테이블)에 저장된 파일 처리 ETL 실행 이력을 조회하고 분석하는 API를 제공합니다.

## Key Files
- `wind-etl.module.ts` - NestJS 모듈 정의 (ConfigModule, CacheModule import)
- `wind-etl.controller.ts` - REST API 엔드포인트 (`/api/wind-etl/*`, @Public() 적용)
- `wind-etl.service.ts` - 비즈니스 로직 및 캐싱 레이어 (CacheService.getOrSet 패턴, SHORT/MEDIUM TTL)
- `wind-etl.datasource.ts` - PostgreSQL 데이터소스 (Pool 기반, ops.cn_wind_etl_runs 테이블 쿼리)

## Subdirectories
- `dto/` - 데이터 전송 객체 정의 (see dto/AGENTS.md)

## For AI Agents
- PostgreSQL 연결 설정: WIND_PG_HOST, WIND_PG_PORT, WIND_PG_DATABASE, WIND_PG_USER, WIND_PG_PASSWORD
- 테이블 스키마: `ops.cn_wind_etl_runs`
- 주요 필드: started_at, finished_at, status, files_found, files_processed, files_skipped, files_moved, records_inserted, records_updated, total_records, error_count, errors (text[]), duration_ms
- 캐싱: SHORT (5분) - runs, summary, hourly trend, errors / MEDIUM (15분) - daily trend, file stats, record stats
- 쿼리 패턴: CTE 사용한 집계 쿼리, FILTER WHERE 절로 조건부 카운트, UNNEST로 배열 펼치기 (에러 분석)

## API Endpoints
| Endpoint | Description | Cache TTL |
|----------|-------------|-----------|
| `GET /api/wind-etl/health` | PostgreSQL 연결 상태 확인 | - |
| `GET /api/wind-etl/runs?limit=50` | 최근 실행 목록 | 5분 |
| `GET /api/wind-etl/summary?days=7` | 실행 현황 요약 (성공률, 평균 실행시간 등) | 5분 |
| `GET /api/wind-etl/trend/daily?days=30` | 일별 트렌드 | 15분 |
| `GET /api/wind-etl/trend/hourly?hours=24` | 시간별 트렌드 | 5분 |
| `GET /api/wind-etl/errors?days=7` | 에러 분석 (에러 메시지별 발생 횟수) | 5분 |
| `GET /api/wind-etl/stats/files?days=30` | 파일 처리 통계 (일별) | 15분 |
| `GET /api/wind-etl/stats/records?days=30` | 레코드 처리 통계 (일별) | 15분 |

## Dependencies
- `ConfigModule` - 환경 변수 관리
- `CacheModule` - CacheService (캐싱)
- `pg` - PostgreSQL 클라이언트 (Pool)
