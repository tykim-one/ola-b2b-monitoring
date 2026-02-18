# Fix Backend Prisma Module Resolution Crash

## TL;DR

> **Quick Summary**: 백엔드 서버가 `Cannot find module '../../generated/prisma'` 에러로 부팅 즉시 크래시합니다. `nest-cli.json`의 asset 복사 경로(`outDir`)가 TypeScript 컴파일 출력 구조와 불일치하여, Prisma 생성 파일이 런타임에서 찾을 수 없는 위치에 복사되는 것이 근본 원인입니다.
> 
> **Deliverables**:
> - `nest-cli.json` asset outDir 수정 (1줄 변경)
> - outDir 수정이 NestJS CLI 버그로 동작하지 않을 경우를 대비한 fallback 적용
> - 백엔드 개발서버(`nest start --watch`) + 프로덕션 빌드(`nest build`) 모두 정상 동작 검증
> 
> **Estimated Effort**: Quick (1줄 config 수정 + 검증)
> **Parallel Execution**: NO - 순차적 (수정 → 검증 → 필요 시 fallback)
> **Critical Path**: Task 1 (config 수정) → Task 2 (검증) → Task 3 (조건부 fallback)

---

## Context

### Original Request
`pnpm dev:all` 실행 시 모든 백엔드 요청이 실패하는 문제 해결. 서버가 아예 구동되지 않는 상태.

### Root Cause Analysis
**에러 메시지:**
```
Error: Cannot find module '../../generated/prisma'
Require stack:
- dist/src/admin/database/prisma.service.js
- dist/src/admin/database/database.module.js
- ...
- dist/src/main.js
```

**경로 불일치 상세:**

| 항목 | 경로 | 존재 여부 |
|------|------|-----------|
| **소스 import** | `src/admin/database/prisma.service.ts` → `../../generated/prisma` → `src/generated/prisma/` | ✅ 존재 |
| **컴파일 후 require** | `dist/src/admin/database/prisma.service.js` → `../../generated/prisma` → `dist/src/generated/prisma/` | ❌ **없음** |
| **실제 asset 복사 위치** | `dist/generated/prisma/` (nest-cli.json outDir: "dist") | ✅ 존재하지만 엉뚱한 곳 |

**원인 메커니즘:**
1. `tsconfig.json`의 `outDir: "./dist"` + `sourceRoot: "src"` → TypeScript는 `src/**` 를 `dist/src/**` 로 컴파일
2. `nest-cli.json`의 asset config: `include: "generated/**/*"`, `outDir: "dist"` → NestJS CLI는 `src/generated/**/*`를 `dist/generated/**/*`로 복사 (src 프리픽스를 제거)
3. 런타임에서 `dist/src/admin/database/prisma.service.js`가 `require("../../generated/prisma")`를 호출하면 → `dist/src/generated/prisma/`를 찾는데, 실제 파일은 `dist/generated/prisma/`에 있어서 MODULE_NOT_FOUND

