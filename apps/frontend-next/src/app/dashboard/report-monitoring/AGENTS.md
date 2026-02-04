<!-- Parent: ../AGENTS.md -->
# report-monitoring

## Purpose
리포트 생성 모니터링 페이지입니다. 자동 생성된 리포트의 품질 검증 결과를 표시합니다.

## Key Files
- `page.tsx` - 리포트 모니터링 대시보드 (검증 결과, 필드 상태, 타입별 통계)

## For AI Agents
- 라우트: `/dashboard/report-monitoring`
- reportMonitoringService 활용
- 리포트 타입: forex, commodity, ai_stock, dividend
