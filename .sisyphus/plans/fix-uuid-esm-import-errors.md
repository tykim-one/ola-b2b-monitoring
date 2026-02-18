# uuid ESM Import 에러 제거 — crypto.randomUUID() 마이그레이션

## TL;DR

> **Quick Summary**: `uuid` v13 (pure ESM)이 NestJS CJS 빌드와 충돌하여 TS1479 에러가 발생. Node.js 내장 `crypto.randomUUID()`로 대체하여 외부 의존성을 제거한다.
> 
> **Deliverables**:
> - `chatbot.service.ts`와 `faq-clustering.service.ts`에서 uuid import를 `crypto.randomUUID()`로 교체
> - `package.json`에서 `uuid` + `@types/uuid` 의존성 제거
> - lockfile 갱신 및 빌드 검증
> 
> **Estimated Effort**: Quick (30분 미만)
> **Parallel Execution**: NO — 단일 순차 작업
> **Critical Path**: Task 1 → Task 2 → Task 3

---

## Context

### Original Request
CORS 수정 후 `tsc --noEmit` 검증 과정에서 발견된 TS1479 에러 2건 수정 요청.

### Interview Summary
**Key Discussions**:
- 범위를 TS 에러 2건만 수정하는 것으로 확정 (환경 정리, 테스트 추가 제외)

**Research Findings**:
- `uuid` v13.0.0은 `"type": "module"` (pure ESM)
- 백엔드 tsconfig: `"module": "nodenext"`, NestJS는 CJS로 컴파일 → ESM 패키지 `require()` 불가
- `crypto.randomUUID()`는 Node.js 19+에서 글로벌 사용 가능 (프로젝트는 Node 20+ 요구)
- uuid를 사용하는 파일은 정확히 2개, 호출 지점 5곳
- 프론트엔드/shared-types에서는 uuid 미사용

### Metis Review
**Identified Gaps** (addressed):
- `@types/uuid` devDependency도 함께 제거 필요 → 계획에 포함
- AGENTS.md에 uuid 의존성 언급 → 선택적 업데이트로 포함
- `crypto.randomUUID()`는 글로벌이므로 import 불필요 → 가드레일로 명시
- 인터페이스 `id` 필드는 `string` 타입 → 포맷 호환성 안전

---

## Work Objectives

### Core Objective
uuid 외부 패키지를 Node.js 내장 `crypto.randomUUID()`로 대체하여 ESM/CJS 호환성 문제를 해결한다.

### Concrete Deliverables
- `apps/backend/src/chatbot/chatbot.service.ts` — uuid import 제거, `uuidv4()` → `crypto.randomUUID()` (3곳)
- `apps/backend/src/faq-analysis/services/faq-clustering.service.ts` — uuid import 제거, `uuidv4()` → `crypto.randomUUID()` (2곳)
- `apps/backend/package.json` — `uuid`, `@types/uuid` 제거
- `pnpm-lock.yaml` — lockfile 갱신

### Definition of Done
- [x] `pnpm --filter backend build` → exit code 0
- [x] `from 'uuid'` import가 백엔드 소스에 0건
- [x] `crypto.randomUUID()` 호출이 5곳에 존재

### Must Have
- 5개 `uuidv4()` 호출 모두를 `crypto.randomUUID()`로 교체
- uuid + @types/uuid 양쪽 모두 package.json에서 제거
- lockfile 갱신 (pnpm install)

### Must NOT Have (Guardrails)
- ❌ `import crypto from 'node:crypto'` 또는 `import { randomUUID } from 'crypto'` 추가 금지 — 글로벌이므로 import 불필요
- ❌ ID 생성 유틸리티 함수/서비스를 별도로 만들지 않음 — 인라인 교체로 충분
- ❌ `ChatMessage`, `ChatSession`, `NormalizedGroup`, `MergedCluster` 등 인터페이스 수정 금지
- ❌ 다른 TypeScript 에러(TS18046 등) 수정 금지 — 범위 밖
- ❌ chatbot.service / faq-clustering.service에 대한 테스트 파일 생성 금지
- ❌ tsconfig.json 수정 금지

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.

### Test Decision
- **Infrastructure exists**: YES (jest)
- **Automated tests**: None (해당 서비스에 spec 파일 없음, 생성도 범위 밖)
- **Framework**: jest (기존이나, 이 작업에서 테스트 작성 안 함)

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

**Verification Tool by Deliverable Type:**

| Type | Tool | How Agent Verifies |
|------|------|-------------------|
| Code 변경 | Bash (ast-grep) | import 패턴 검색, 호출 횟수 카운트 |
| 빌드 검증 | Bash (pnpm build) | exit code 0, 에러 없음 |
| 의존성 제거 | Bash (node script) | package.json 파싱 |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Sequential — 단일 흐름):
├── Task 1: 소스 코드 수정 (2개 파일)
├── Task 2: 의존성 제거 + lockfile 갱신
└── Task 3: 빌드 검증 + QA

