# 계획: 복합 조건 룰 엔진 + 필드/연산자 확장

## 컨텍스트

### 원래 요청
품질 모니터링 강화를 위해:
1. 복합 조건(AND/OR) 지원 - 예: (A AND B) OR (C AND D)
2. 새로운 필터링 필드 및 연산자 추가

### 현재 상태 (Phase 1 완료)
- 단일 조건 룰 시스템 구현 완료: `{ field, operator, value }`
- 7개 필드, 9개 연산자 정의됨 (`RULE_FIELDS`, `RULE_OPERATORS`)
- 동적 SQL 생성 엔진 (`buildSingleCondition()`, `buildWhereConditions()`)
- 프론트엔드: 단일 조건 폼 (필드 드롭다운 + 연산자 드롭다운 + 값 입력)
- 룰 간 관계: 활성 룰들이 **OR**로 결합됨 (`conditions.join(' OR ')`)
- 클라이언트 사이드 매칭: `doesChatMatchRule()` (단일 조건 매칭)

### 핵심 파일
| 파일 | 역할 |
|------|------|
| `packages/shared-types/src/index.ts` | RULE_FIELDS(7), RULE_OPERATORS(9), 타입/인터페이스 |
| `apps/backend/src/problematic-chat/problematic-chat.service.ts` | SQL 생성, 룰 매칭, CRUD |
| `apps/backend/src/problematic-chat/interfaces/problematic-chat.interface.ts` | ProblematicChatRuleConfig 등 |
| `apps/backend/src/problematic-chat/dto/create-rule.dto.ts` | CreateRuleDto |
| `apps/backend/src/problematic-chat/dto/update-rule.dto.ts` | UpdateRuleDto |
| `apps/frontend-next/src/app/dashboard/admin/problematic-rules/page.tsx` | 관리 UI |
| `apps/frontend-next/src/components/charts/ProblematicChatTable.tsx` | 테이블 표시 |
| `apps/frontend-next/src/components/charts/ProblematicChatDialog.tsx` | 상세 다이얼로그 |

---

## 작업 목표

### Core Objective
단일 조건 룰 시스템을 **복합 조건(AND/OR 그룹) 지원** + **확장된 필드/연산자**로 강화하여, LLM 응답 품질이 낮은 케이스를 더 정밀하게 탐지할 수 있게 한다.

### Deliverables
1. 복합 조건을 지원하는 새로운 config 스키마
2. 확장된 필드 12개, 연산자 15개
3. SQL 생성 엔진 업그레이드 (중첩 AND/OR)
4. 복합 조건 빌더 UI (그룹 추가/삭제, 드래그)
5. 기존 단일 조건 룰의 자동 마이그레이션

### Definition of Done
- 기존 단일 조건 룰이 복합 조건 스키마로 자동 변환
- (output_tokens < 100 AND success = false) OR (llm_response CONTAINS "죄송") 같은 복합 룰 생성 가능
- 새 필드(response_length, severity, tenant_id 등)로 필터링 가능
- 프론트엔드 UI에서 그룹 추가/삭제, 조건 추가/삭제 직관적
- 프론트엔드 미리보기에서 생성될 SQL 조건 확인 가능

---

## Must Have / Must NOT Have

### Must Have (Guardrails)
- 기존 단일 조건 룰과의 하위 호환성 (자동 마이그레이션)
- SQL 인젝션 방지 (화이트리스트 + escaping 유지)
- `shared-types` 빌드 순서 보장 (shared-types -> backend -> frontend)
- config 스키마 버전 관리 (v1=단일, v2=복합 자동 감지)

### Must NOT Have
- 3단계 이상 중첩 (AND 안의 OR 안의 AND) - 복잡성 제한으로 2단계까지만
- 사용자 정의 SQL expression 입력 기능 (보안 위험)
- 정규표현식 SQL 실행 (BigQuery REGEXP_CONTAINS는 비용이 높으므로 Phase 3로 분리)

---

## 1. 새로운 필드 목록 (우선순위 기준)

### Priority 1 - 즉시 실용적 (데이터 바로 활용 가능)

