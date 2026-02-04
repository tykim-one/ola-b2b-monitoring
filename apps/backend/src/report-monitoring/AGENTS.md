<!-- Parent: ../AGENTS.md -->
# report-monitoring

## Purpose
리포트 데이터 품질 모니터링 모듈. AI Stock, Commodity, Forex, Dividend 리포트의 데이터 존재 여부, 완전성(NULL 체크 + 전날 비교), 신선도를 검증하고, 이슈 발견 시 Slack 알림을 발송합니다. DB 기반 타겟 로드(gold.target_* 테이블).

## Key Files
- `report-monitoring.module.ts` - NestJS 모듈 정의 (ConfigModule, ScheduleModule, NotificationsModule import)
- `report-monitoring.service.ts` - 핵심 모니터링 로직 (존재/완전성/신선도 체크, Slack 알림, 요약 생성)
- `report-monitoring.controller.ts` - REST API 엔드포인트 (`/api/report-monitoring/*`, @Public() 적용)
- `report-monitoring.scheduler.ts` - Cron 기반 자동 실행 스케줄러 (환경변수로 cron 표현식 설정 가능, 기본값: '0 8 * * *')
- `external-db.service.ts` - 외부 DB 연결 및 쿼리 실행 (MySQL/PostgreSQL 지원, checkDataExists, checkDataFreshness, checkDataCompleteness 메서드)
- `target-loader.service.ts` - DB 기반 타겟 로드 (gold.target_* 테이블에서 symbol, display_name 조회, 캐싱 지원)

## Subdirectories
- `config/` - 리포트 타입별 필수 필드 검증 설정 (see config/AGENTS.md)
- `dto/` - API 요청/응답 DTO (see dto/AGENTS.md)
- `interfaces/` - 타입 정의 (see interfaces/AGENTS.md)

## For AI Agents
- 리포트 타입: `ai_stock`, `commodity`, `forex`, `dividend` (REPORT_TYPES 배열)
- 데이터 테이블: 모든 타입이 gold.daily_item_info 테이블 사용 (REPORT_DATA_TABLE 환경변수)
- 타겟 로드: gold.target_{reportType} 테이블에서 로드 (forex는 item_code 컬럼 사용)
- 체크 항목:
  1. 존재 여부 (missing)
  2. 완전성 (incomplete: 필수 필드 NULL, suspicious: 전날과 값 동일)
  3. 신선도 (stale: updated_at이 오늘 이전)
- 이슈 발견 시 `SlackNotificationService.sendAlert()` 호출 (severity: critical/warning)
- 환경변수: REPORT_DB_TYPE, REPORT_DB_HOST, REPORT_DB_PORT, REPORT_DB_NAME, REPORT_DB_USER, REPORT_DB_PASSWORD, REPORT_DATA_TABLE, REPORT_MONITOR_CRON, REPORT_MONITOR_TIMEZONE

## API Endpoints
- `POST /api/report-monitoring/check` - 전체 체크 실행
- `POST /api/report-monitoring/check/:reportType` - 특정 타입 체크
- `GET /api/report-monitoring/status` - 마지막 결과 조회
- `GET /api/report-monitoring/health` - 서비스 헬스 상태
- `POST /api/report-monitoring/trigger` - 스케줄러 수동 트리거
- `GET /api/report-monitoring/targets` - 타겟 파일 목록

## Dependencies
- `NotificationsModule` - SlackNotificationService
- `ConfigModule` - 환경변수 설정
- `ScheduleModule` - Cron 스케줄링 (SchedulerRegistry)