Critical Path: Task 1 → Task 2 → Task 3
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3 | None |
| 2 | 1 | 3 | None |
| 3 | 2 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2, 3 | task(category="quick", load_skills=[], run_in_background=false) |

---

## TODOs

- [x] 1. uuid import를 crypto.randomUUID()로 교체 (2개 파일, 5곳)

  **What to do**:
  - `apps/backend/src/chatbot/chatbot.service.ts`:
    - Line 10: `import { v4 as uuidv4 } from 'uuid';` → 이 줄 삭제
    - `uuidv4()` → `crypto.randomUUID()` 3곳 교체
  - `apps/backend/src/faq-analysis/services/faq-clustering.service.ts`:
    - Line 9: `import { v4 as uuidv4 } from 'uuid';` → 이 줄 삭제
    - `uuidv4()` → `crypto.randomUUID()` 2곳 교체

  **Must NOT do**:
  - `import crypto from 'node:crypto'` 추가 금지 — 글로벌이므로 불필요
  - 유틸리티 함수 추출 금지 — 인라인 교체로 충분
  - 인터페이스/타입 수정 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단순 기계적 문자열 교체 작업, 2개 파일 5곳
  - **Skills**: `[]`
    - 별도 스킬 불필요 — ast-grep replace로 처리 가능
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: 백엔드 전용 작업이므로 불필요

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 1 - Step 1)
  - **Blocks**: Task 2, Task 3
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `apps/backend/src/chatbot/chatbot.service.ts:10` — 현재 uuid import 줄 (삭제 대상)
  - `apps/backend/src/faq-analysis/services/faq-clustering.service.ts:9` — 현재 uuid import 줄 (삭제 대상)

  **API/Type References**:
  - `crypto.randomUUID()` — Node.js 내장 글로벌, RFC 4122 v4 UUID 반환, `string` 타입
  - 인터페이스의 `id` 필드: 모두 `string` 타입으로 포맷 호환성 안전

  **WHY Each Reference Matters**:
  - `chatbot.service.ts:10` — 삭제할 import 라인. 이 줄만 삭제하면 됨 (import 교체가 아니라 삭제)
  - `faq-clustering.service.ts:9` — 동일하게 삭제할 import 라인

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: uuid import가 완전히 제거됨
    Tool: Bash (ast-grep)
    Preconditions: Task 1 소스 수정 완료
    Steps:
      1. ast-grep --pattern "from 'uuid'" --lang typescript 로 apps/backend/src/ 검색
      2. Assert: 0 matches
    Expected Result: uuid import 0건
    Evidence: ast-grep 출력 캡처

  Scenario: crypto.randomUUID() 호출이 정확히 5곳
    Tool: Bash (ast-grep)
    Preconditions: Task 1 소스 수정 완료
    Steps:
      1. ast-grep --pattern "crypto.randomUUID()" --lang typescript 로 apps/backend/src/ 검색
      2. Assert: 5 matches (chatbot 3곳 + faq-clustering 2곳)
    Expected Result: crypto.randomUUID() 5건
    Evidence: ast-grep 출력 캡처

  Scenario: crypto import가 추가되지 않음
    Tool: Bash (grep)
    Preconditions: Task 1 소스 수정 완료
    Steps:
      1. grep -r "import.*crypto" apps/backend/src/chatbot/chatbot.service.ts apps/backend/src/faq-analysis/services/faq-clustering.service.ts
      2. Assert: 0 matches
    Expected Result: crypto import 0건
    Evidence: grep 출력 캡처
  ```

  **Commit**: YES
  - Message: `refactor(backend): replace uuid with crypto.randomUUID()`
  - Files: `apps/backend/src/chatbot/chatbot.service.ts`, `apps/backend/src/faq-analysis/services/faq-clustering.service.ts`

---

- [x] 2. uuid 패키지 의존성 제거 + lockfile 갱신

  **What to do**:
  - `apps/backend/package.json`:
    - dependencies에서 `"uuid": "^13.0.0"` 제거 (line 63)
    - devDependencies에서 `"@types/uuid": "^11.0.0"` 제거 (line 79)
  - 루트에서 `pnpm install` 실행하여 lockfile 갱신

  **Must NOT do**:
  - 다른 의존성 업데이트/변경 금지
  - 프론트엔드 package.json 수정 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: package.json 2줄 삭제 + pnpm install 실행
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 1 - Step 2)
  - **Blocks**: Task 3
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `apps/backend/package.json:63` — `"uuid": "^13.0.0"` (삭제 대상)
  - `apps/backend/package.json:79` — `"@types/uuid": "^11.0.0"` (삭제 대상)

  **WHY Each Reference Matters**:
  - line 63: dependencies에서 uuid 제거해야 빌드 시 uuid 패키지를 참조하지 않음
  - line 79: devDependencies에서 @types/uuid 제거해야 불필요한 타입 패키지 정리

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: uuid가 package.json에서 완전히 제거됨
    Tool: Bash (node script)
    Preconditions: Task 2 package.json 수정 완료
    Steps:
      1. node -e "const pkg = require('./apps/backend/package.json'); const has = pkg.dependencies?.uuid || pkg.devDependencies?.['@types/uuid']; if (has) { console.error('FAIL'); process.exit(1); } else { console.log('PASS'); }"
      2. Assert: PASS 출력, exit code 0
    Expected Result: uuid, @types/uuid 모두 package.json에 없음
    Evidence: 스크립트 출력 캡처

  Scenario: pnpm install 성공
    Tool: Bash
    Preconditions: package.json 수정 완료
    Steps:
      1. pnpm install (루트에서 실행)
      2. Assert: exit code 0
    Expected Result: lockfile 정상 갱신
    Evidence: pnpm install 출력 캡처
  ```

  **Commit**: YES (Task 1과 함께 하나의 커밋에 포함)
  - Message: `refactor(backend): replace uuid with crypto.randomUUID()`
  - Files: `apps/backend/package.json`, `pnpm-lock.yaml`

