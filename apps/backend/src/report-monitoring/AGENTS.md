<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-09 | Updated: 2026-02-09 -->

# report-monitoring

## Purpose
리포트 데이터 품질 모니터링 + UI 렌더링 체크 통합 모듈. 데이터 존재/완전성/신선도 검증과 Playwright 기반 UI 체크를 모두 포함합니다.

## Key Files
| File | Description |
|------|-------------|
| `report-monitoring.module.ts` | NestJS 모듈 정의 (ConfigModule, ScheduleModule, NotificationsModule import) |
| `report-monitoring.service.ts` | 데이터 품질 모니터링 로직 (존재/완전성/신선도 체크, Slack 알림) |
| `report-monitoring.controller.ts` | REST API 엔드포인트 (데이터 체크 + UI 체크 통합) |
| `report-monitoring.scheduler.ts` | 데이터 체크 Cron 스케줄러 (기본값: '0 8 * * *') |
| `ui-check.service.ts` | Playwright 기반 UI 렌더링 체크 (구조/콘텐츠/렌더링/에러 검증) |
| `ui-check.service.spec.ts` | UI 체크 서비스 유닛 테스트 |
| `ui-check.scheduler.ts` | UI 체크 전용 Cron 스케줄러 |
| `external-db.service.ts` | 외부 DB 연결 (MySQL/PostgreSQL, checkDataExists/Freshness/Completeness) |
| `target-loader.service.ts` | DB 기반 타겟 로드 (gold.target_* 테이블, 캐싱 지원) |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `config/` | 리포트 타입별 필수 필드 검증 설정 (see `config/AGENTS.md`) |
| `dto/` | API 요청/응답 DTO (see `dto/AGENTS.md`) |
| `interfaces/` | 타입 정의 - 데이터 체크 + UI 체크 인터페이스 (see `interfaces/AGENTS.md`) |

## For AI Agents
### Data Quality Check
- 리포트 타입: `ai_stock`, `commodity`, `forex`, `dividend` (REPORT_TYPES 배열)
- 데이터 테이블: gold.daily_item_info (REPORT_DATA_TABLE 환경변수)
- 타겟 로드: gold.target_{reportType} 테이블 (forex는 item_code 컬럼)
- 체크 항목: 존재 여부(missing), 완전성(incomplete/suspicious), 신선도(stale)
- 이슈 발견 시 `SlackNotificationService.sendAlert()` 호출

### UI Check (Playwright)
- `ui-check.service.ts`: Playwright 브라우저로 리포트 페이지 접속 후 DOM 검증
- 체크 카테고리: `structure` (구조), `content` (콘텐츠), `rendering` (렌더링), `error` (에러)
- 상태: `healthy` (정상), `degraded` (경고), `broken` (장애)
- 설정: config API로 체크 템플릿 조회/수정 (타겟별 checks 배열)
- 이력: 체크 결과를 저장하고 이전 실행 결과 조회 가능

### 환경변수
- 데이터: REPORT_DB_TYPE, REPORT_DB_HOST, REPORT_DB_PORT, REPORT_DB_NAME, REPORT_DB_USER, REPORT_DB_PASSWORD, REPORT_DATA_TABLE
- 스케줄: REPORT_MONITOR_CRON, REPORT_MONITOR_TIMEZONE
- UI 체크: UI_CHECK_BASE_URL, UI_CHECK_CRON

## API Endpoints
### Data Quality
- `POST /api/report-monitoring/check` - 전체 체크 실행
- `POST /api/report-monitoring/check/:reportType` - 특정 타입 체크
- `GET /api/report-monitoring/status` - 마지막 결과 조회
- `GET /api/report-monitoring/health` - 서비스 헬스 상태
- `POST /api/report-monitoring/trigger` - 스케줄러 수동 트리거
- `GET /api/report-monitoring/targets` - 타겟 파일 목록

### UI Check
- `POST /api/report-monitoring/ui-check/run` - UI 체크 즉시 실행
- `GET /api/report-monitoring/ui-check/result` - 최신 UI 체크 결과
- `GET /api/report-monitoring/ui-check/history` - UI 체크 이력
- `GET /api/report-monitoring/ui-check/history/:id` - 이력 상세
- `GET /api/report-monitoring/ui-check/health` - UI 체크 시스템 상태
- `GET /api/report-monitoring/ui-check/config` - 체크 설정 조회
- `PATCH /api/report-monitoring/ui-check/config` - 체크 설정 수정

## Dependencies
- `NotificationsModule` - SlackNotificationService
- `ConfigModule` - 환경변수 설정
- `ScheduleModule` - Cron 스케줄링 (SchedulerRegistry)
- `playwright` - UI 체크용 헤드리스 브라우저
