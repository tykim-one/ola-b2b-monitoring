# Tier 1 규칙 엔진 확장 - 진행 상황

> **작성일**: 2026-02-04
> **목표**: Tier 1 규칙 9개 전부를 `dashboard/admin/problematic-rules`에서 설정 가능하게 함
> **상태**: 백엔드 완료, 프론트엔드 작업 중

---

## 완료된 작업

### ✅ Task 1: shared-types 확장
**파일**: `packages/shared-types/src/index.ts`

변경 내용:
- `RuleFieldDefinition` 인터페이스에 `requiresCTE?: boolean` 추가
- `RULE_FIELDS`에 7개 computed field 추가:
  - `response_length` (numeric) - 응답 글자 수
  - `korean_ratio` (numeric) - 한글 비율 (0.0~1.0)
  - `response_ends_complete` (boolean) - 응답 완결성 (종결어미)
  - `has_unclosed_code_block` (boolean) - 코드블록 깨짐
  - `response_question_count` (numeric) - 응답 내 물음표 수
  - `apology_count` (numeric) - 사과 표현 횟수
  - `next_user_input` (text, requiresCTE=true) - 세션 다음 입력
- `RULE_OPERATORS`에 `not_contains_any` 연산자 추가
- 타입 시스템 리팩토링:
  - `SingleCondition` 인터페이스 추가
  - `CompoundRuleConfig` 인터페이스 추가 (version: 2, logic: AND/OR, conditions[])
  - `SimpleRuleConfig` = `SingleCondition` (하위 호환)
  - `ProblematicChatRuleConfig` = `SimpleRuleConfig | CompoundRuleConfig` (union)
  - `isCompoundConfig()` 타입가드 함수
  - `normalizeToCompound()` v1→v2 변환 함수

### ✅ Task 2: 백엔드 서비스 수정
**파일**: `apps/backend/src/problematic-chat/problematic-chat.service.ts`

변경 내용:
- import에 `isCompoundConfig`, `CompoundRuleConfig`, `SingleCondition` 추가
- `validateRuleConfig()` → compound/single 분기 처리
- `validateSingleCondition()` 새 메서드 추가
- `buildSingleCondition()` → `not_contains_any` 연산자 지원 추가
- `buildCompoundCondition()` 새 메서드 추가 (AND/OR SQL 생성)
- `buildWhereConditions()` → compound config 분기 처리
- `getChatFieldValue()` → 7개 새 필드 매핑 추가 (korean_ratio, apology_count 등)
- `doesChatMatchRule()` → compound 조건 매칭 지원
- `doesChatMatchSingleCondition()` 새 메서드 (기존 로직 + not_contains_any)
- `rulesNeedCTE()` 새 헬퍼 (윈도우 함수 필요 여부 판단)
- `buildProblematicChatsQuery()` → CTE 래핑 지원 (LEAD 윈도우 함수)
- `queryProblematicChats()` → needsCTE 플래그 전달 + nextUserInput 결과 매핑
- `createRule()`/`updateRule()` → compound 타입 처리

### ✅ Task 3: 백엔드 DTO/인터페이스
**파일들**:
- `apps/backend/src/problematic-chat/interfaces/problematic-chat.interface.ts`
  - 로컬 `ProblematicChatRuleConfig` 제거, shared-types에서 import
  - `ProblematicChatItem`에 `nextUserInput?: string` 추가
- `apps/backend/src/problematic-chat/dto/create-rule.dto.ts`
  - `@IsValidRuleConfig()` 커스텀 validator 추가
  - simple/compound config 양쪽 검증
- `apps/backend/src/problematic-chat/dto/update-rule.dto.ts`
  - create-rule.dto.ts와 동일한 검증 로직

### ✅ 빌드 검증
- `pnpm build:backend` → 성공 (타입 에러 없음)

---

## 진행 중인 작업

### 🔄 Task 4: 프론트엔드 UI 수정
**파일**: `apps/frontend-next/src/app/dashboard/admin/problematic-rules/page.tsx`

**현재 상태**: 파일 읽기 완료, 수정 시작 전

**필요한 변경사항**:
1. import에 `isCompoundConfig`, `SingleCondition`, `CompoundRuleConfig`, `normalizeToCompound` 추가
2. `RuleFormData` 인터페이스 확장:
   ```typescript
   interface RuleFormData {
     name: string;
     description: string;
     isCompound: boolean;        // 복합 규칙 토글
     // 단순 규칙 (기존)
     field: string;
     operator: string;
     numericValue: number;
     stringValue: string;
     stringArrayValue: string;
     booleanValue: boolean;
     // 복합 규칙 (신규)
     conditions: Array<{
       field: string;
       operator: string;
       numericValue: number;
       stringValue: string;
       stringArrayValue: string;
       booleanValue: boolean;
     }>;
     logic: 'AND' | 'OR';
   }
   ```
