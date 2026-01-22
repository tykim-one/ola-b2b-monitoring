<!-- Parent: ../AGENTS.md -->
# wind

## Purpose
Wind ETL 모니터링 대시보드입니다. 중국 금융 데이터(Wind) 파일 처리 파이프라인의 실행 상태를 모니터링합니다.

## Key Files
- `page.tsx` - Wind ETL 대시보드 메인 페이지
  - KPI 카드: 총 실행, 성공률, 평균 소요시간, 현재 상태
  - 일별 트렌드 차트 (AreaChart)
  - 파일 처리 통계 차트 (BarChart)
  - 최근 실행 테이블
  - 에러 분석 섹션

## For AI Agents
- 서비스: `src/services/windEtlService.ts`
- API 엔드포인트: `/api/wind-etl/*`
- 데이터 소스: PostgreSQL `ops.cn_wind_etl_runs` 테이블
- 5분 자동 새로고침

## Dependencies
- 백엔드: `apps/backend/src/wind-etl/`
- 컴포넌트: `src/components/kpi/KPICard`, Recharts
