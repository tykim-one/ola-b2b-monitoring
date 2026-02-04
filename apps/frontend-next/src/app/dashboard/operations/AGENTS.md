<!-- Parent: ../AGENTS.md -->
# operations

## Purpose
운영 메트릭 페이지입니다. 실시간 트래픽, 에러율, 토큰 효율성 등 운영 지표를 제공합니다.

## Key Files
- `page.tsx` - 운영 KPI, RealtimeTrafficChart, ErrorGauge, TokenScatterPlot

## For AI Agents
- **실시간 트래픽**: 시간별 요청 수 추이
- **에러율**: 전체 요청 대비 실패 비율 (게이지 차트)
- **토큰 산점도**: 입력 토큰 vs 출력 토큰 분포

## Dependencies
- Backend: `/api/metrics/*` (실시간 KPI, 시간별 트래픽, 에러 통계)
- Components: RealtimeTrafficChart, ErrorGauge, TokenScatterPlot
- Hooks: use-dashboard.ts