| field | label | dataType | sqlExpression | 용도 |
|-------|-------|----------|---------------|------|
| `response_length` | 응답 글자수 | numeric | `LENGTH(COALESCE(llm_response, ''))` | 너무 짧은/긴 응답 탐지 |
| `input_length` | 입력 글자수 | numeric | `LENGTH(COALESCE(user_input, ''))` | 비정상 짧은 질문 탐지 |
| `severity` | 심각도 | text | `COALESCE(severity, 'INFO')` | ERROR/WARN 레벨 필터링 |
| `tenant_id` | 테넌트 ID | text | `COALESCE(tenant_id, '')` | 특정 테넌트 대상 룰 |
| `empty_response` | 빈 응답 여부 | boolean | `(COALESCE(llm_response, '') = '' OR COALESCE(llm_response, '') = 'null')` | 빈 응답 탐지 |

### Priority 2 - 메타데이터 활용

| field | label | dataType | sqlExpression | 용도 |
|-------|-------|----------|---------------|------|
| `endpoint` | 엔드포인트 | text | `COALESCE(request_metadata.endpoint, '')` | 특정 API 엔드포인트 필터 |
| `service` | 서비스명 | text | `COALESCE(request_metadata.service, '')` | 서비스별 필터링 |
| `hour_of_day` | 시간대 (0-23) | numeric | `EXTRACT(HOUR FROM timestamp)` | 특정 시간대 품질 분석 |

### Priority 3 - 고급 분석 (향후 확장)

| field | label | dataType | sqlExpression | 용도 |
|-------|-------|----------|---------------|------|
| `token_efficiency` | 토큰 효율성 | numeric | `SAFE_DIVIDE(LENGTH(COALESCE(llm_response, '')), NULLIF(COALESCE(SAFE_CAST(output_tokens AS FLOAT64), 0), 0))` | 토큰 대비 콘텐츠 비율 |

**총: 기존 7개 + 신규 P1(5개) + P2(3개) + P3(1개) = 16개 필드**

---

## 2. 새로운 연산자 목록

### 추가 연산자

| operator | label | sqlTemplate | applicableTo | valueType | 용도 |
|----------|-------|-------------|-------------|-----------|------|
| `is_empty` | 비어있음 | `({field} IS NULL OR {field} = '')` | text | none | 빈 값 탐지 |
| `is_not_empty` | 비어있지 않음 | `({field} IS NOT NULL AND {field} != '')` | text | none | 값 존재 확인 |
| `starts_with` | 시작 문자 | `LOWER({field}) LIKE LOWER('{value}%')` | text | string | 접두사 매칭 |
| `ends_with` | 끝 문자 | `LOWER({field}) LIKE LOWER('%{value}')` | text | string | 접미사 매칭 |
| `between` | 범위 | `{field} BETWEEN {value_min} AND {value_max}` | numeric | number_range | 범위 필터 (예: 100~500 토큰) |
| `not_between` | 범위 외 | `{field} NOT BETWEEN {value_min} AND {value_max}` | numeric | number_range | 범위 외 필터 |

**총: 기존 9개 + 신규 6개 = 15개 연산자**

### 새 valueType 추가

```typescript
export type RuleValueType = 'number' | 'string' | 'string_array' | 'boolean' | 'none' | 'number_range';
```

- `none`: is_empty, is_not_empty 등 값 불필요 연산자
- `number_range`: between, not_between 등 { min, max } 쌍 필요 연산자

---

## 3. 복합 조건 Config 스키마

### 새로운 Config 구조

```typescript
// === 단일 조건 (기존과 동일) ===
interface SingleCondition {
  field: string;
  operator: string;
  value: number | string | boolean | string[] | null | { min: number; max: number };
}

// === 조건 그룹 (AND로 결합되는 조건들) ===
interface ConditionGroup {
  logic: 'AND';         // 그룹 내부는 항상 AND
  conditions: SingleCondition[];
}

// === 복합 조건 Config (v2) ===
interface CompoundRuleConfig {
  version: 2;
  logic: 'OR';          // 그룹 간은 항상 OR
  groups: ConditionGroup[];
}

// === 하위 호환 - 기존 단일 조건 Config (v1) ===
interface SimpleRuleConfig {
  version?: 1;           // 기존 룰은 version 필드 없음
  field: string;
  operator: string;
  value: number | string | boolean | string[];
}

// === 통합 Config 타입 ===
type ProblematicChatRuleConfig = SimpleRuleConfig | CompoundRuleConfig;
```

### 설계 근거: 2-level 구조 (Groups OR'd, Conditions AND'd)

