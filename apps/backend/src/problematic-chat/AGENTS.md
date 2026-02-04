<!-- Parent: ../AGENTS.md -->
# problematic-chat

## Purpose
동적 규칙 엔진 기반 문제 채팅 탐지 모듈입니다. 단순 규칙(v1)과 복합 규칙(v2 - AND/OR 조합) 모두 지원하며, BigQuery 로그에서 문제가 있는 채팅을 필터링하고 모니터링합니다. SQL 미리보기 기능 제공.

## Key Files
- `problematic-chat.module.ts` - NestJS 모듈 선언, AdminModule/CacheModule/DataSourceModule import
- `problematic-chat.service.ts` - 규칙 CRUD, 동적 SQL WHERE 절 생성 엔진, 문제 채팅 쿼리 실행, 통계 집계, SQL 미리보기 생성, CTE 지원 (next_user_input 등)
- `problematic-chat.controller.ts` - REST API 컨트롤러 (`/api/problematic-chat/rules`, `/api/problematic-chat/chats`, `/api/problematic-chat/stats`, `/api/problematic-chat/rules/:id/preview-query`)

## Subdirectories
- `dto/` - 데이터 전송 객체 (규칙 생성/수정, 필터링 DTO) (see dto/AGENTS.md)
- `interfaces/` - 핵심 인터페이스 정의 (규칙 설정, 파싱된 규칙, 채팅 아이템, 통계) (see interfaces/AGENTS.md)

## For AI Agents
- 규칙 v1: `{field, operator, value}` 구조, v2: `{version: 2, logic: 'AND'|'OR', conditions: [{field, operator, value}, ...]}`
- 동적 SQL 생성: contains, not_contains, contains_any, not_contains_any, lt, lte, gt, gte, eq, neq 연산자 지원
- CTE 모드: requiresCTE 필드(next_user_input 등)는 `WITH enriched AS (SELECT *, LEAD(...) ...) SELECT ... FROM enriched WHERE ...` 구조 사용
- 클라이언트 사이드 매칭: `getMatchedRuleNames()`로 각 채팅이 어떤 규칙에 매칭되는지 표시
- SQL 미리보기: `generateRulePreviewQuery()` 메서드로 {{TABLE}} 플레이스홀더 포함 쿼리 반환
- 캐싱: CacheService의 SHORT/MEDIUM TTL 사용, 규칙 변경 시 `invalidateRulesCache()` 호출
- 기존 규칙 포맷 자동 마이그레이션: `migrateConfig()` 메서드

## Dependencies
- `AdminModule` - PrismaService (규칙 저장 in SQLite)
- `CacheModule` - 규칙 및 결과 캐싱
- `DataSourceModule` - MetricsDataSource (BigQuery executeRawQuery)
- `@ola/shared-types` - RULE_FIELDS, RULE_OPERATORS, getFieldDefinition, getOperatorDefinition 유틸
