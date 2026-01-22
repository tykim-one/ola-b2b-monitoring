<!-- Parent: ../AGENTS.md -->
# etl

## Purpose
외부 데이터 ETL (Extract, Transform, Load) 파이프라인 모니터링 대시보드입니다.
PostgreSQL 기반의 ETL 실행 상태, 트렌드, 에러 분석을 시각화합니다.

## Subdirectories
- `wind/` - Wind ETL 모니터링 (중국 금융 데이터 파이프라인)
- `minkabu/` - Minkabu ETL 모니터링 (일본 뉴스 크롤링 파이프라인)

## For AI Agents
- 각 ETL 대시보드는 독립적인 PostgreSQL 테이블을 조회
- 백엔드 API는 인증 없이 접근 가능 (`@Public()` 데코레이터 적용)
- 서비스 파일: `src/services/windEtlService.ts`, `src/services/minkabuEtlService.ts`

## Dependencies
- 백엔드: `apps/backend/src/wind-etl/`, `apps/backend/src/minkabu-etl/`
- 환경변수: `WIND_PG_*`, `MINKABU_PG_*` (PostgreSQL 연결 정보)