**패턴: `(A AND B) OR (C AND D) OR (E)`**

이 구조를 선택한 이유:
1. **SQL 매핑이 자연스러움**: `WHERE (cond1 AND cond2) OR (cond3 AND cond4)` 직접 생성
2. **UI 구현이 직관적**: 그룹 카드 내에 조건 행 추가 / 그룹 카드 간 OR 구분
3. **대부분의 실용 시나리오 커버**: "짧은 응답이면서 실패" OR "특정 키워드 포함" 등
4. **복잡성 제한**: 3단계 중첩(AND-OR-AND) 방지로 SQL 오류 및 성능 문제 예방

### 기존 Config 자동 감지 규칙

```typescript
function isCompoundConfig(config: unknown): config is CompoundRuleConfig {
  return typeof config === 'object' && config !== null && 'version' in config && (config as any).version === 2;
}
```

기존 `{ field, operator, value }` 형태는 자동으로 `{ version: 2, logic: 'OR', groups: [{ logic: 'AND', conditions: [{ field, operator, value }] }] }` 로 변환.

---

## 4. SQL 생성 엔진 변경 계획

### 현재 구조
```
buildWhereConditions(rules) → string[]     // 룰별 조건들 (OR로 결합)
  └─ buildSingleCondition(config) → string  // 단일 조건 SQL
```

### 변경 후 구조
```
buildWhereConditions(rules) → string[]     // 룰별 조건들 (OR로 결합)
  └─ buildRuleCondition(config) → string   // 분기: v1이면 단일, v2이면 복합
       ├─ buildSingleCondition(condition)   // 단일 조건 SQL (재사용)
       └─ buildCompoundCondition(config)    // 복합 조건 SQL
            └─ groups.map(group =>
                 group.conditions.map(c => buildSingleCondition(c)).join(' AND ')
               ).join(' OR ')
```

### 클라이언트 사이드 매칭 변경

```
doesChatMatchRule(chat, config)
  ├─ v1: 기존 단일 조건 매칭 (그대로)
  └─ v2: doesChatMatchCompound(chat, compoundConfig)
           └─ groups.some(group =>                    // OR: 하나라도 매치
                group.conditions.every(condition =>    // AND: 모두 매치
                  doesSingleConditionMatch(chat, condition)
                )
              )
```

### 새 연산자 SQL 처리

#### `is_empty` / `is_not_empty`
- 값이 불필요하므로 `buildSingleCondition`에서 value 참조 스킵
- sqlTemplate에 `{value}` 없음

#### `between` / `not_between`
- value 타입: `{ min: number; max: number }`
- sqlTemplate: `{field} BETWEEN {value_min} AND {value_max}`
- `buildSingleCondition`에서 value가 객체인 경우 min/max 분리 바인딩

#### `starts_with` / `ends_with`
- 기존 contains와 유사하게 `escapeForLike()` 적용
- LIKE 패턴만 다름: `'{value}%'` / `'%{value}'`

---

## 5. 프론트엔드 UI 변경 계획

### 현재 UI (단일 조건)
```
[필드 드롭다운] [연산자 드롭다운] [값 입력]
```

### 변경 후 UI (복합 조건 빌더)

```
┌─────────────────────────────────────────────────┐
│  규칙 이름: [________________]                   │
│  설명:     [________________]                   │
│                                                  │
│  ┌─ 그룹 1 ─────────────────── [x 그룹 삭제] ─┐ │
│  │  [필드 v] [연산자 v] [값 입력]  [x]         │ │
│  │  AND                                         │ │
│  │  [필드 v] [연산자 v] [값 입력]  [x]         │ │
│  │                [+ 조건 추가]                  │ │
│  └──────────────────────────────────────────────┘ │
│                     OR                            │
│  ┌─ 그룹 2 ─────────────────── [x 그룹 삭제] ─┐ │
│  │  [필드 v] [연산자 v] [값 입력]  [x]         │ │
│  │                [+ 조건 추가]                  │ │
│  └──────────────────────────────────────────────┘ │
│                                                   │
│              [+ OR 그룹 추가]                     │
│                                                   │
│  ┌─ 미리보기 ──────────────────────────────────┐ │
│  │  (output_tokens < 100 AND success = false)   │ │
│  │  OR                                          │ │
│  │  (llm_response CONTAINS '죄송')              │ │
│  └──────────────────────────────────────────────┘ │
│                                                   │
│                        [취소] [저장]              │
└───────────────────────────────────────────────────┘
```