---

- [x] 3. 빌드 검증

  **What to do**:
  - `pnpm --filter backend build` 실행하여 NestJS 빌드 통과 확인
  - 선택사항: `apps/backend/src/chatbot/AGENTS.md`에서 uuid 의존성 언급 제거

  **Must NOT do**:
  - 빌드 실패가 아닌 경고(warning)를 이유로 추가 수정 금지
  - 다른 모듈/파일 수정 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 빌드 커맨드 실행 + 결과 확인
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 1 - Step 3, final)
  - **Blocks**: None
  - **Blocked By**: Task 1, Task 2

  **References**:

  **Pattern References**:
  - `apps/backend/src/chatbot/AGENTS.md` — "Dependencies" 섹션에 `uuid - For session and message ID generation` 언급 (선택적 업데이트)

  **WHY Each Reference Matters**:
  - AGENTS.md의 uuid 참조는 실제 코드와 불일치하게 됨 → 선택적 정리

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: NestJS 빌드 성공
    Tool: Bash
    Preconditions: Task 1, 2 완료
    Steps:
      1. pnpm --filter backend build
      2. Assert: exit code 0, "error" 문자열 없음
    Expected Result: 빌드 성공
    Evidence: 빌드 출력 캡처

  Scenario: crypto.randomUUID() 런타임 동작 확인
    Tool: Bash
    Preconditions: Node.js 20+ 환경
    Steps:
      1. node -e "console.log(crypto.randomUUID())"
      2. Assert: UUID v4 형식 출력 (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
    Expected Result: 유효한 UUID 출력
    Evidence: 출력 캡처
  ```

  **Commit**: NO (이미 Task 1-2에서 커밋 완료)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1+2 (combined) | `refactor(backend): replace uuid with crypto.randomUUID()` | chatbot.service.ts, faq-clustering.service.ts, package.json, pnpm-lock.yaml | pnpm --filter backend build |

---

## Success Criteria

### Verification Commands
```bash
# 빌드 통과
pnpm --filter backend build          # Expected: exit code 0

# uuid import 제거 확인
ast-grep --pattern "from 'uuid'" --lang typescript apps/backend/src/
# Expected: 0 matches

# crypto.randomUUID() 사용 확인
ast-grep --pattern "crypto.randomUUID()" --lang typescript apps/backend/src/
# Expected: 5 matches

# 패키지 제거 확인
node -e "const p=require('./apps/backend/package.json'); console.log(!p.dependencies?.uuid && !p.devDependencies?.['@types/uuid'] ? 'PASS' : 'FAIL')"
# Expected: PASS
```

### Final Checklist
- [x] `uuidv4()` 호출 5곳 모두 `crypto.randomUUID()` 으로 교체
- [x] uuid import 라인 2개 삭제
- [x] `crypto` import 추가하지 않음 (글로벌 사용)
- [x] package.json에서 `uuid` + `@types/uuid` 제거
- [x] `pnpm install`로 lockfile 갱신
- [x] `pnpm --filter backend build` 성공
- [x] 인터페이스/타입 수정 없음
- [x] 범위 밖 TS 에러 건드리지 않음
