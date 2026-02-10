# Notepad
<!-- Auto-managed by OMC. Manual edits preserved in MANUAL section. -->

## Priority Context
<!-- ALWAYS loaded. Keep under 500 chars. Critical discoveries only. -->
DOCKER 구현 완료 (2026-02-10): 6 CREATE (.dockerignore, 2x Dockerfile, entrypoint.sh, docker-compose.yml, secrets/.gitkeep). .gitignore 이미 secrets/ 포함. 배포: secrets/에 service-account.json 배치 → ADMIN_SEED_PASSWORD=xxx docker compose build → docker compose up -d.

## UI Check 기능 현황 (2026-02-09)
- 백엔드: UI Check 서비스 완전 동작 ✅ (인증, UUID resolve, 페이지 체크, DB 이력, Slack 알림)
- 최종 결과: auth=true, 4/4 healthy, 54/54 checks passed
- 설정: config/ui-checks.json (4 타겟, 10종 체크타입)
- 운영 가이드: docs/ui-check-guide.md 작성 완료
- 다음 세션: 프론트엔드 대시보드에 UI Check 결과 표시 기능 추가 (계획 단계부터)

## UI Check 인증 디버깅 완료 (2026-02-09)
- 근본 원인: stale NestJS 프로세스가 포트 점유 → 환경변수 미로드
- 해결: pkill -f "nest start" 후 클린 재시작
- summary-daily no_error_text: 영문 패턴(Error/404/500) 제거 → 한글만 사용
- 최종 결과: auth=true, 4/4 healthy, 54/54 checks passed
- .env 변경 시 반드시 프로세스 완전 종료 + 재시작 필요

## UI Check 인증 디버깅 필요 (2026-02-09)
- CSS 셀렉터: 3개 타겟 모두 Playwright 직접 테스트 통과 ✅
- auth 설정: #username, button:has-text("로그인"), button:has-text("로그아웃")
- 문제: NestJS 서비스 내 authenticate()가 실패 (standalone은 성공)
- 원인 추정: ConfigService가 .env의 UI_CHECK_LOGIN_URL을 못 읽음 (서버 재시작 필요)
- .env에 UI_CHECK_ENABLED=true 추가됨
- no_error_text 패턴: 한글만 사용 (영문 Error/404/500 제거)

## Working Memory
<!-- Session notes. Auto-pruned after 7 days. -->
### 2026-02-08 23:39
### 2026-02-08 23:50
### 2026-02-09 00:57
### 2026-02-09 04:39
Code Review completed 2026-02-09. Key findings:
- CRITICAL: SQL injection in metrics.queries.ts (10+ locations), unauthenticated /query endpoint, JWT secret fallback, weak seed password
- HIGH: @Public() abuse on 8+ controllers, no Helmet, LLM prompt injection, CORS wildcard+credentials
- Frontend: token refresh race condition, chatbotQualityService uses raw fetch(), Recharts SSR not disabled (14 files), AuthContext missing useMemo
- Architecture: 4 services bypass DataSource pattern, batch-analysis.service.ts is 1405-line God Object
- Doc saved to: docs/CODE_REVIEW_2026-02-09.md with 5-phase remediation roadmap
### 2026-02-09 23:58
Docker 구현 완료 (2026-02-10): 12개 파일 생성/수정. 계획: .omc/plans/dockerize-deployment.md. 코드 변경: seed.ts (DATABASE_URL), ui-check.service.ts (UI_CHECKS_CONFIG_PATH), datasource.config.ts (DATASOURCES_CONFIG_PATH). Docker Desktop 시작 후 docker compose build && docker compose up 실행 필요.


## 2026-02-08 23:39
### 2026-02-08 23:50
### 2026-02-09 00:57
### 2026-02-09 04:39
Code Review completed 2026-02-09. Key findings:
- CRITICAL: SQL injection in metrics.queries.ts (10+ locations), unauthenticated /query endpoint, JWT secret fallback, weak seed password
- HIGH: @Public() abuse on 8+ controllers, no Helmet, LLM prompt injection, CORS wildcard+credentials
- Frontend: token refresh race condition, chatbotQualityService uses raw fetch(), Recharts SSR not disabled (14 files), AuthContext missing useMemo
- Architecture: 4 services bypass DataSource pattern, batch-analysis.service.ts is 1405-line God Object
- Doc saved to: docs/CODE_REVIEW_2026-02-09.md with 5-phase remediation roadmap


## 2026-02-08 23:39
### 2026-02-08 23:50
### 2026-02-09 00:57
## 세션 요약: UI Check 인증 디버깅 + 문서화 (2026-02-09)

### 완료된 작업
1. **authenticate() 실패 근본 원인**: stale NestJS 프로세스가 포트 점유 → 클린 재시작으로 해결
2. **UUID resolve 정상화**: DB에 오늘 리포트 UUID 4개 모두 존재 확인 (GENERAL, AI, DIVIDEND, FOREX)
3. **summary-daily no_error_text 오탐 수정**: 영문 패턴(Error/404/500) 제거 → 한글 패턴만 유지
4. **Forex UUID 개별 검증**: 8ba173ed-... UUID로 개별 테스트 → 11/12 pass (뉴스 1건만 있어 데이터 이슈)
5. **운영 가이드 작성**: docs/ui-check-guide.md (680줄, 10가지 체크타입, 트러블슈팅 5건, FAQ, 체크리스트)
6. **.env 보안**: .claude/settings.local.json에 .env 파일 접근 차단 deny 규칙 추가

