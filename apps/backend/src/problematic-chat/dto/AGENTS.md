<!-- Parent: ../AGENTS.md -->
# dto

## Purpose
문제 채팅 모듈의 데이터 전송 객체(DTO)를 정의합니다. API 요청 데이터의 유효성 검증에 사용됩니다.

## Key Files
- `index.ts` - 모든 DTO의 barrel export
- `create-rule.dto.ts` - 규칙 생성 DTO (name, description, enabled, config: {field, operator, value})
- `update-rule.dto.ts` - 규칙 수정 DTO (모든 필드 선택적, PartialType 활용)
- `filter.dto.ts` - 조회 필터 DTO (ProblematicChatFilterDto: days, ruleIds, userId, tenantId, limit, offset / ProblematicChatStatsFilterDto)

## For AI Agents
- class-validator 데코레이터 사용하여 유효성 검증
- CreateRuleDto의 config 필드는 `ProblematicChatRuleConfig` 인터페이스를 따름
