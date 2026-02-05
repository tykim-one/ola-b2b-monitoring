<!-- Parent: ../AGENTS.md -->
# operations/

## Purpose
운영 메트릭 페이지. 실시간 KPI, 시간별 트래픽, 에러 분석, 이상 탐지 통계를 시각화합니다.

## Key Files
- `page.tsx` - 운영 대시보드 페이지 (실시간 메트릭, 트래픽 차트, 에러 통계)

## Subdirectories
없음

## For AI Agents
- **URL 경로**: `/dashboard/operations`
- **주요 기능**:
  - 실시간 KPI: 총 요청 수, 성공률, 평균 응답 시간, 에러 건수
  - HourlyTrafficChart: 시간별 요청/성공/실패 트렌드 (Recharts Area Chart)
  - ErrorAnalysisTable: 에러 유형별 건수 및 비율
  - AnomalyStatsChart: 이상 탐지 통계 (Z-Score 기반)
- **데이터 소스**: `useOperationsDashboard` 훅
- **KPI 상태**: 성공률 95% 이상 success, 90~95% warning, 90% 미만 danger
- **차트 색상**: 요청(파란색), 성공(초록색), 실패(빨간색)

## Dependencies
- `@/hooks/queries/use-dashboard` - useOperationsDashboard
- `@/components/compound/Dashboard`
- `@/components/kpi/KPICard`
- `@/components/charts/HourlyTrafficChart`
- `@ola/shared-types` - RealtimeKPI, HourlyTraffic, ErrorAnalysis
