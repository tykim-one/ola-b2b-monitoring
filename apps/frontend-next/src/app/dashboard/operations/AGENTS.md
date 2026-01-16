<!-- Parent: ../AGENTS.md -->
# operations

## Purpose
운영 대시보드 페이지입니다. 실시간 KPI, 시간별 트래픽, 에러율 등 운영 메트릭을 표시합니다.

## Key Files
- `page.tsx` - 운영 대시보드 페이지 컴포넌트

## For AI Agents
- API 엔드포인트: `/metrics/realtime`, `/metrics/hourly`
- 차트: RealtimeTrafficChart, ErrorGauge, KPICard