### UI 컴포넌트 구조

```
ProblematicRulesPage (page.tsx)
  └─ RuleFormModal (새 컴포넌트 또는 모달 내 인라인)
       ├─ ConditionGroupCard (반복)
       │    ├─ ConditionRow (반복)
       │    │    ├─ FieldSelect
       │    │    ├─ OperatorSelect (필드 dataType에 따라 필터)
       │    │    ├─ ValueInput (operatorの valueType에 따라 동적)
       │    │    └─ RemoveConditionButton
       │    ├─ "AND" 구분선
       │    └─ AddConditionButton
       ├─ "OR" 구분선
       ├─ AddGroupButton
       └─ RulePreview (SQL 조건 미리보기)
```

### 테이블/다이얼로그 표시 변경

**테이블 (ProblematicChatTable.tsx)**:
- 매칭 규칙 뱃지: 기존과 동일 (복합 규칙이어도 룰 이름으로 표시)
- 뱃지 색상: 복합 규칙은 보라색(purple) 뱃지로 구분

**관리 테이블 (page.tsx)**:
- "조건" 컬럼: 복합 규칙은 `(2 groups, 5 conditions)` 형태로 요약
- 클릭 시 전체 조건 펼침 또는 편집 모달

**상세 다이얼로그 (ProblematicChatDialog.tsx)**:
- 매칭된 규칙 섹션에서 복합 조건 구조를 시각적으로 표시
- 각 그룹과 조건을 인덴트로 구분

---

## 6. 마이그레이션 전략

### 자동 마이그레이션 (코드 레벨)

`parseRule()` 메서드에서 config를 파싱할 때 version 필드 확인:

```typescript
private normalizeConfig(rawConfig: unknown): CompoundRuleConfig {
  // 이미 v2 형태인 경우
  if (isCompoundConfig(rawConfig)) {
    return rawConfig;
  }

  // v1 (단일 조건) -> v2 변환
  const simpleConfig = rawConfig as SimpleRuleConfig;
  return {
    version: 2,
    logic: 'OR',
    groups: [{
      logic: 'AND',
      conditions: [{
        field: simpleConfig.field,
        operator: simpleConfig.operator,
        value: simpleConfig.value,
      }]
    }]
  };
}
```

### DB 데이터 마이그레이션

- 방식 A (권장): **Lazy Migration** - 읽을 때 자동 변환, 저장할 때 v2로 저장
  - `parseRule()`에서 v1 감지 시 v2로 변환하여 반환
  - `createRule()`/`updateRule()`은 항상 v2로 저장
  - 별도 마이그레이션 스크립트 불필요

- 방식 B: Batch Migration 스크립트 실행
  - 모든 기존 룰의 config를 v2로 일괄 변환
  - 운영 중단 없이 실행 가능 (config JSON 업데이트만)

**권장: 방식 A (Lazy Migration)**
- 리스크 최소화: DB 직접 조작 없음
- 점진적 전환: 사용자가 룰을 수정할 때마다 v2로 업그레이드
- 롤백 용이: v1 코드에서도 기존 config 그대로 읽을 수 있음

### DB 스키마 변경

- `type` 컬럼: 이미 `config.field`에서 도출 가능하므로 변경 불필요
- `config` 컬럼: JSON string이므로 스키마 변경 없이 v2 구조 저장 가능
- **Prisma 마이그레이션 불필요**

---

## 7. 단계별 구현 순서

### Phase 2-A: 새 필드/연산자 추가 (단순 확장, 기존 구조 유지)

**예상 작업량: 중간 / 리스크: 낮음**

#### TODO 2-A-1: shared-types에 새 필드 정의 추가
- **파일**: `packages/shared-types/src/index.ts`
- **작업**: RULE_FIELDS 배열에 Priority 1, 2 필드 8개 추가
- **변경 사항**:
  - `response_length`, `input_length`, `severity`, `tenant_id`, `empty_response` (P1)
  - `endpoint`, `service`, `hour_of_day` (P2)
- **수용 기준**:
  - RULE_FIELDS.length === 16 (기존 7 + 신규 9)
  - 각 필드에 올바른 sqlExpression, dataType 설정

