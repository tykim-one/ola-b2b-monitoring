<!-- Parent: ../AGENTS.md -->
# problematic-rules

## Purpose
문제 채팅 필터링 규칙 관리 페이지입니다. BigQuery 필드와 연산자를 조합하여 동적 규칙을 생성/관리합니다.

## Key Files
- `page.tsx` - 규칙 CRUD 인터페이스, 단순/복합 규칙 모드 전환, SQL 쿼리 미리보기

## For AI Agents
- **규칙 타입**: 단순 규칙 (단일 조건) vs 복합 규칙 (다중 조건 + AND/OR 로직)
- **필드**: output_tokens, korean_char_ratio, success, llm_response_text 등 (RULE_FIELDS 참조)
- **연산자**: >, <, >=, <=, CONTAINS, NOT_CONTAINS, IN, NOT_IN 등
- **SQL 미리보기**: GET /api/admin/problematic-rules/:id/preview-sql로 생성될 WHERE 절 확인
- **활성화/비활성화**: 규칙별로 토글 가능, 비활성 규칙은 필터링에서 제외

## Dependencies
- Backend: `/api/admin/problematic-rules/*` (NestJS)
- Shared types: `@ola/shared-types` (ProblematicChatRule, RULE_FIELDS, operators)
- Service: `problematicChatService.ts`
