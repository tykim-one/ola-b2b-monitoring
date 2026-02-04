<!-- Parent: ../AGENTS.md -->
# problematic-rules

## Purpose
문제 채팅 탐지 규칙 관리 페이지입니다. 동적 규칙 엔진을 통해 BigQuery 로그에서 문제 채팅을 필터링하는 규칙을 설정합니다.

## Key Files
- `page.tsx` - 규칙 목록, 생성/수정/삭제, 규칙별 통계, 탐지된 채팅 목록

## For AI Agents
- 라우트: `/dashboard/admin/problematic-rules`
- problematicChatService로 백엔드 API 호출
- 규칙 설정: field(필드), operator(연산자), value(값) 구조
- `@ola/shared-types`의 RULE_FIELDS, RULE_OPERATORS 활용
