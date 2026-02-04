<!-- Parent: ../AGENTS.md -->
# config

## Purpose
리포트 모니터링 모듈의 검증 규칙 설정을 정의합니다. 리포트 타입별 필수 필드와 비교 규칙을 관리합니다.

## Key Files
- `index.ts` - Barrel export
- `required-fields.config.ts` - 리포트 타입별 필드 검증 설정 (forex, commodity, ai_stock, dividend). null 체크 규칙과 전일 대비 비교 규칙 정의. `getRequiredFields()` 함수로 공통 + 타입별 필드 병합, `getAllFieldsToFetch()` 함수로 필드 목록 중복 제거

## For AI Agents
- 새 리포트 타입 추가 시 `required-fields.config.ts`에 타입 설정 추가
- 공통 필드와 타입별 필드가 자동 병합됨