3. `formatRuleSummary()` → compound config 지원 (현재 `config.field` 직접 접근 → 깨짐)
4. 테이블 렌더링 → compound 규칙 표시 (다중 조건 배지)
5. `handleOpenEdit()` → compound config 파싱
6. `handleSave()` → compound config 생성
7. 모달 UI:
   - "단순 규칙" / "복합 규칙" 모드 토글
   - 복합 모드: 조건 행 추가/삭제 버튼
   - AND/OR 로직 선택
   - 각 조건별 필드/연산자/값 입력
8. 미리보기: compound 조건 표시 `(조건1) AND (조건2)`

**주의**: 기존 page.tsx에서 `rule.config.field`, `rule.config.operator`, `rule.config.value`를 직접 접근하는 코드가 여러 곳에 있음 → compound config에서는 이 필드가 없으므로 타입가드 필요

---

## 남은 작업

### ⏳ Task 5: 빌드 검증 및 수정
- `pnpm build` (shared-types + backend + frontend 전체)
- 타입/린트 에러 수정

---

## Tier 1 규칙 매핑 (구현 완료 후 설정 방법)

| # | 규칙 | 설정 방법 |
|---|------|----------|
| #1 | 정형화된 에러 응답 | **단순**: `llm_response` + `contains_any` + ["이해하지 못했습니다", "다시 질문해", "잠시 후 다시 시도"] |
| #2 | 과도한 사과/거부 | **단순**: `apology_count` ≥ 2 |
| #3 | 응답 잘림 | **단순 2개**: ① `response_ends_complete` = false ② `has_unclosed_code_block` = true |
| #4 | 언어 불일치 | **단순**: `korean_ratio` < 0.3 |
| #5 | 면책 조항 누락 | **복합 AND**: `llm_response` contains_any ["주가","수익률","매수","매도","투자"] AND `llm_response` not_contains_any ["투자 책임","참고 용도","투자 권유가 아님"] |
| #6 | 단정적 투자 표현 | **단순**: `llm_response` + `contains_any` + ["확실히 오를","100% 수익","반드시 상승","무조건 사세요"] |
| #7 | 규제 금지어 | **단순**: `llm_response` + `contains_any` + ["원금 보장","무위험 수익","확정 수익률"] |
| #8 | 질문 되돌리기 | **복합 AND**: `user_input` contains "?" AND `response_question_count` ≥ 2 |
| #9 | 부정적 후속 반응 | **단순**: `next_user_input` + `contains_any` + ["아니","틀렸","잘못","다시","wrong","제대로"] |

---

## 수정된 파일 전체 목록

| 파일 | 상태 | 변경 내용 |
|------|------|----------|
| `packages/shared-types/src/index.ts` | ✅ 완료 | RULE_FIELDS 7개, RULE_OPERATORS 1개, compound 타입 |
| `apps/backend/src/problematic-chat/problematic-chat.service.ts` | ✅ 완료 | compound SQL, 새 필드, CTE |
| `apps/backend/src/problematic-chat/interfaces/problematic-chat.interface.ts` | ✅ 완료 | 타입 import, nextUserInput |
| `apps/backend/src/problematic-chat/dto/create-rule.dto.ts` | ✅ 완료 | compound 검증 |
| `apps/backend/src/problematic-chat/dto/update-rule.dto.ts` | ✅ 완료 | compound 검증 |
| `apps/frontend-next/src/app/dashboard/admin/problematic-rules/page.tsx` | 🔄 진행 중 | compound UI |

---

## 다음 세션에서의 작업 재개 방법

1. **이 파일 읽기**: `.sisyphus/plans/tier1-rule-engine-progress.md`
2. **플랜 파일 참조**: `.claude/plans/shimmering-sniffing-pebble.md` (전체 구현 계획)
3. **아이디에이션 참조**: `.sisyphus/plans/chatbot-quality-rulebase-ideation.md` (26개 규칙 아이디어)
4. **Task 4 실행**: 프론트엔드 `page.tsx` 복합 규칙 UI 구현
5. **Task 5 실행**: 전체 빌드 검증

### 핵심 컨텍스트
- 현재 `page.tsx`는 `rule.config.field` 직접 접근 → compound config에서 깨짐
- `isCompoundConfig()` 타입가드로 분기 필요
- 새 필드 7개는 RULE_FIELDS에 이미 추가되어 드롭다운에 자동 반영됨
- `not_contains_any` 연산자도 이미 추가됨
- 백엔드는 빌드 통과 확인 완료

---

## 관련 문서
- 구현 계획: `.claude/plans/shimmering-sniffing-pebble.md`
- 규칙 아이디에이션: `.sisyphus/plans/chatbot-quality-rulebase-ideation.md`
- 기존 compound 계획: `.sisyphus/plans/compound-rule-engine.md`
- 기존 dynamic 계획: `.sisyphus/plans/dynamic-rule-engine.md`
