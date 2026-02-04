<!-- Parent: ../AGENTS.md -->
# metrics

## Purpose
데이터 소스 중립적인 메트릭 모듈입니다. B2B LLM 로그 데이터 조회, 메트릭 계산, 분석 API를 제공합니다. 모든 데이터 조회는 캐싱이 적용됩니다. 현재는 BigQuery를 사용하지만, MySQL, MongoDB 등 다른 데이터소스로 확장 가능합니다.

**DataSource 추상화**: `datasource/` 모듈의 `MetricsDataSource` 인터페이스를 통해 데이터를 조회합니다. 캐싱 로직은 이 모듈에서 관리합니다.

## Key Files
- `metrics.module.ts` - 모듈 정의, 의존성 주입 설정
- `metrics.service.ts` - 메트릭 서비스 및 데이터 조회 로직 (캐싱 적용), BigQuery 관리 기능 포함
- `metrics.controller.ts` - REST API 엔드포인트 정의

## Subdirectories
- `dto/` - Data Transfer Object (요청/응답 타입)
- `queries/` - SQL 쿼리 빌더

## For AI Agents
- **API 경로**: `/projects/:projectId/api/*` (데이터소스 중립적)
- **캐싱 전략**: SHORT(5분), MEDIUM(15분), LONG(1시간)
- **DataSource 아키텍처**:
  - `MetricsService`는 캐싱 레이어 역할
  - 실제 데이터 조회는 `MetricsDataSource` 인터페이스 통해
  - 새 데이터 소스 추가 시 `datasource/` 모듈 확장
- **BigQuery 관리 기능**: `executeQuery()`, `getDatasets()`, `getTables()`, `getSampleLogs()` 메서드는 BigQuery 전용 관리 기능
- **글로벌/도메인 메트릭**: `GlobalMetricsService`는 전체 프로젝트 통계, `DomainMetricsService`는 도메인별 집계
- 새 메트릭 추가 시:
  1. `@ola/shared-types`에 타입 추가
  2. `datasource/interfaces/metrics-datasource.interface.ts`에 메서드 추가
  3. `datasource/implementations/bigquery-metrics.datasource.ts`에 구현 추가
  4. `queries/metrics.queries.ts`에 SQL 추가
  5. `metrics.service.ts`에 캐싱 적용 메서드 추가
  6. `metrics.controller.ts`에 엔드포인트 추가

## API Endpoints
- `POST /query` - 커스텀 SQL 실행 (BigQuery 전용)
- `GET /datasets`, `GET /tables/:datasetId` - 메타데이터 (BigQuery 전용)
- `GET /logs` - 샘플 로그
- `GET /metrics/*` - 실시간 KPI, 시간별/일별 트래픽
- `GET /analytics/*` - 테넌트 사용량, 히트맵, 비용 트렌드
- `GET /analytics/user-requests` - 유저별 요청 수 (x_enc_data 기준)
- `GET /analytics/user-tokens` - 유저별 토큰 사용량 (x_enc_data 기준)
- `GET /analytics/user-patterns` - 유저별 자주 묻는 질문 패턴
- `GET /analytics/user-list` - 유저 목록 (통합 통계)
- `GET /analytics/user-activity/:userId` - 유저 활동 상세 (대화 이력)
- `GET /ai/*` - 토큰 효율성, 이상 탐지 통계
- `GET /quality/*` - 토큰 효율성 트렌드, 질문-응답 상관관계, 반복 패턴
- `GET /cache/stats`, `DELETE /cache` - 캐시 관리

## Dependencies
- `../datasource/` - 데이터 소스 추상화 레이어
- `../cache/` - 캐싱 서비스
- `@ola/shared-types` - 공유 타입
