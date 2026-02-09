<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-09 | Updated: 2026-02-09 -->

# report-monitoring

## Purpose
리포트 데이터 품질 모니터링 페이지. 리포트의 데이터 존재 여부, 완전성, 신선도를 체크합니다. UI 렌더링 체크는 별도의 `/dashboard/ui-check` 페이지로 분리되었습니다.

## Key Files
| File | Description |
|------|-------------|
| `page.tsx` | 리포트 데이터 체크 실행, 이슈 상세 (누락/불완전/의심/오래됨), 시스템 상태 |

## For AI Agents
### Working In This Directory
- **URL**: `/dashboard/report-monitoring`
- **체크 타입**: MISSING (데이터 없음), INCOMPLETE (필수 필드 NULL), SUSPICIOUS (전날과 값 동일), STALE (어제 이전 데이터)
- **리포트 타입**: ai_stock, commodity, forex, dividend
- **즉시 실행**: POST /api/report-monitoring/check로 수동 체크
- **스케줄**: 백엔드 cron 스케줄러로 자동 체크
- **UI 체크와 구분**: 이 페이지는 데이터 품질만 담당. UI 렌더링/구조 체크는 `../ui-check/` 참조

## Dependencies
### Internal
- Backend: `/api/report-monitoring/*` (NestJS report-monitoring 모듈)
- Service: `@/services/reportMonitoringService.ts`
- Hooks: `@/hooks/queries/use-report-monitoring.ts`
- `@ola/shared-types` - 공유 타입

### Related
- `../ui-check/` - UI 렌더링 모니터링 (Playwright 기반)