#### TODO 2-A-2: shared-types에 새 연산자 정의 추가
- **파일**: `packages/shared-types/src/index.ts`
- **작업**: RULE_OPERATORS 배열에 6개 연산자 추가, RuleValueType 확장
- **변경 사항**:
  - `is_empty`, `is_not_empty` (text, valueType: 'none')
  - `starts_with`, `ends_with` (text, valueType: 'string')
  - `between`, `not_between` (numeric, valueType: 'number_range')
  - `RuleValueType`에 `'none'` | `'number_range'` 추가
  - `ProblematicChatRuleConfig.value` 타입에 `null` | `{ min: number; max: number }` 추가
- **수용 기준**:
  - RULE_OPERATORS.length === 15
  - getOperatorsForField('response_length')가 between 포함

#### TODO 2-A-3: 백엔드 SQL 생성 - 새 연산자 처리
- **파일**: `apps/backend/src/problematic-chat/problematic-chat.service.ts`
- **작업**: `buildSingleCondition()`에 새 연산자 케이스 추가
- **변경 사항**:
  - `is_empty`/`is_not_empty`: value 없이 SQL 생성
  - `between`/`not_between`: value에서 min/max 추출하여 SQL 생성
  - `starts_with`/`ends_with`: escapeForLike 적용 후 LIKE 패턴 생성
- **수용 기준**: 각 새 연산자에 대해 올바른 SQL WHERE 절 생성

#### TODO 2-A-4: 백엔드 클라이언트 사이드 매칭 - 새 필드/연산자
- **파일**: `apps/backend/src/problematic-chat/problematic-chat.service.ts`
- **작업**: `getChatFieldValue()`, `doesChatMatchRule()`에 새 필드/연산자 매칭 추가
- **변경 사항**:
  - `getChatFieldValue()`: response_length, input_length 등 계산 필드 매핑
  - `doesChatMatchRule()`: is_empty, between 등 새 연산자 매칭 로직
- **수용 기준**: 클라이언트 사이드에서도 새 필드/연산자 매칭 정상 동작

#### TODO 2-A-5: 프론트엔드 - 새 연산자용 값 입력 컴포넌트
- **파일**: `apps/frontend-next/src/app/dashboard/admin/problematic-rules/page.tsx`
- **작업**:
  - `none` valueType: 값 입력 필드 숨김
  - `number_range` valueType: min/max 두 개 입력 필드 렌더링
- **수용 기준**:
  - is_empty 선택 시 값 입력 UI가 사라짐
  - between 선택 시 "최소값 ~ 최대값" 입력 UI 표시

#### TODO 2-A-6: shared-types 빌드 및 전체 호환성 확인
- **작업**: `cd packages/shared-types && pnpm build` 후 backend/frontend 빌드
- **수용 기준**: 전체 빌드 성공, 기존 룰 CRUD 정상 동작

---

### Phase 2-B: 복합 조건 스키마 (핵심 변경)

**예상 작업량: 큼 / 리스크: 중간**

#### TODO 2-B-1: shared-types에 복합 조건 타입 정의
- **파일**: `packages/shared-types/src/index.ts`
- **작업**:
  - `SingleCondition`, `ConditionGroup`, `CompoundRuleConfig` 인터페이스 추가
  - `ProblematicChatRuleConfig`를 `SimpleRuleConfig | CompoundRuleConfig` union으로 변경
  - `isCompoundConfig()` 타입 가드 함수 추가
  - `normalizeToCompound()` 헬퍼 함수 (v1 -> v2 변환)
- **수용 기준**:
  - 기존 SimpleRuleConfig 코드와 타입 호환
  - CompoundRuleConfig 타입 체크 통과

#### TODO 2-B-2: 백엔드 인터페이스/DTO 업데이트
- **파일**:
  - `apps/backend/src/problematic-chat/interfaces/problematic-chat.interface.ts`
  - `apps/backend/src/problematic-chat/dto/create-rule.dto.ts`
  - `apps/backend/src/problematic-chat/dto/update-rule.dto.ts`
- **작업**:
  - `ProblematicChatRuleConfig` -> shared-types에서 import (중복 제거)
  - DTO의 config 필드가 SimpleRuleConfig | CompoundRuleConfig 모두 수용
  - 벨리데이션: groups 배열 최소 1개, conditions 배열 최소 1개
