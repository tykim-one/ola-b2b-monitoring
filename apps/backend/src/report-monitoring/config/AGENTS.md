<!-- Parent: ../AGENTS.md -->
# config

## Purpose
리포트 모니터링 모듈의 완전성 검증 규칙 설정을 정의합니다. 리포트 타입별 필수 필드와 전날 비교 필드를 관리합니다.

## Key Files
- `index.ts` - Barrel export
- `required-fields.config.ts` - 리포트 타입별 필드 검증 설정
  - `RequiredFieldsConfig` 인터페이스: `{nullCheck: string[], compareYesterday: string[]}`
  - `COMMON_REQUIRED_FIELDS`: 모든 타입 공통 (nullCheck: ['value', 'diff'], compareYesterday: ['value', 'diff'])
  - `REPORT_TYPE_REQUIRED_FIELDS`: 타입별 추가 필드 (forex/commodity: change_value, updated_at)
  - `getRequiredFields(reportType)`: 공통 + 타입별 필드 병합 반환
  - `getAllFieldsToFetch(reportType)`: 중복 제거된 전체 필드 목록 반환 (symbol 포함)

## For AI Agents
- 새 리포트 타입 추가 시 `REPORT_TYPE_REQUIRED_FIELDS`에 타입 설정 추가
- `nullCheck` 필드: NULL 여부를 체크할 필드 목록 (incomplete 판정)
- `compareYesterday` 필드: 전날 값과 비교할 필드 목록 (값이 동일하면 suspicious 판정)
- ai_stock, dividend는 추가 설정 없이 공통 필드만 사용
