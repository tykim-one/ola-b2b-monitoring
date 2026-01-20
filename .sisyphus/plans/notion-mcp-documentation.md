# Work Plan: Notion MCP 개발 문서 자동화

## Overview

OLA B2B Monitoring 프로젝트의 개발 문서를 Notion에 자동 동기화하는 시스템을 구축합니다. Claude Code에서 수동 명령어로 실행하며, 비개발자도 이해할 수 있는 친화적인 형태로 문서를 생성합니다.

**핵심 가치**: 코드베이스의 92+ AGENTS.md 파일과 30+ API 엔드포인트 문서를 Notion으로 자동 동기화하여 팀 전체의 문서 접근성을 향상시킵니다.

---

## Requirements Summary

| 항목 | 결정 사항 |
|------|-----------|
| **우선순위** | 코드 구조 (1순위) → API 문서 (2순위) → 변경 로그 (3순위) |
| **트리거 방식** | Claude Code 수동 명령어 |
| **MCP 환경** | 로컬 개발 환경 |
| **동기화 정책** | 완전 덮어쓰기 (기존 페이지 대체) |
| **비개발자 친화적 요소** | 기술 용어 설명 + 요약 섹션 |

---

## Phase 1: MCP 설정 (기반 구축)

### Objective
Notion MCP 서버를 로컬에 설치하고 Claude Code와 연동하여 Notion API 호출이 가능한 환경을 구축합니다.

### Tasks

- [ ] **1.1** Notion Integration 생성 및 API 키 발급
  - Notion Developers 페이지에서 Internal Integration 생성
  - 필요 권한: Read/Write content, Read/Write comments
  - Integration Token 발급 및 안전한 저장

- [ ] **1.2** Notion 워크스페이스 준비
  - 문서화용 최상위 페이지 생성 (예: "OLA Development Docs")
  - Integration을 해당 페이지에 연결 (Share → Invite)
  - 페이지 ID 확보 (URL에서 추출)

- [ ] **1.3** Notion MCP 서버 설치
  - 공식 또는 커뮤니티 Notion MCP 패키지 설치
  - 추천: `@anthropic/mcp-server-notion` 또는 `@modelcontextprotocol/server-notion`

- [ ] **1.4** Claude Code MCP 설정 파일 생성
  - `.claude/mcp.json` 파일 생성 또는 수정
  - Notion MCP 서버 연결 설정
  - 환경변수로 API 키 참조

- [ ] **1.5** 연동 테스트
  - MCP 서버 시작 확인
  - Claude Code에서 Notion 도구 호출 테스트
  - 테스트 페이지 생성/수정/삭제 확인

### 예상 파일 변경

```
신규 생성:
├── .claude/mcp.json                    # MCP 서버 설정
├── .env.notion (또는 .env에 추가)       # NOTION_API_KEY, NOTION_ROOT_PAGE_ID

수정:
├── .gitignore                          # .env.notion 추가 (보안)
```

### MCP 설정 예시

```json
// .claude/mcp.json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-notion"],
      "env": {
        "NOTION_API_KEY": "${NOTION_API_KEY}"
      }
    }
  }
}
```

### Definition of Done
- [ ] Claude Code에서 `mcp__notion__*` 도구 호출 가능
- [ ] 테스트 페이지 생성 성공

---

## Phase 2: 코드 구조 문서 동기화 (1순위)

### Objective
92+ AGENTS.md 파일의 계층 구조를 파싱하여 비개발자 친화적인 형태로 Notion에 동기화합니다.

### Tasks

- [ ] **2.1** AGENTS.md 파서 구현
  - 모든 AGENTS.md 파일 탐색 (glob 패턴)
  - Markdown 파싱 (섹션, 목록, 코드 블록)
  - 계층 구조 추출 (`<!-- Parent: ../AGENTS.md -->` 태그 활용)
  - 파싱 결과를 구조화된 JSON으로 변환

- [ ] **2.2** 비개발자 친화적 변환 로직 구현
  - **기술 용어 사전**: 자주 사용되는 용어 설명 매핑
    - Controller → "API 요청을 받아 처리하는 진입점"
    - Service → "비즈니스 로직을 담당하는 핵심 처리 계층"
    - DTO → "데이터 전송 형식을 정의하는 구조체"
    - Module → "관련 기능을 묶어놓은 기능 단위"
  - **요약 섹션 생성**: 각 디렉토리의 핵심 역할을 1-2문장으로 요약
  - **시각적 계층 표현**: 디렉토리 깊이에 따른 들여쓰기/이모지