- **수용 기준**: 단일 조건 및 복합 조건 모두 DTO 벨리데이션 통과

#### TODO 2-B-3: 백엔드 서비스 - 복합 SQL 생성
- **파일**: `apps/backend/src/problematic-chat/problematic-chat.service.ts`
- **작업**:
  - `normalizeConfig()`: v1 -> v2 Lazy Migration
  - `buildRuleCondition()`: config 버전에 따라 분기
  - `buildCompoundCondition()`: groups를 OR로, conditions를 AND로 결합
  - `validateRuleConfig()`: 복합 조건 벨리데이션 (각 조건의 field/operator 유효성)
  - `doesChatMatchRule()`: 복합 조건 클라이언트 사이드 매칭
- **수용 기준**:
  - v1 config 입력 시 v2로 변환 후 정상 SQL 생성
  - `(A AND B) OR (C)` 구조의 SQL 정상 생성
  - 클라이언트 매칭도 동일 로직 적용

#### TODO 2-B-4: 백엔드 - 기존 단일 조건 호환성 보장
- **파일**: `apps/backend/src/problematic-chat/problematic-chat.service.ts`
- **작업**:
  - `parseRule()`: 기존 config 파싱 시 normalizeConfig() 적용
  - `createRule()`: 단일 조건 입력도 v2로 저장
  - 캐시 키 로직 검토 (config 구조 변경에 따른 키 충돌 방지)
- **수용 기준**: 기존 DB에 저장된 v1 config 룰이 정상 로드/실행

---

### Phase 2-C: 프론트엔드 복합 조건 빌더 UI

**예상 작업량: 큼 / 리스크: 중간**

#### TODO 2-C-1: 복합 조건 폼 상태 관리
- **파일**: `apps/frontend-next/src/app/dashboard/admin/problematic-rules/page.tsx`
- **작업**:
  - `RuleFormData` 타입을 복합 조건 구조로 변경
  - 그룹/조건 추가, 삭제, 수정 핸들러 구현
  - 편집 모드: 기존 v1 config를 v2로 변환하여 폼에 로드
- **수용 기준**: 그룹 추가/삭제, 조건 추가/삭제가 상태에 반영

#### TODO 2-C-2: ConditionGroupCard 컴포넌트
- **파일**: `apps/frontend-next/src/app/dashboard/admin/problematic-rules/page.tsx` (또는 별도 컴포넌트)
- **작업**:
  - 그룹 카드 UI (테두리, AND 구분선)
  - 조건 행: 필드 선택 -> 연산자 필터 -> 값 입력 (동적)
  - 조건/그룹 삭제 버튼 (최소 1그룹 1조건 유지)
  - 그룹 간 "OR" 구분선
- **수용 기준**:
  - 그룹 추가 시 OR 구분선과 함께 새 카드 생성
  - 조건 추가 시 AND 구분선과 함께 새 행 생성
  - 마지막 그룹/조건 삭제 시 방지 로직

#### TODO 2-C-3: RulePreview 컴포넌트
- **파일**: `apps/frontend-next/src/app/dashboard/admin/problematic-rules/page.tsx`
- **작업**:
  - 현재 폼 상태를 사람이 읽을 수 있는 조건 미리보기로 렌더링
  - 형태: `(Output 토큰 < 100 AND 성공 여부 = false) OR (LLM 응답 CONTAINS '죄송')`
  - 색상 코딩: 필드=파랑, 연산자=황색, 값=녹색
- **수용 기준**: 모든 연산자/필드 조합에서 올바른 미리보기 표시

#### TODO 2-C-4: 관리 테이블 - 복합 조건 요약 표시
- **파일**: `apps/frontend-next/src/app/dashboard/admin/problematic-rules/page.tsx`
- **작업**:
  - 테이블 "조건" 컬럼에서 복합 규칙 요약 표시
  - 단일 그룹 단일 조건: 기존과 동일 표시
  - 복합: `"2 그룹, 5 조건"` 또는 축약된 조건식
  - 뱃지 색상: 복합 규칙은 보라색 아웃라인 추가
- **수용 기준**: 단일/복합 규칙 모두 테이블에서 구분 가능

#### TODO 2-C-5: 상세 다이얼로그 - 복합 조건 표시
- **파일**: `apps/frontend-next/src/components/charts/ProblematicChatDialog.tsx`
- **작업**:
  - "매칭된 규칙" 섹션에서 복합 규칙의 조건 구조 시각적 표시
  - 그룹별 인덴트, AND/OR 키워드 표시