### 수정된 파일
- `apps/backend/config/ui-checks.json` - summary-daily no_error_text 패턴 수정
- `docs/ui-check-guide.md` - 신규 생성
- `.claude/settings.local.json` - .env deny 규칙 추가

### 다음 세션 계획
- 프론트엔드 대시보드에 UI Check 결과/이력 표시 기능 추가
- 현재 프론트엔드 report-monitoring 페이지: apps/frontend-next/src/app/dashboard/report-monitoring/page.tsx
- 백엔드 API 이미 준비됨: GET status, GET history, GET health, POST ui-check
- 프론트엔드 서비스: apps/frontend-next/src/services/reportMonitoringService.ts
- 계획(plan) 단계부터 시작 예정


## 2026-02-08 23:39
### 2026-02-08 23:50
## CSS 셀렉터 분석 완료 (2026-02-09)

### 완료된 작업
1. **Summary Daily** - 이전 세션에서 완료
2. **AI Daily** - DOM 분석 완료, ui-checks.json 업데이트 완료
3. **Dividend Daily** - DOM 분석 완료, ui-checks.json 업데이트 완료
4. **Forex Daily** - DOM 분석 완료, ui-checks.json 업데이트 완료
5. **빌드 검증** - 에러 0건

### 핵심 변경사항
- 3개 타겟의 `"..."` 플레이스홀더 → 실제 CSS 셀렉터로 교체
- `table_structure` → `element_count_min` 교체 (테이블 없음, div 기반)
- `no_empty_cells` → `content_not_empty` 교체
- `chart_rendered` selector: `main section:nth-of-type(4) img`

### 3개 테마 리포트 공통 구조
- 4개 `<section>` 기반: `main section:nth-of-type(N)`
- Section 1: 뉴스 (6 li, 6 a)
- Section 2: 전망과 분석 (2 li)
- Section 3: 데이터 테이블 (div.flex.flex-col > div)
  - Dividend: 5행 (1h+4d), AI: 8행 (2h+6d), Forex: 10행 (2h+8d)
  - AI/Forex는 div.flex.gap-4로 2열 병렬 테이블
- Section 4: 그래프 (img 2개, GCS 호스팅)


## 2026-02-08 23:39
## UI Check CSS 셀렉터 분석 진행 상황 (2026-02-09)

### 완료된 작업
1. **Phase 1~6 구현 완료** - 8개 파일 수정, 빌드 에러 0건
2. **Summary Daily 셀렉터** - 분석 완료 + ui-checks.json 업데이트 완료
3. **Dividend Daily 셀렉터** - 분석 완료, ui-checks.json 업데이트 대기

### 핵심 발견: 테이블 없음!
외부 앱(ibk.onelineai.com)은 `<table>` 요소를 사용하지 않음. 모든 데이터가 div/section 기반 카드 레이아웃.
- `table_structure` 체크 → `element_count_min`으로 교체 필요
- `no_empty_cells` 체크 → `content_not_empty`로 교체 필요

### Summary Daily 구조 (URL: /report/daily/summary/{uuid})
- 래퍼: `main > div > div > div:nth-child(N)` (9개 섹션)
- nth-child(2): 금융시장 키워드 (ul>li 2개)
- nth-child(3): 주요 뉴스 10선 (h3 10개)
- nth-child(4): 시장 추세 그래프 (img 2개)
- nth-child(5): 글로벌 지수 (div행 6개: 헤더1+데이터5)
- nth-child(6): 환율 동향 (div행 5개: 헤더1+데이터4)
- nth-child(7): 원자재 가격 (div행 5개: 헤더1+데이터4)
- nth-child(8): AI 인사이트 (ul>li 2개, 387자)
- nth-child(9): 유의 사항
- 데이터 행 셀렉터: `div:nth-child(N) > div:nth-child(2) > div > div`

### Dividend Daily 구조 (URL: /report/daily/{uuid})
- **Summary와 다른 구조!** `<section>` 태그 사용
- 4개 section: `main section:nth-of-type(N)`
- section(1): 배당 상품 관련 뉴스 (li 6개, a 6개)
- section(2): 전망과 분석 (li 2개, 142자)
- section(3): 고배당 종목/ETF 현황 (div.flex.flex-col > div 5행: 헤더1+데이터4)
  - 행 셀렉터: `section:nth-of-type(3) div.flex.flex-col > div` (5개)
  - 헤더행: `bg-[#F1F5F9]` 클래스, 데이터행: `border-b border-slate-200`
- section(4): 그래프 데이터 (img 2개)

### 다음 세션에서 할 일
1. AI Daily 페이지 열어서 DOM 분석 (section 기반일 가능성 높음)
2. Forex Daily 페이지 열어서 DOM 분석
3. ai-daily, dividend-daily, forex-daily 타겟의 checks 배열 업데이트
4. shared-types 빌드 → 백엔드 빌드 검증


## MANUAL
<!-- User content. Never auto-pruned. -->

