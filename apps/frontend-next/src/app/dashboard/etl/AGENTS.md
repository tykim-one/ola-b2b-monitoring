<!-- Parent: ../AGENTS.md -->
# etl/

## Purpose
ETL 모니터링 페이지. 외부 데이터 소스(minkabu, wind) 연동 상태 및 동기화 현황을 모니터링합니다.

## Key Files
없음 (하위 디렉토리만 존재)

## Subdirectories
- `minkabu/` - Minkabu ETL 모니터링 (page.tsx)
- `wind/` - Wind ETL 모니터링 (page.tsx)

## For AI Agents
- **URL 경로**: `/dashboard/etl/minkabu`, `/dashboard/etl/wind`
- **주요 기능**:
  - ETL 작업 실행 상태 (성공/실패/진행중)
  - 최근 동기화 시간
  - 데이터 소스별 레코드 수
- **데이터 소스**: `/api/etl/{source}/status` API (예정)

## Dependencies
- `@/components/compound/Dashboard`
- `@/components/kpi/KPICard`
