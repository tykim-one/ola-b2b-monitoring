<!-- Parent: ../AGENTS.md -->
# interfaces

## Purpose
문제 채팅 모듈의 핵심 TypeScript 인터페이스를 정의합니다.

## Key Files
- `problematic-chat.interface.ts` - 핵심 인터페이스: ProblematicChatRuleConfig (규칙 설정 구조), ParsedProblematicChatRule (파싱된 규칙), ProblematicChatItem (탐지된 채팅 아이템), ProblematicChatStats (통계 데이터)

## For AI Agents
- 규칙 설정 구조: `{ field: string, operator: string, value: string | string[] }`
- 프론트엔드 `@ola/shared-types`와 타입 동기화 필요
