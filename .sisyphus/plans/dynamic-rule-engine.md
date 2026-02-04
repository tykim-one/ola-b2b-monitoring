# 계획: Problematic Rules 동적 필드/연산자 기반 규칙 시스템

## 요구사항 요약

기존 하드코딩된 3가지 규칙 타입(token_threshold, keyword_match, token_ratio)을 제거하고,
관리자가 **BigQuery 컬럼 + 연산자 + 값**을 자유롭게 조합하여 규칙을 정의할 수 있는 동적 시스템으로 마이그레이션.

### 수용 기준
- 관리자가 드롭다운에서 BigQuery 필드(화이트리스트)를 선택
- 선택한 필드의 데이터 타입에 맞는 연산자가 자동으로 제공
- 한 규칙 = 하나의 "필드 + 연산자 + 값" 조건 (단일 조건)
- 기존 규칙은 새 시스템으로 자동 마이그레이션
- 백엔드 SQL 생성이 필드 정의 기반으로 동적으로 작동
- 프론트엔드 테이블/칩에서 규칙 요약이 자연스럽게 표시

## 아키텍처 설계

### 필드 정의 레지스트리 (핵심)

코드 내 상수로 "사용 가능한 필드" 메타데이터를 정의:

```typescript
// 필드 데이터 타입
type FieldDataType = 'numeric' | 'text' | 'boolean';

// 필드 정의
interface RuleFieldDefinition {
  field: string;           // BigQuery 컬럼명 또는 표현식
  label: string;           // UI 표시명
  dataType: FieldDataType; // 데이터 타입
  sqlExpression: string;   // BigQuery SQL 표현식
  description?: string;    // 설명
}

// 연산자 정의
interface RuleOperatorDefinition {
  operator: string;        // 'lt' | 'gt' | 'eq' | 'contains' | 'not_contains' | ...
  label: string;           // UI 표시명 (예: '미만', '포함')
  sqlTemplate: string;     // SQL 템플릿 (예: '{field} < {value}')
  applicableTo: FieldDataType[];  // 적용 가능한 데이터 타입
  valueType: 'number' | 'string' | 'string_array' | 'boolean';
}
```

### 화이트리스트 필드 목록

| field | label | dataType | sqlExpression |
|-------|-------|----------|---------------|
| `output_tokens` | Output 토큰 | numeric | `COALESCE(SAFE_CAST(output_tokens AS FLOAT64), 0)` |
| `input_tokens` | Input 토큰 | numeric | `COALESCE(SAFE_CAST(input_tokens AS FLOAT64), 0)` |
| `total_tokens` | Total 토큰 | numeric | `COALESCE(SAFE_CAST(total_tokens AS FLOAT64), 0)` |
| `token_ratio` | 토큰 비율 (output/input) | numeric | `SAFE_DIVIDE(COALESCE(SAFE_CAST(output_tokens AS FLOAT64), 0), NULLIF(COALESCE(SAFE_CAST(input_tokens AS FLOAT64), 0), 0))` |
| `llm_response` | LLM 응답 | text | `COALESCE(llm_response, '')` |
| `user_input` | 사용자 입력 | text | `COALESCE(user_input, '')` |
| `success` | 성공 여부 | boolean | `success` |

### 연산자 목록

| operator | label | sqlTemplate | 적용 대상 | valueType |
|----------|-------|-------------|----------|-----------|
| `lt` | 미만 (<) | `{field} < {value}` | numeric | number |
| `lte` | 이하 (≤) | `{field} <= {value}` | numeric | number |
| `gt` | 초과 (>) | `{field} > {value}` | numeric | number |
| `gte` | 이상 (≥) | `{field} >= {value}` | numeric | number |
| `eq` | 같음 (=) | `{field} = {value}` | numeric, boolean | number/boolean |
| `neq` | 다름 (≠) | `{field} != {value}` | numeric, boolean | number/boolean |
| `contains` | 포함 | `LOWER({field}) LIKE LOWER('%{value}%')` | text | string |
| `not_contains` | 미포함 | `LOWER({field}) NOT LIKE LOWER('%{value}%')` | text | string |
| `contains_any` | 하나라도 포함 | `(LOWER({field}) LIKE ... OR ...)` | text | string_array |

### 새로운 타입 구조

```typescript
// === shared-types ===

// 기존 하드코딩 타입 제거, 단일 통합 config로 변경
interface ProblematicChatRuleConfig {
  field: string;           // 필드 key (예: 'output_tokens')
  operator: string;        // 연산자 key (예: 'lt')
  value: string | number | boolean | string[];  // 비교 값
}

interface ProblematicChatRule {
  id: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  config: ProblematicChatRuleConfig;  // type 필드 제거, config로 통합
  createdAt: string;
  updatedAt: string;
}
```

## 구현 계획

### Step 1: shared-types 타입 변경
**파일**: `packages/shared-types/src/index.ts`

- `ProblematicChatRuleType`, `TokenOperator`, `KeywordMatchField` 타입 제거
- `ProblematicChatRuleConfig`를 `{ field, operator, value }` 구조로 변경
- `ProblematicChatRule`에서 `type` 필드 제거
- `CreateProblematicChatRuleRequest`, `UpdateProblematicChatRuleRequest` 변경
- 필드/연산자 정의 상수 추가 (프론트/백 공유)

### Step 2: 필드/연산자 레지스트리 상수 정의
**파일**: `packages/shared-types/src/index.ts` (또는 별도 파일)

- `RULE_FIELDS: RuleFieldDefinition[]` 상수 정의
- `RULE_OPERATORS: RuleOperatorDefinition[]` 상수 정의
- 헬퍼 함수: `getOperatorsForField(fieldKey)` → 해당 필드에 사용 가능한 연산자 목록