- **수용 기준**: 복합 규칙의 전체 조건 구조가 한눈에 파악 가능

#### TODO 2-C-6: ProblematicChatTable 호환성
- **파일**: `apps/frontend-next/src/components/charts/ProblematicChatTable.tsx`
- **작업**:
  - 매칭 규칙 뱃지 색상 로직 업데이트 (복합 규칙 대응)
  - 복합 규칙의 첫 번째 그룹 첫 번째 조건의 필드 기준으로 색상 결정
- **수용 기준**: 복합 규칙도 뱃지 정상 표시

---

### Phase 2-D: 통합 테스트 및 마무리

#### TODO 2-D-1: shared-types 빌드 및 의존성 확인
- **작업**: `pnpm build` 전체 빌드 성공 확인
- **수용 기준**: 빌드 에러 0개

#### TODO 2-D-2: 기존 룰 호환성 테스트
- **작업**:
  - 기존 v1 형태 룰이 정상 로드되는지 확인
  - 기존 룰 수정 시 v2로 업그레이드되는지 확인
  - 기존 룰 삭제 정상 동작
- **수용 기준**: 기존 데이터 무결성 유지

#### TODO 2-D-3: 복합 룰 E2E 테스트
- **작업**:
  - 복합 룰 생성: (output_tokens < 100 AND success = false) OR (llm_response CONTAINS '죄송')
  - 생성된 룰로 문제 채팅 조회
  - 매칭 결과 검증
- **수용 기준**: 복합 조건이 BigQuery에서 정확한 결과 반환

#### TODO 2-D-4: AGENTS.md 업데이트
- **작업**: `/deepinit --update`

---

## 8. 커밋 전략

| 커밋 | 범위 | 설명 |
|------|------|------|
| 1 | Phase 2-A | feat: 새 필드 9개, 연산자 6개 추가 (단일 조건 호환) |
| 2 | Phase 2-B | feat: 복합 조건(AND/OR) config 스키마 및 백엔드 엔진 |
| 3 | Phase 2-C | feat: 복합 조건 빌더 UI 및 표시 컴포넌트 |
| 4 | Phase 2-D | chore: 통합 테스트 및 AGENTS.md 업데이트 |

---

## 9. 성공 기준

| # | 기준 | 검증 방법 |
|---|------|-----------|
| 1 | 기존 단일 조건 룰 하위 호환 | DB의 v1 config가 정상 로드/실행 |
| 2 | 복합 조건 (A AND B) OR (C) SQL 생성 | 로그에서 생성된 SQL 확인 |
| 3 | 16개 필드 모두 사용 가능 | Admin UI에서 필드 선택 드롭다운 확인 |
| 4 | 15개 연산자 적절한 필터링 | 필드 타입별 연산자 옵션 확인 |
| 5 | 복합 조건 빌더 UI 직관적 | 그룹 추가/삭제, 조건 추가/삭제 동작 |
| 6 | 미리보기에서 조건식 표시 | 모달 하단 미리보기 확인 |
| 7 | 전체 빌드 성공 | `pnpm build` 에러 0개 |
| 8 | BigQuery 쿼리 정상 실행 | 복합 룰로 문제 채팅 조회 성공 |

---

## 10. 리스크 및 완화

| 리스크 | 영향 | 완화 |
|--------|------|------|
| 복합 SQL 오류 (괄호 누락 등) | 쿼리 실패 | `buildCompoundCondition()` 단위 테스트, 미리보기에서 SQL 구조 확인 |
| 기존 v1 config 파싱 실패 | 기존 룰 사용 불가 | Lazy Migration에서 fallback: 파싱 실패 시 기본값 반환 |
| BigQuery 비용 증가 (복합 조건) | 비용 | 그룹 수 최대 5개, 조건 수 최대 10개 제한 |
| 프론트엔드 UI 복잡성 | UX 저하 | 단일 조건 모드 유지 (그룹 1개, 조건 1개면 기존 UI처럼 보임) |
| shared-types 변경 후 타입 충돌 | 빌드 실패 | union 타입으로 하위 호환, 기존 코드 점진적 마이그레이션 |
| number_range 값 검증 누락 | min > max | DTO/프론트에서 min <= max 검증 |
