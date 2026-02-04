<!-- Parent: ../AGENTS.md -->
# etl

## Purpose
ETL (Extract, Transform, Load) 작업 모니터링 페이지 그룹입니다. 외부 데이터 소스의 수집 작업을 추적합니다.

## Subdirectories
- `minkabu/` - Minkabu ETL 모니터링 (page.tsx)
- `wind/` - Wind ETL 모니터링 (page.tsx)

## For AI Agents
- **Minkabu**: PostgreSQL에서 실행 내역 조회, 일별 트렌드, 에러 분석
- **Wind**: (향후 추가 예정)
- **공통 패턴**: Dashboard 컴포넌트, KPICard, DataTable, 차트 (Recharts)

## Dependencies
- Backend: `/api/etl/minkabu/*`, `/api/etl/wind/*`
- Shared types: `@ola/shared-types` (MinkabuETLRun, WindETLRun)
- Hooks: use-etl.ts
