<!-- Parent: ../AGENTS.md -->
# dto

## Purpose
문제 채팅 모듈의 데이터 전송 객체(DTO)를 정의합니다. API 요청 데이터의 유효성 검증 및 변환에 사용됩니다.

## Key Files
- `index.ts` - 모든 DTO의 barrel export
- `create-rule.dto.ts` - 규칙 생성 DTO (name, description, isEnabled, config). 커스텀 validator `@IsValidRuleConfig()` 사용하여 v1/v2 규칙 구조 모두 검증. v2 규칙은 logic, conditions, field/operator/value 타입 일치 검증.
- `update-rule.dto.ts` - 규칙 수정 DTO (모든 필드 선택적). 동일한 `@IsValidRuleConfig()` validator 사용.
- `filter.dto.ts` - 조회 필터 DTO. `ProblematicChatFilterDto`(days, ruleIds, userId, tenantId, limit, offset), `ProblematicChatStatsFilterDto`(days, tenantId). class-transformer의 `@Transform()` 사용하여 ruleIds를 콤마 구분 문자열에서 배열로 변환.

## For AI Agents
- class-validator 데코레이터로 유효성 검증 (@IsString, @IsOptional, @IsBoolean, @IsArray, @IsNumber, @Min, @Max)
- CreateRuleDto/UpdateRuleDto의 config 필드는 `ProblematicChatRuleConfig` 타입 (단순 또는 복합 규칙)
- IsValidRuleConfig는 RULE_FIELDS, RULE_OPERATORS 참조하여 필드/연산자 조합 유효성 검증
- 복합 규칙(v2): version=2, logic='AND'|'OR', conditions 배열 검증