### Step 3: 백엔드 인터페이스/DTO 변경
**파일들**:
- `apps/backend/src/problematic-chat/interfaces/problematic-chat.interface.ts`
- `apps/backend/src/problematic-chat/dto/create-rule.dto.ts`

- 인터페이스를 새 config 구조에 맞게 변경
- DTO 벨리데이션을 field/operator/value 기반으로 변경
- field가 화이트리스트에 있는지, operator가 해당 field에 유효한지 검증

### Step 4: 백엔드 서비스 - 동적 SQL 생성
**파일**: `apps/backend/src/problematic-chat/problematic-chat.service.ts`

- `buildWhereConditions()`: if/else 분기 제거 → 필드 레지스트리 기반 동적 생성
  - `RULE_FIELDS`에서 field 정의 조회 → `sqlExpression` 획득
  - `RULE_OPERATORS`에서 operator 정의 조회 → `sqlTemplate` 획득
  - 템플릿에 값 바인딩하여 WHERE 절 생성
- `getMatchedRuleNames()`: 동일하게 동적 매칭으로 변경
- `parseRule()`: type 파싱 제거, config만 파싱

### Step 5: Prisma 스키마 마이그레이션
**파일**: `apps/backend/prisma/schema.prisma`

- `ProblematicChatRule` 모델에서 `type` 컬럼 제거
- config JSON에 모든 규칙 정보가 들어가므로 type은 불필요
- (또는 type을 남기되 optional로 변경하여 하위호환성 유지)

### Step 6: 프론트엔드 Admin 페이지 - 동적 폼
**파일**: `apps/frontend-next/src/app/dashboard/admin/problematic-rules/page.tsx`

- 라디오 버튼 3개 → **필드 드롭다운** + **연산자 드롭다운** + **값 입력** 으로 교체
- 필드 선택 시 → 해당 필드의 dataType에 맞는 연산자만 필터링
- 연산자 선택 시 → valueType에 맞는 입력 컴포넌트 렌더링
  - `number` → number input
  - `string` → text input
  - `string_array` → 쉼표 구분 textarea (기존 키워드 입력과 동일)
  - `boolean` → select (true/false)
- 테이블의 타입/설정 표시 로직을 동적 필드/연산자 기반으로 변경

### Step 7: 프론트엔드 User Analytics 토글 칩 호환
**파일**: `apps/frontend-next/src/app/dashboard/user-analytics/page.tsx`

- 칩 색상: field의 dataType 기반으로 결정 (numeric=amber, text=rose, boolean=cyan)
- 칩 요약 텍스트: `{field.label} {operator.label} {value}` 형태로 동적 생성

### Step 8: 기존 데이터 마이그레이션
**파일**: `apps/backend/prisma/seed.ts` 또는 별도 마이그레이션 스크립트

기존 규칙의 config를 새 형태로 변환:
- `{type:'token_threshold', config:{threshold:1500, operator:'lt'}}` → `{config:{field:'output_tokens', operator:'lt', value:1500}}`
- `{type:'keyword_match', config:{keywords:['X','Y'], matchField:'llm_response'}}` → `{config:{field:'llm_response', operator:'contains_any', value:['X','Y']}}`
- `{type:'token_ratio', config:{minRatio:0.3, maxRatio:5.0}}` → 2개 규칙으로 분리: `{field:'token_ratio', operator:'lt', value:0.3}` + `{field:'token_ratio', operator:'gt', value:5.0}`

## 수정 대상 파일

| 파일 | 변경 내용 | 우선순위 |
|------|-----------|---------|
| `packages/shared-types/src/index.ts` | 타입 + 필드/연산자 레지스트리 | 1 |
| `apps/backend/src/problematic-chat/interfaces/problematic-chat.interface.ts` | 인터페이스 변경 | 2 |
| `apps/backend/src/problematic-chat/dto/create-rule.dto.ts` | DTO 벨리데이션 변경 | 2 |
| `apps/backend/src/problematic-chat/problematic-chat.service.ts` | 동적 SQL 생성 엔진 | 3 |
| `apps/backend/prisma/schema.prisma` | type 컬럼 처리 | 4 |
| `apps/frontend-next/src/app/dashboard/admin/problematic-rules/page.tsx` | 동적 폼 UI | 5 |
| `apps/frontend-next/src/app/dashboard/user-analytics/page.tsx` | 칩 표시 호환 | 6 |
| `apps/frontend-next/src/components/charts/ProblematicChatTable.tsx` | 뱃지 색상 | 6 |
| `apps/frontend-next/src/components/charts/ProblematicChatDialog.tsx` | 상세 표시 | 6 |

## 리스크 및 완화

| 리스크 | 완화 |
|--------|------|
| SQL 인젝션 위험 (동적 SQL) | field/operator는 반드시 화이트리스트 매칭, 값은 escapeForLike() + 타입 검증 |
| 기존 규칙 데이터 손실 | 마이그레이션 스크립트로 기존 config를 새 형태로 변환, rollback 가능하도록 |
| shared-types 빌드 후 의존 패키지 재빌드 필요 | 전체 빌드 순서: shared-types → backend → frontend |
| Prisma 스키마 변경 시 DB 마이그레이션 | `type` 컬럼을 optional로 변경하여 점진적 마이그레이션 |

## 검증 계획

1. 기존 규칙이 새 형태로 올바르게 마이그레이션되는지 확인
2. Admin 페이지에서 각 필드 타입별 규칙 생성/수정/삭제 테스트
3. 필드 선택 시 적절한 연산자만 표시되는지 확인
4. 생성된 규칙이 BigQuery에서 올바른 결과를 반환하는지 확인
5. User Analytics 토글 칩이 정상 동작하는지 확인
6. 숫자/텍스트/불리언 각 타입에 대한 SQL 생성 검증