- [ ] **2.3** Notion 페이지 구조 설계
  - 계층적 페이지 구조 (부모-자식 관계 유지)
  - 각 페이지 템플릿:
    - 요약 (Callout 블록)
    - 목적 (Purpose)
    - 주요 파일 설명 (테이블)
    - 하위 디렉토리 링크
    - 용어 설명 (토글 블록)

- [ ] **2.4** Notion 동기화 로직 구현
  - 기존 페이지 존재 시 덮어쓰기 (archive 후 재생성 또는 블록 교체)
  - 계층 순서대로 생성 (부모 → 자식)
  - 에러 핸들링 및 재시도 로직

- [ ] **2.5** Claude Code 명령어 구현 (/sync-structure)
  - Skill 파일 생성: `.claude/skills/sync-structure.md`
  - 실행 플로우: 파싱 → 변환 → 동기화 → 결과 보고

### 예상 파일 변경

```
신규 생성:
├── .claude/skills/sync-structure.md           # 명령어 정의
├── scripts/notion-sync/
│   ├── parse-agents.ts                        # AGENTS.md 파서
│   ├── transform-friendly.ts                  # 비개발자 친화적 변환
│   ├── notion-client.ts                       # Notion API 래퍼
│   ├── sync-structure.ts                      # 메인 동기화 로직
│   └── glossary.json                          # 기술 용어 사전
```

### 명령어 설계

```markdown
# /sync-structure 명령어

## 사용법
/sync-structure [options]

## 옵션
--path <dir>     특정 디렉토리만 동기화 (기본: 전체)
--dry-run        실제 동기화 없이 미리보기
--verbose        상세 로그 출력

## 실행 예시
/sync-structure                    # 전체 동기화
/sync-structure --path apps/backend
/sync-structure --dry-run          # 미리보기
```

### Notion 페이지 구조 예시

```
OLA Development Docs/
├── Overview (프로젝트 전체 요약)
├── Backend (apps/backend/)
│   ├── Summary: "NestJS 기반 API 서버. BigQuery 연동, 캐싱, 이상 탐지 담당"
│   ├── Metrics Module/
│   │   └── Summary: "KPI, 트래픽, 사용량 등 메트릭 API 제공"
│   ├── Admin Module/
│   │   └── Summary: "사용자 인증, 권한 관리, LLM 분석 기능"
│   └── ...
├── Frontend (apps/frontend-next/)
│   ├── Summary: "Next.js 16 + React 19 대시보드"
│   └── ...
└── Shared Types (packages/shared-types/)
```

### Definition of Done
- [ ] `/sync-structure` 명령어 실행 시 Notion에 페이지 생성
- [ ] 92+ AGENTS.md의 계층 구조가 Notion에 반영
- [ ] 비개발자가 읽을 수 있는 요약 및 용어 설명 포함

---

## Phase 3: API 문서 동기화 (2순위)

### Objective
Swagger/OpenAPI 문서를 추출하여 Notion에 API 레퍼런스 페이지를 생성합니다.

### Tasks

- [ ] **3.1** Swagger JSON 추출 스크립트
  - 백엔드 서버 실행 후 `/api-docs-json` 엔드포인트에서 추출
  - 또는 빌드 타임에 swagger-spec 파일 생성

- [ ] **3.2** API 엔드포인트 파서
  - 태그별 그룹화 (Metrics, Admin, Auth, Users 등)
  - 각 엔드포인트 정보 추출:
    - Method, Path, Summary
    - Parameters, Request Body
    - Response Schema
    - 권한 요구사항

- [ ] **3.3** Notion 페이지 변환
  - 태그별 섹션 페이지
  - 엔드포인트별 상세 페이지 또는 테이블 행
  - 요청/응답 예시 코드 블록

- [ ] **3.4** 동기화 명령어 구현 (/sync-api)
  - Skill 파일: `.claude/skills/sync-api.md`

### 예상 파일 변경

```
신규 생성:
├── .claude/skills/sync-api.md
├── scripts/notion-sync/
│   ├── extract-swagger.ts          # Swagger JSON 추출
│   ├── parse-openapi.ts            # OpenAPI 파싱
│   └── sync-api.ts                 # API 문서 동기화
```

### 명령어 설계

```markdown
# /sync-api 명령어

## 사용법
/sync-api [options]

## 옵션
--tag <name>     특정 태그만 동기화
--dry-run        미리보기

## 실행 예시
/sync-api                    # 전체 API 동기화
/sync-api --tag Admin        # Admin API만
```

### Definition of Done
- [ ] `/sync-api` 명령어 실행 시 Notion에 API 문서 생성
- [ ] 30+ 엔드포인트가 태그별로 정리됨
- [ ] 요청/응답 스키마가 명확히 표시됨

