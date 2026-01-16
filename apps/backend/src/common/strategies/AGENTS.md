<!-- Parent: ../AGENTS.md -->
# strategies

## Purpose
프로젝트별 데이터 필터링 및 로그 파싱 전략을 정의합니다. Strategy 패턴을 사용하여 프로젝트마다 다른 로직을 적용할 수 있습니다.

## Key Files
- `project.strategy.interface.ts` - 전략 인터페이스 정의
- `default.project.strategy.ts` - 기본 프로젝트 전략 구현

## For AI Agents
- 새 프로젝트 유형 추가 시 ProjectStrategy 인터페이스 구현
- `getFilterQuery()` - WHERE 절 필터 생성
- `parseLog()` - 로그 데이터 파싱/변환

## Schema 참고
현재 **플랫 스키마** 사용 (jsonPayload 중첩 아님):
- `tenant_id`, `user_input`, `llm_response` 등 모두 루트 레벨
- `request_metadata.service`로 서비스명 접근
