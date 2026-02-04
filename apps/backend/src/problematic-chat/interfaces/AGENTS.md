<!-- Parent: ../AGENTS.md -->
# interfaces

## Purpose
문제 채팅 모듈의 핵심 TypeScript 인터페이스를 정의합니다.

## Key Files
- `problematic-chat.interface.ts` - 핵심 인터페이스 정의
  - `ProblematicChatRuleEntity` - Prisma DB 엔티티 (id, name, description, isEnabled, type, config: string, createdAt, updatedAt)
  - `ParsedProblematicChatRule` - 파싱된 규칙 (config가 ProblematicChatRuleConfig 객체로 변환됨)
  - `ProblematicChatItem` - 탐지된 채팅 아이템 (id, timestamp, userId, tenantId, userInput, llmResponse, inputTokens, outputTokens, totalTokens, success, sessionId, matchedRules: string[], nextUserInput?)
  - `ProblematicChatStats` - 통계 데이터 (totalCount, byRule: {ruleId, ruleName, count, percentage}[], byTenant: {tenantId, count}[])

## For AI Agents
- `ProblematicChatRuleConfig`는 `@ola/shared-types`에서 import (단순/복합 규칙 유니온 타입)
- `matchedRules` 필드는 서비스에서 클라이언트 사이드 매칭으로 채워짐
- `nextUserInput` 필드는 CTE LEAD 윈도우 함수로 조회되는 선택적 필드