### Metis Review
**Identified Gaps (addressed):**
- NestJS CLI의 `outDir` 옵션은 알려진 버그 이력 존재 (Issues #561, #681, #2687) → fallback 전략 포함
- `nest build` (non-watch)에서 `outDir`가 무시될 수 있음 → 빌드 모드 별도 검증 필수
- `deleteOutDir: true` 설정으로 stale dist 정리는 자동 → 별도 정리 불필요
- fresh clone 시 `prisma generate` 선행 필요 → 이번 스코프 외, 문서화 수준

---

## Work Objectives

### Core Objective
`nest-cli.json`의 asset 복사 경로를 수정하여, Prisma 생성 클라이언트가 런타임에서 올바른 경로로 resolve되도록 함. 백엔드 서버가 정상 부팅되어 API 요청을 처리할 수 있도록 함.

### Concrete Deliverables
- `apps/backend/nest-cli.json` — asset outDir 수정 (1줄)
- (조건부) outDir가 NestJS CLI 버그로 동작하지 않을 경우 fallback 수정

### Definition of Done
- [x] `pnpm dev:backend` 실행 시 `Cannot find module` 에러 없이 서버 기동
- [x] `nest build` 후 `dist/src/generated/prisma/index.js` 파일 존재
- [x] `http://localhost:3000`에 응답 반환

### Must Have
- dev 모드 (`nest start --watch`)에서 정상 동작
- production 빌드 (`nest build` → `node dist/main.js`)에서 정상 동작

### Must NOT Have (Guardrails)
- ❌ `prisma/schema.prisma`의 output 경로 변경 금지 (모든 개발 환경에 영향)
- ❌ `prisma.service.ts`의 import 경로 변경 금지 (소스 구조 기준으로 올바른 경로임)
- ❌ `tsconfig.json`의 outDir 변경 금지 (전체 빌드 체인 파손 위험)
- ❌ 새 파일/모듈 추가 금지 (1줄 config 수정으로 해결해야 함)
- ❌ `deleteOutDir: true` 제거 금지 (clean build 보장 필요)
- ❌ `watchAssets: true` 제거 금지 (outDir 동작에 필요)
- ❌ `prisma generate`를 prebuild 스크립트에 추가하지 말 것 (별도 concern, 별도 PR)
- ❌ EADDRINUSE:3001 포트 문제 수정하지 말 것 (운영 이슈, 코드 버그 아님)

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.
> **FORBIDDEN** — acceptance criteria that require:
> - "User manually tests..." / "사용자가 직접 테스트..."
> - "User visually confirms..." / "사용자가 눈으로 확인..."
> - ANY step where a human must perform an action

### Test Decision
- **Infrastructure exists**: YES (jest 설정 있음)
- **Automated tests**: NO (config 수정이라 단위 테스트 불필요)
- **Framework**: Agent-Executed QA로 충분

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

**Verification Tool by Deliverable Type:**

| Type | Tool | How Agent Verifies |
|------|------|-------------------|
| Build output | Bash (ls, test) | 파일 존재 확인 |
| Server startup | Bash (nest start + timeout + grep) | 로그 메시지 확인 |
| HTTP endpoint | Bash (curl) | 응답 확인 |

---

## Execution Strategy

### Sequential (단순 의존 체인)

```
Task 1: nest-cli.json outDir 수정
    ↓
Task 2: 검증 (build + dev 모드)
    ↓
Task 3: (조건부) outDir 동작 안 하면 fallback 적용
    ↓
Task 4: 최종 통합 검증
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2 | None |
| 2 | 1 | 3 | None |
| 3 | 2 (실패 시만) | 4 | None |
| 4 | 2 or 3 | None | None |

---

## TODOs

- [x] 1. nest-cli.json asset outDir 수정

  **What to do**:
  - `apps/backend/nest-cli.json`의 `compilerOptions.assets[0].outDir` 값을 `"dist"`에서 `"dist/src"`로 변경
  - 변경 전:
    ```json
    {
      "include": "generated/**/*",
      "outDir": "dist",
      "watchAssets": true
    }
    ```
  - 변경 후:
    ```json
    {
      "include": "generated/**/*",
      "outDir": "dist/src",
      "watchAssets": true
    }
    ```
  - `watchAssets: true`는 **반드시 유지** (NestJS CLI outDir 동작에 필요)

  **Must NOT do**:
  - `prisma/schema.prisma` 수정 금지
  - `prisma.service.ts` import 경로 수정 금지
  - `tsconfig.json` 수정 금지
  - 다른 파일 수정 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 파일 1줄 변경. JSON 값 하나만 수정하면 됨.
  - **Skills**: []
    - 추가 skill 불필요. 단순 Edit 작업.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 2
  - **Blocked By**: None

  **References** (CRITICAL):

  **Pattern References**:
  - `apps/backend/nest-cli.json:6-14` — 현재 compilerOptions 전체 구조. 수정 대상은 line 10의 `"outDir": "dist"`

  **API/Type References**:
  - `apps/backend/src/admin/database/prisma.service.ts:3` — `import { PrismaClient } from '../../generated/prisma'` (이 import 경로가 런타임에서 `dist/src/generated/prisma`를 요구하는 원인)
  - `apps/backend/prisma/schema.prisma:6` — `output = "../src/generated/prisma"` (Prisma가 `src/generated/prisma/`에 생성하는 설정)

  **Documentation References**:
  - NestJS CLI assets 문서: https://docs.nestjs.com/cli/monorepo#assets — `outDir`는 프로젝트 루트 기준 상대 경로

  **WHY Each Reference Matters**:
  - `nest-cli.json:10`: 이것이 수정 대상. `"dist"` → `"dist/src"`로 변경해야 함
  - `prisma.service.ts:3`: 이 import가 컴파일 후 `dist/src/admin/database/`에서 `../../generated/prisma` = `dist/src/generated/prisma`를 찾게 되는 원인
  - `schema.prisma:6`: Prisma 생성 출력 위치가 `src/generated/prisma/`인 이유 확인

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: nest-cli.json의 outDir 값이 정확히 변경되었는지 확인
    Tool: Bash (grep/cat)
    Preconditions: Task 1 수정 완료
    Steps:
      1. cat apps/backend/nest-cli.json
      2. Assert: "outDir" 값이 "dist/src" 인지 확인
      3. Assert: "watchAssets" 값이 true 인지 확인
      4. Assert: "include" 값이 "generated/**/*" 인지 확인 (변경 없음)
      5. Assert: "deleteOutDir" 값이 true 인지 확인 (변경 없음)
    Expected Result: outDir만 "dist/src"로 변경, 나머지 동일
    Evidence: nest-cli.json 파일 내용 캡처
  ```

  **Commit**: YES
  - Message: `fix(backend): correct nest-cli.json asset outDir to match compiled output path`
  - Files: `apps/backend/nest-cli.json`
  - Pre-commit: Task 2 검증 통과 후

---

- [x] 2. 빌드 및 개발 모드 검증

  **What to do**:
  - Step 2-A: `nest build`를 실행하여 `dist/src/generated/prisma/index.js`가 올바른 위치에 생성되는지 확인
  - Step 2-B: `dist/generated/prisma/` (이전 잘못된 위치)가 존재하지 않는지 확인 (`deleteOutDir: true`로 자동 정리)
  - Step 2-C: `nest start --watch`로 개발 서버가 정상 부팅되는지 확인 (module resolution 에러 없이)
  - Step 2-D: 서버가 HTTP 요청에 응답하는지 확인

  **⚠️ 중요: NestJS CLI outDir 버그 가능성**
  - NestJS CLI Issues #561, #681, #2687에 따르면, `outDir`가 일부 버전/모드에서 무시될 수 있음
  - `nest build` (non-watch)에서 `outDir`가 동작하지 않을 수 있음
  - **만약 Step 2-A에서 `dist/src/generated/prisma/index.js`가 없고 `dist/generated/prisma/index.js`에 여전히 생성된다면** → Task 1의 outDir 변경이 무시된 것이므로 → **Task 3 (fallback) 진행 필요**

  **Must NOT do**:
  - 검증 실패 시 임의로 파일을 추가/복사하지 말 것
  - dist/ 디렉토리를 수동 조작하지 말 것

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 셸 명령어 실행 + 출력 확인만 필요
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 3 (실패 시) 또는 Task 4 (성공 시)
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `apps/backend/dist/src/admin/database/prisma.service.js:48` — `require("../../generated/prisma")` 가 런타임에서 해석되는 경로 확인
  - `apps/backend/nest-cli.json:6` — `deleteOutDir: true` 설정으로 매 빌드 시 dist/ 완전 제거 확인

  **WHY Each Reference Matters**:
  - `prisma.service.js:48`: 이 require 경로가 `dist/src/generated/prisma`를 해석하므로, 빌드 후 해당 경로에 파일이 있는지가 핵심 검증 포인트
  - `nest-cli.json:6`: deleteOutDir: true 덕분에 stale 파일 걱정 없이 깨끗한 빌드 검증 가능

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: nest build 후 Prisma 클라이언트가 올바른 경로에 존재
    Tool: Bash
    Preconditions: Task 1 완료, apps/backend 디렉토리
    Steps:
      1. cd apps/backend && npx nest build
      2. test -f dist/src/generated/prisma/index.js && echo "EXISTS" || echo "MISSING"
      3. Assert: stdout에 "EXISTS" 출력
      4. test -d dist/generated/prisma && echo "OLD_EXISTS" || echo "OLD_CLEANED"
      5. Assert: stdout에 "OLD_CLEANED" 출력 (이전 잘못된 경로 제거 확인)
    Expected Result: dist/src/generated/prisma/index.js 존재, dist/generated/prisma/ 없음
    Failure Indicators: "MISSING" 출력 시 → Task 3 (fallback) 진행 필요
    Evidence: 명령어 출력 캡처

  Scenario: 개발 서버가 module resolution 에러 없이 부팅
    Tool: Bash
    Preconditions: Task 1 완료, 포트 3000 사용 가능
    Steps:
      1. cd apps/backend
      2. timeout 30 npx nest start --watch 2>&1 또는 유사 명령
      3. 출력에서 "Cannot find module" 존재 여부 확인
      4. 출력에서 "NestJS Backend running on" 또는 "Nest application successfully started" 존재 여부 확인
      5. Assert: "Cannot find module" 없음
      6. Assert: 서버 시작 성공 메시지 존재
    Expected Result: 백엔드 서버가 정상 부팅되어 리스닝 시작
    Failure Indicators: "Cannot find module '../../generated/prisma'" 메시지 → Task 3 진행
    Evidence: 서버 로그 출력 캡처

  Scenario: HTTP 헬스 체크 응답 확인
    Tool: Bash (curl)
    Preconditions: 개발 서버가 정상 부팅된 상태
    Steps:
      1. curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
      2. Assert: HTTP status code가 2xx 또는 4xx (서버가 응답한다는 것 자체가 중요, 401도 성공)
    Expected Result: 서버가 HTTP 요청에 응답 (status != 000, connection refused 아님)
    Failure Indicators: curl: (7) Failed to connect → 서버 미기동
    Evidence: HTTP status code 캡처
  ```

  **Commit**: NO (검증 단계, 코드 변경 없음)

---

- [x] 3. (조건부) Fallback: outDir 무시 시 대안 적용 **(SKIPPED - Task 2 성공)**

  **⚠️ 이 Task는 Task 2에서 `dist/src/generated/prisma/index.js`가 생성되지 않은 경우에만 실행합니다.**
  **Task 2가 성공하면 이 Task는 SKIP합니다.**

  **What to do**:
  - NestJS CLI가 `outDir: "dist/src"`를 무시한 경우의 대안
  - **Fallback A** (우선 시도): `nest-cli.json`의 assets에서 `outDir` 속성을 완전히 제거하고, `include` 패턴을 `"src/generated/**/*"`로 변경하여 기본 outDir (`dist`)에 `src/generated/` 구조 그대로 복사되도록 시도
    ```json
    {
      "include": "src/generated/**/*",
      "watchAssets": true
    }
    ```
    - 이 경우 NestJS CLI가 `sourceRoot`(`src`) 기준이 아닌 프로젝트 루트 기준으로 include 패턴을 해석할 수 있으므로, 복사 결과가 `dist/src/generated/`가 되는지 확인 필요
  
  - **Fallback B** (Fallback A도 실패 시): `prisma.service.ts`의 import 경로를 빌드 결과물의 실제 위치에 맞춰 수정
    - `nest build` 후 실제 Prisma 파일이 어디에 복사되었는지 확인 (`find dist -name "index.js" -path "*/prisma/*"`)
    - `dist/generated/prisma/`에 있다면:
      - `prisma.service.ts`의 import를 `../../generated/prisma` → `../../../generated/prisma`로 변경 (dist/src/admin/database → dist/generated 상대경로)
      - **주의**: 이 방식은 소스 코드의 import 경로(`src/admin/database` → `src/generated`)와 달라지므로, `tsc --noEmit` 타입 체크에서 에러가 발생할 수 있음
      - 타입 체크 문제가 있으면 `tsconfig.json`에 paths alias 추가가 필요할 수 있음:
        ```json
        "paths": {
          "../../generated/prisma": ["../../generated/prisma", "../../../generated/prisma"]
        }
        ```
      - 이 접근은 복잡도가 올라가므로, **Fallback A가 동작하면 B는 SKIP**
  
  - **Fallback C** (최후 수단): nest-cli.json asset 복사 대신 `postbuild` 스크립트로 수동 복사
    - `package.json`에 `"postbuild": "cp -r src/generated dist/src/"` 추가
    - 가장 확실하지만 플랫폼 의존적 (Windows에서는 `xcopy` 또는 `robocopy` 필요)
    - cross-platform 대안: `"postbuild": "node -e \"require('fs').cpSync('src/generated','dist/src/generated',{recursive:true})\""` (Node.js 16.7+)

  **Must NOT do**:
  - `prisma/schema.prisma` output 변경 금지
  - `tsconfig.json` outDir 변경 금지
  - 불필요한 의존성 추가 금지 (cpx, copyfiles 등)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: 조건부 실행, 단순 config 수정이지만 여러 시도가 필요할 수 있음
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Task 2 실패 시에만 실행)
  - **Blocks**: Task 4
  - **Blocked By**: Task 2 (실패 조건)

  **References**:

  **Pattern References**:
  - `apps/backend/nest-cli.json:6-14` — 현재 asset config 전체
  - `apps/backend/src/admin/database/prisma.service.ts:3` — import 경로 (Fallback B에서 수정 대상)

  **Documentation References**:
  - NestJS CLI assets 문서: https://docs.nestjs.com/cli/monorepo#assets
  - NestJS CLI Issue #561: outDir 무시 버그
  - NestJS CLI Issue #2687: watchAssets 필요

  **WHY Each Reference Matters**:
  - `nest-cli.json`: Fallback A에서 include 패턴 변경 대상
  - `prisma.service.ts`: Fallback B에서 import 경로 수정 대상
  - NestJS Issues: 어떤 버전에서 어떤 동작이 기대되는지 확인

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: (Fallback 적용 후) nest build 시 올바른 경로에 파일 존재
    Tool: Bash
    Preconditions: Fallback A 또는 B 또는 C 적용 완료
    Steps:
      1. cd apps/backend && npx nest build
      2. node -e "require('./dist/src/admin/database/prisma.service.js')" 2>&1
      3. Assert: "Cannot find module" 에러 없음 (DI 관련 에러는 무관)
    Expected Result: prisma.service.js의 require가 해석 가능
    Evidence: 명령어 출력 캡처

  Scenario: (Fallback 적용 후) 개발 서버 정상 부팅
    Tool: Bash
    Preconditions: Fallback 적용 완료, 포트 3000 사용 가능
    Steps:
      1. cd apps/backend
      2. timeout 30 npx nest start --watch 2>&1
      3. Assert: "Cannot find module" 없음
      4. Assert: 서버 시작 메시지 존재
    Expected Result: 서버 정상 부팅
    Evidence: 서버 로그 캡처
  ```

  **Commit**: YES (fallback 실행된 경우)
  - Message: `fix(backend): align prisma asset copy path with compiled output structure`
  - Files: 수정된 파일에 따라 결정
  - Pre-commit: 검증 시나리오 통과 확인

---

- [x] 4. 최종 통합 검증

  **What to do**:
  - Task 2 (또는 Task 3 fallback 후) 성공 확인 후, `pnpm dev:all` 수준의 전체 스택 검증
  - 백엔드가 정상 부팅되어 API 요청을 처리하는지 최종 확인
  - 프론트엔드 EADDRINUSE:3001 문제는 이번 스코프 외이므로 백엔드만 검증

  **Must NOT do**:
  - EADDRINUSE 포트 문제 수정하지 말 것
  - 추가 기능 수정/개선 하지 말 것

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 셸 명령어 실행 + 결과 확인만
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (마지막 단계)
  - **Blocks**: None (최종)
  - **Blocked By**: Task 2 또는 Task 3

  **References**:

  **Pattern References**:
  - `apps/backend/src/main.ts:48-49` — `const port = process.env.PORT || 3000; await app.listen(port);` (포트 설정 및 리스닝)
  - `apps/backend/src/app.controller.ts` — 헬스체크 엔드포인트 (GET /)

  **WHY Each Reference Matters**:
  - `main.ts:48-49`: 서버가 실제로 listen하는 포트 확인, curl 대상 결정
  - `app.controller.ts`: 어떤 엔드포인트가 @Public()이고 인증 없이 응답하는지 확인

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: 백엔드 단독 개발 서버 정상 기동 및 응답
    Tool: Bash
    Preconditions: 포트 3000 사용 가능
    Steps:
      1. 루트 디렉토리에서 pnpm dev:backend 실행 (백그라운드)
      2. 15초 대기 (컴파일 + 서버 부팅)
      3. curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
      4. Assert: HTTP status code != 000 (서버가 응답함)
      5. 서버 프로세스 종료
    Expected Result: 백엔드 서버가 기동되어 HTTP 요청에 응답
    Failure Indicators: curl 연결 실패 (status 000), "Cannot find module" 로그
    Evidence: HTTP status code + 서버 로그 캡처

  Scenario: production 빌드 후 실행 정상 동작
    Tool: Bash
    Preconditions: 포트 3000 사용 가능
    Steps:
      1. cd apps/backend && pnpm build
      2. Assert: 빌드 에러 없음
      3. timeout 15 node dist/main.js 2>&1
      4. Assert: "Cannot find module" 에러 없음
      5. Assert: 서버 시작 메시지 존재 (또는 다른 모듈 초기화 로그)
    Expected Result: production 모드에서도 module resolution 정상
    Failure Indicators: "Cannot find module '../../generated/prisma'"
    Evidence: 서버 로그 캡처
  ```

  **Commit**: NO (검증 단계)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 + 2 성공 | `fix(backend): correct nest-cli.json asset outDir to match compiled output path` | `apps/backend/nest-cli.json` | Task 2 QA 시나리오 전체 통과 |
| 3 (fallback) | `fix(backend): align prisma asset copy path with compiled output structure` | 변경된 파일에 따라 | Task 3 + Task 4 QA 시나리오 통과 |

---

## Success Criteria

### Verification Commands
```bash
# 1. Clean build + asset 위치 확인
cd apps/backend && npx nest build && test -f dist/src/generated/prisma/index.js && echo "PASS" || echo "FAIL"

# 2. Module resolution 확인
cd apps/backend && node -e "require('./dist/src/admin/database/prisma.service.js')" 2>&1 | grep -c "Cannot find module" | xargs -I{} test {} -eq 0 && echo "PASS" || echo "FAIL"

# 3. 개발 서버 부팅 확인
cd apps/backend && timeout 30 npx nest start --watch 2>&1 | grep "Cannot find module" && echo "FAIL" || echo "PASS"
```

### Final Checklist
- [x] `nest-cli.json` outDir가 `"dist/src"`로 변경됨 (또는 fallback 적용됨)
- [x] `nest build` 후 `dist/src/generated/prisma/index.js` 존재
- [x] `nest start --watch`에서 `Cannot find module` 에러 없음
- [x] 서버가 HTTP 요청에 응답 (localhost:3000)
- [x] production 빌드 (`nest build` → `node dist/main.js`)에서도 동일하게 동작
- [x] `prisma/schema.prisma` 변경 없음
- [x] `prisma.service.ts` 변경 없음 (Fallback B 적용 시 제외)
- [x] `tsconfig.json` 변경 없음
