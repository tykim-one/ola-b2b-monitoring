<!-- Parent: ../AGENTS.md -->
# minkabu

## Purpose
Minkabu ETL 모니터링 대시보드입니다. 일본 금융 뉴스(Minkabu) 크롤링 파이프라인의 실행 상태를 모니터링합니다.

## Key Files
- `page.tsx` - Minkabu ETL 대시보드 메인 페이지
  - KPI 카드: 총 실행, 성공률, 평균 기사 수집, 현재 상태
  - 일별 트렌드 차트 (AreaChart)
  - 헤드라인 수집 통계 차트 (BarChart)
  - 최근 실행 테이블
  - 에러 분석 섹션

## For AI Agents
- 서비스: `src/services/minkabuEtlService.ts`
- API 엔드포인트: `/api/minkabu-etl/*`
- 데이터 소스: PostgreSQL `ops.jp_minkabu_etl_runs` 테이블
- 5분 자동 새로고침

## Dependencies
- 백엔드: `apps/backend/src/minkabu-etl/`
- 컴포넌트: `src/components/kpi/KPICard`, Recharts
