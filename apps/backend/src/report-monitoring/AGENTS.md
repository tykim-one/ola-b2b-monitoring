<!-- Parent: ../AGENTS.md -->
# report-monitoring

## Purpose
리포트 데이터 품질 모니터링 모듈. AI Stock, Commodity, Forex, Dividend 리포트의 데이터 존재 여부와 신선도를 검증하고, 이슈 발견 시 Slack 알림을 발송합니다.

## Key Files
- `report-monitoring.module.ts` - NestJS 모듈 정의
- `report-monitoring.service.ts` - 핵심 모니터링 로직 (존재/신선도 체크, 알림)
- `report-monitoring.controller.ts` - REST API 엔드포인트 (`/api/report-monitoring/*`)
- `report-monitoring.scheduler.ts` - Cron 기반 자동 실행 스케줄러
- `external-db.service.ts` - 외부 DB 연결 및 쿼리 실행
- `target-loader.service.ts` - CSV 타겟 파일 로드

## Subdirectories
- `dto/` - API 요청/응답 DTO (see dto/AGENTS.md)
- `interfaces/` - 타입 정의 (see interfaces/AGENTS.md)

## For AI Agents
- 리포트 타입: `ai_stock`, `commodity`, `forex`, `dividend`
- 데이터 테이블: `gold.daily_item_info` (환경변수로 설정 가능)
- 체크 항목: 데이터 존재 여부, 신선도 (어제 이전이면 stale)
- 이슈 발견 시 `SlackNotificationService`로 알림 발송
- API는 `@Public()` 데코레이터로 인증 없이 접근 가능

## API Endpoints
- `POST /api/report-monitoring/check` - 전체 체크 실행
- `POST /api/report-monitoring/check/:reportType` - 특정 타입 체크
- `GET /api/report-monitoring/status` - 마지막 결과 조회
- `GET /api/report-monitoring/health` - 서비스 헬스 상태
- `POST /api/report-monitoring/trigger` - 스케줄러 수동 트리거
- `GET /api/report-monitoring/targets` - 타겟 파일 목록

## Dependencies
- `NotificationsModule` - Slack 알림
- `ConfigModule` - 환경변수 설정
- `ScheduleModule` - Cron 스케줄링
