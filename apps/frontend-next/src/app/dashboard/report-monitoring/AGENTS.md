<!-- Parent: ../AGENTS.md -->
# report-monitoring

## Purpose
리포트 데이터 모니터링 페이지입니다. 생성된 리포트의 데이터 품질을 체크합니다.

## Key Files
- `page.tsx` - 리포트 체크 실행, 이슈 상세 (누락/불완전/의심/오래됨), 시스템 상태

## For AI Agents
- **체크 타입**: MISSING (데이터 없음), INCOMPLETE (필수 필드 NULL), SUSPICIOUS (전날과 값 동일), STALE (어제 이전 데이터)
- **리포트 타입**: ai_stock, commodity, forex, dividend
- **즉시 실행**: POST /api/report-monitoring/check로 수동 체크
- **스케줄**: 백엔드 cron 스케줄러로 자동 체크 (schedules 설정)

## Dependencies
- Backend: `/api/report-monitoring/*` (NestJS)
- Service: reportMonitoringService.ts
- Hooks: use-report-monitoring.ts
