<!-- Parent: ../AGENTS.md -->
# bigquery

## Purpose
GCP BigQuery 연동 모듈입니다. B2B LLM 로그 데이터 조회, 메트릭 계산, 분석 API를 제공합니다. 모든 데이터 조회는 캐싱이 적용됩니다.

## Key Files
- `bigquery.module.ts` - 모듈 정의, 의존성 주입 설정
- `bigquery.service.ts` - BigQuery 클라이언트 및 데이터 조회 로직 (캐싱 적용)
- `bigquery.controller.ts` - REST API 엔드포인트 정의

## Subdirectories
- `dto/` - Data Transfer Object (요청/응답 타입)
- `queries/` - SQL 쿼리 빌더

## For AI Agents
- **API 경로**: `/projects/:projectId/bigquery/*`
- **캐싱 전략**: SHORT(5분), MEDIUM(15분), LONG(1시간)
- 새 메트릭 추가 시:
  1. `queries/metrics.queries.ts`에 SQL 추가
  2. `bigquery.service.ts`에 메서드 추가 (캐싱 적용)
  3. `bigquery.controller.ts`에 엔드포인트 추가

## API Endpoints
- `POST /query` - 커스텀 SQL 실행
- `GET /datasets`, `GET /tables/:datasetId` - 메타데이터
- `GET /logs` - 샘플 로그
- `GET /metrics/*` - 실시간 KPI, 시간별/일별 트래픽
- `GET /analytics/*` - 테넌트 사용량, 히트맵, 비용 트렌드
- `GET /ai/*` - 토큰 효율성, 이상 탐지 통계