---

## Phase 4: 변경 로그 동기화 (3순위)

### Objective
Git 커밋 히스토리를 기반으로 변경 로그를 Notion에 자동 생성합니다.

### Tasks

- [ ] **4.1** Git 히스토리 파서
  - `git log` 명령어로 커밋 정보 추출
  - Conventional Commits 패턴 인식:
    - `feat:` → 새 기능
    - `fix:` → 버그 수정
    - `refactor:` → 리팩토링
    - `docs:` → 문서
    - `chore:` → 기타

- [ ] **4.2** 변경 로그 포맷터
  - 날짜별 그룹화
  - 타입별 분류
  - Breaking Changes 하이라이트

- [ ] **4.3** Notion 페이지 생성
  - 버전/기간별 페이지 또는 단일 롤링 페이지
  - 카테고리별 토글 섹션

- [ ] **4.4** 동기화 명령어 구현 (/sync-changelog)
  - Skill 파일: `.claude/skills/sync-changelog.md`

### 예상 파일 변경

```
신규 생성:
├── .claude/skills/sync-changelog.md
├── scripts/notion-sync/
│   ├── parse-git-log.ts            # Git 히스토리 파싱
│   └── sync-changelog.ts           # 변경 로그 동기화
```

### 명령어 설계

```markdown
# /sync-changelog 명령어

## 사용법
/sync-changelog [options]

## 옵션
--since <date>   특정 날짜 이후 커밋만 (예: 2025-01-01)
--count <n>      최근 n개 커밋만
--dry-run        미리보기

## 실행 예시
/sync-changelog                     # 전체 히스토리
/sync-changelog --since 2025-01-01  # 2025년 이후
/sync-changelog --count 50          # 최근 50개
```

### Definition of Done
- [ ] `/sync-changelog` 명령어 실행 시 Notion에 변경 로그 생성
- [ ] Conventional Commits 패턴이 카테고리별로 분류됨
- [ ] 날짜별 그룹화 적용

---

## Risks & Mitigations

| 리스크 | 영향도 | 대응 방안 |
|--------|--------|-----------|
| **Notion API Rate Limit** (3 req/sec) | 중 | 배치 처리, 지수 백오프 재시도 |
| **MCP 서버 호환성** | 중 | Phase 1에서 철저한 테스트, 대안 MCP 준비 |
| **AGENTS.md 형식 불일치** | 저 | 유연한 파서 + 예외 처리 로깅 |
| **대용량 동기화 시간** | 저 | 증분 동기화 옵션 (--path), 진행률 표시 |
| **Notion 페이지 ID 변경** | 중 | 매핑 테이블 유지 또는 페이지 제목 기반 검색 |

---

## Success Criteria

### Phase 1 완료 기준
- [ ] Claude Code에서 Notion MCP 도구 정상 작동
- [ ] 테스트 페이지 CRUD 성공

### Phase 2 완료 기준
- [ ] `/sync-structure` 명령어로 전체 AGENTS.md 동기화 완료
- [ ] Notion에서 계층적 페이지 구조 확인
- [ ] 비개발자 팀원이 문서를 이해할 수 있음 (리뷰 통과)

### Phase 3 완료 기준
- [ ] `/sync-api` 명령어로 30+ API 엔드포인트 문서화
- [ ] 태그별 정리 및 요청/응답 스키마 표시

### Phase 4 완료 기준
- [ ] `/sync-changelog` 명령어로 변경 로그 생성
- [ ] Conventional Commits 패턴 분류 정상 작동

### 전체 프로젝트 완료 기준
- [ ] 3개 명령어 모두 안정적으로 작동
- [ ] 에러 발생 시 명확한 메시지 출력
- [ ] 실행 시간 합리적 (전체 동기화 < 5분)

---

## Commit Strategy

각 Phase 완료 시 커밋:

```
Phase 1: feat(notion-mcp): add MCP server configuration for Notion integration
Phase 2: feat(notion-sync): implement /sync-structure command for codebase docs
Phase 3: feat(notion-sync): implement /sync-api command for API documentation
Phase 4: feat(notion-sync): implement /sync-changelog command for git history
```

---

## Next Steps

이 Work Plan이 승인되면:

1. `/review` 명령어로 Momus의 비평적 검토 진행 (선택)
2. 승인 후 Phase 1부터 구현 시작
3. 각 Phase 완료 시 검증 후 다음 Phase 진행

---

*Generated by Prometheus - Strategic Planning Consultant*
*Plan created: 2026-01-20*
