# UI 체크 검증 시스템 운영 가이드

## 개요

UI 체크 검증 시스템은 **Playwright** 자동화 기술을 사용하여 IBK 리포트 페이지들이 올바르게 렌더링되고 있는지 매일 검증합니다. 페이지의 구조, 콘텐츠, 차트 등을 자동으로 확인하고, 문제가 발견되면 운영팀에 알립니다.

### 주요 역할

- **일일 자동 검증**: 매일 오전 8:30 KST에 자동 실행
- **렌더링 정상성 확인**: 페이지가 빈 상태이거나 오류를 표시하지 않는지 검사
- **이슈 감지**: 구조, 콘텐츠, 차트 렌더링 문제 자동 탐지
- **알림**: 문제 발생 시 Slack으로 즉시 알림

---

## 검증 대상 (4가지)

### 1. Summary Daily (금융시장 요약)
- **URL**: `/report/daily/summary/{uuid}`
- **Theme**: GENERAL
- **목적**: 금융시장의 주요 지표, 뉴스, 트렌드를 한눈에 보여주는 종합 리포트

### 2. AI Daily (AI 관련)
- **URL**: `/report/daily/{uuid}`
- **Theme**: AI
- **목적**: AI 산업 동향, 관련 뉴스, 데이터 분석

### 3. Dividend Daily (배당 관련)
- **URL**: `/report/daily/{uuid}`
- **Theme**: DIVIDEND
- **목적**: 배당주 관련 뉴스, 데이터, 분석

### 4. Forex Daily (환율 관련)
- **URL**: `/report/daily/{uuid}`
- **Theme**: FOREX
- **목적**: 환율 동향, 글로벌 통화 정보, 분석

---

## 체크 항목 상세 설명 (10가지)

각 체크는 **무엇을 확인하는지**, **언제 실패하는지**, **실패했을 때 의미**를 중심으로 설명합니다.

### 1. no_empty_page (빈 페이지 체크)

**무엇을 확인하나?**
- 페이지에 실제 텍스트 콘텐츠가 충분히 있는지 확인

**기준**
- Summary Daily: 1,000자 이상
- AI/Dividend/Forex Daily: 500자 이상

**실패 의미**
- 페이지가 완전히 비어있음
- 렌더링 실패
- 콘텐츠 로딩 실패

**대응 방법**
- 리포트 생성 파이프라인 확인
- 프론트엔드 로그에서 렌더링 에러 검색

---

### 2. no_error_text (에러 메시지 부재 체크)

**무엇을 확인하나?**
- 페이지에 에러 메시지가 표시되고 있지는 않은지 검사

**감지하는 에러 패턴**
- "에러가 발생"
- "데이터를 불러올 수 없습니다"
- "페이지를 찾을 수 없습니다"
- "Something went wrong" (AI/Dividend/Forex만)

> **참고**: 영문 패턴(Error, 404, 500)은 금융 데이터에서 오탐이 발생하여 제거됨

**실패 의미**
- 사용자에게 에러 메시지가 표시 중
- 데이터 로드 실패
- 페이지 조회 권한 문제

**대응 방법**
- 백엔드 로그에서 API 에러 확인
- 데이터베이스 연결 상태 확인

---

### 3. no_console_errors (JS 콘솔 에러 부재 체크)

**무엇을 확인하나?**
- 브라우저의 JavaScript 콘솔에 런타임 에러가 없는지 검사

**실패 의미**
- 프론트엔드 코드에서 JavaScript 에러 발생
- 의존성 라이브러리 문제
- 브라우저 호환성 문제

**대응 방법**
- 개발자 도구 콘솔(F12)에서 에러 메시지 확인
- 최신 프론트엔드 배포 버전 확인

---

### 4. chart_rendered (차트 렌더링 체크)

**무엇을 확인하나?**
- 페이지에 차트나 그래프 이미지가 실제로 렌더링되었는지 확인

**확인 방식**
- **Summary**: canvas, svg, img[src*='chart'] 요소 검사
- **AI/Dividend/Forex**: GCS 호스팅 이미지 (section 4번째의 img 태그)

**실패 의미**
- 차트가 로드되지 않음
- 이미지 호스팅 서버 연결 실패
- 차트 생성 파이프라인 오류

**대응 방법**
- GCS 버킷 접근성 확인
- 백엔드 차트 생성 서비스 로그 확인
- 네트워크 연결 상태 확인

---

### 5. section_exists (필수 섹션 존재 체크)

**무엇을 확인하나?**
- 리포트에 필수 섹션들이 모두 존재하는지 확인

**Summary의 필수 섹션 (8개)**
1. 금융시장 키워드
2. 주요 뉴스
3. 시장 추세 그래프
4. 글로벌 지수
5. 환율 동향
6. 원자재 가격
7. AI 인사이트
8. 유의 사항

**AI/Dividend/Forex의 필수 섹션 (4개)**
1. 주요 뉴스
2. 전망과 분석
3. 데이터 테이블
4. 그래프 데이터

**실패 의미**
- 리포트 구조가 깨짐
- 섹션 컴포넌트 로딩 실패
- 데이터 소스 연결 문제

**대응 방법**
- 백엔드 리포트 조합 API 확인
- 각 섹션의 데이터 제공 서비스 상태 확인

---

### 6. element_count_min (최소 요소 개수 체크)

**무엇을 확인하나?**
- 데이터 테이블에 최소한의 행(row)이 있는지 확인

**기준**
- **Summary**:
  - 글로벌 지수: 6행 이상
  - 환율: 5행 이상
  - 원자재: 5행 이상
- **AI Daily**: 종목 데이터 6행 이상
- **Dividend Daily**: 5행 이상
- **Forex Daily**: 8행 이상

**실패 의미**
- 테이블 데이터가 부족함
- 데이터 크롤링/로드 실패
- 일부 데이터 소스 미연결

**대응 방법**
- 해당 리포트의 데이터 제공 서비스 상태 확인
- 크롤링 작업 로그 확인
- 외부 API 연결 상태 확인

---

### 7. content_not_empty (콘텐츠 비어있지 않음 체크)

**무엇을 확인하나?**
- 특정 섹션(뉴스, 분석 등)에 실제 콘텐츠가 있는지 확인

**기준 예시**
- **뉴스 섹션**: 100자 이상 + 항목 3~8개 이상
- **분석 섹션**: 최소 텍스트 길이 충족 + 항목 수 충족

**실패 의미**
- 뉴스 수집 실패
- 분석 생성 실패
- 섹션이 비어있음

**대응 방법**
- 뉴스 크롤링 파이프라인 상태 확인
- LLM 분석 서비스 로그 확인
- 해당 날짜의 뉴스 데이터 존재 여부 확인

---

### 8. table_structure (테이블 구조 체크)

**상태**: 현재 미사용 (element_count_min으로 대체)

**목적**: HTML table 요소의 행/열 수를 검증

**참고**: 현재 리포트가 `<table>` 요소 대신 `<div>` 기반 레이아웃을 사용하고 있어 이 체크는 활성화되지 않음

---

### 9. no_empty_cells (빈 셀 체크)

**상태**: 현재 미사용 (content_not_empty로 대체)

**목적**: 테이블 셀이 비어있지 않은지 확인

**참고**: 데이터 빈 셀은 content_not_empty 체크로 커버됨

---

### 10. element_exists (요소 존재 체크)

**무엇을 확인하나?**
- 특정 CSS 선택자(selector)로 정의된 요소가 존재하는지 확인

**자동 사용 상황**
- 해당 날짜 리포트가 아직 생성되지 않았을 때
- UUID를 DB에서 찾을 수 없을 때

**실패 의미**
- 오늘 리포트가 생성되지 않음
- 리포트 생성 파이프라인 미실행

**대응 방법**
- 리포트 생성 스케줄러 상태 확인
- 리포트 생성 작업 로그 검토

---

## 상태 판정 기준

### 상태 분류

| 상태 | 조건 | 의미 |
|------|------|------|
| **healthy** (정상) | 모든 체크 통과 | 리포트가 정상 렌더링 중 |
| **degraded** (저하) | 일부 체크 실패 (50% 이하) | 일부 기능에 문제가 있지만 사용 가능 |
| **broken** (장애) | 50% 초과 실패 또는 에러 발생 | 리포트 접근 불가 또는 주요 기능 오작동 |

### 예시

```
Summary Daily 체크 결과:
- 총 20개 체크 중 18개 통과 → healthy ✅
- 총 20개 체크 중 12개 통과, 8개 실패 → degraded ⚠️
- 총 20개 체크 중 8개 통과, 12개 실패 → broken ❌
```

---

## 검증 대상별 체크 요약표

| 체크 항목 | Summary | AI | Dividend | Forex |
|-----------|---------|-----|----------|-------|
| no_empty_page | 1,000자 | 500자 | 500자 | 500자 |
| no_error_text | ✅ | ✅ | ✅ | ✅ |
| no_console_errors | ✅ | ✅ | ✅ | ✅ |
| chart_rendered | canvas/svg/img | img (sec4) | img (sec4) | img (sec4) |
| section_exists | 8개 | 4개 | 4개 | 4개 |
| element_count_min | 3개 | 1개 | 1개 | 1개 |
| content_not_empty | 5개 | 3개 | 2개 | 2개 |
| **총 체크 수** | **20개** | **12개** | **11개** | **11개** |

---

## 인증 플로우

UI 체크가 시작되면 자동으로 IBK 시스템에 로그인합니다.

### 로그인 과정

1. **로그인 페이지 접속**: `https://ibk.onelineai.com/login`
2. **자격증명 입력**: 환경변수에서 읽은 계정/비밀번호 자동 입력
3. **로그인 버튼 클릭**: 자동 클릭
4. **성공 확인**: "로그아웃" 버튼 표시 대기 (최대 15초)
5. **세션 저장**: 로그인 상태(쿠키, localStorage)를 `playwright-auth-state.json`에 저장

### 인증 상태

- **authSucceeded: true** → 로그인 성공, 모든 체크 정상 진행
- **authSucceeded: false** → 로그인 실패, 모든 리포트 체크 불가

---

## API 엔드포인트

### 수동 실행

```
POST /api/report-monitoring/ui-check
```
체크를 즉시 실행합니다.

**응답 예시**:
```json
{
  "results": [
    {
      "targetId": "summary-daily",
      "targetName": "Summary Daily",
      "status": "healthy",
      "passedCount": 20,
      "failedCount": 0
    }
  ],
  "summary": {
    "totalTargets": 4,
    "healthyTargets": 4,
    "degradedTargets": 0,
    "brokenTargets": 0
  },
  "authSucceeded": true
}
```

### 마지막 결과 조회

```
GET /api/report-monitoring/ui-check/status
```
가장 최근에 실행한 체크 결과를 반환합니다.

### 이력 조회

```
GET /api/report-monitoring/ui-check/history?limit=20&offset=0&hasIssues=false
```
과거 체크 결과 목록을 조회합니다.

**파라미터**:
- `limit`: 한 번에 조회할 결과 수 (기본값: 20)
- `offset`: 시작 위치 (기본값: 0)
- `hasIssues`: `true`면 문제가 있는 결과만, `false`면 모두 조회

### 상세 이력 조회

```
GET /api/report-monitoring/ui-check/history/{id}
```
특정 체크 실행의 상세 결과를 조회합니다.

### 서비스 상태 확인

```
GET /api/report-monitoring/ui-check/health
```
UI 체크 서비스의 현재 상태를 반환합니다.

**응답 예시**:
```json
{
  "enabled": true,
  "isRunning": false,
  "lastCheckAt": "2026-02-09T08:35:00Z",
  "lastCheckHadIssues": false,
  "browserAvailable": true
}
```

### 스케줄러 수동 트리거

```
POST /api/report-monitoring/ui-check/trigger
```
매일 오전 8:30에 자동으로 실행되는 체크를 수동으로 실행합니다.

---

## 스케줄

### 자동 실행

- **실행 시간**: 매일 오전 8:30 (한국 시간 / Asia/Seoul)
- **크론 표현식**: `30 8 * * *`
- **빈도**: 1회/일

### 실행 기록

- 모든 실행 기록은 데이터베이스에 저장됩니다
- API를 통해 언제든지 과거 결과를 조회할 수 있습니다

---

## 문제 해결 가이드

### 문제 1: "오늘 리포트가 생성되지 않았습니다"

**증상**
```
원인: 리포트 생성 여부 체크 - FAIL
메시지: "오늘 리포트가 생성되지 않았습니다 (theme: GENERAL, UUID 미발견)"
```

**원인**
- 리포트 생성 파이프라인이 아직 실행되지 않음
- 리포트 생성 작업이 실패함

**확인 사항**
- [ ] 현재 시간이 리포트 생성 시간 이후인가? (보통 오전 7시경)
- [ ] 리포트 생성 스케줄러 상태 확인
- [ ] 백엔드 로그에서 "report generation" 검색

**대응 방법**
```bash
# 백엔드 로그 확인
docker logs <backend-container> | grep -i "report"

# 필요시 리포트 생성 수동 트리거
curl -X POST http://localhost:3000/api/admin/batch-analysis/jobs/{jobId}/run
```

---

### 문제 2: 인증 실패 (authSucceeded: false)

**증상**
```
모든 리포트가 "broken" 상태
authSucceeded: false
```

**원인**
- 로그인 자격증명 오류
- IBK 서버 접근 불가
- 환경변수 미설정

**확인 사항**
- [ ] `UI_CHECK_USERNAME` 환경변수 설정 확인
- [ ] `UI_CHECK_PASSWORD` 환경변수 설정 확인
- [ ] IBK 로그인 페이지 접근 가능한지 확인
- [ ] 계정이 잠금되지 않았는지 확인

**대응 방법**
```bash
# 환경변수 확인
echo $UI_CHECK_USERNAME
echo $UI_CHECK_PASSWORD

# 환경변수 수정 후 백엔드 재시작 (필수!)
export UI_CHECK_USERNAME="correct-username"
export UI_CHECK_PASSWORD="correct-password"
# 여기서 백엔드 프로세스를 완전히 재시작해야 함
pm2 restart backend
```

**주의**: 환경변수 변경 후에는 **반드시 NestJS 백엔드 프로세스를 완전히 재시작**해야 변경 사항이 반영됩니다.

---

### 문제 3: chart_rendered FAIL

**증상**
```
체크: 차트 렌더링 - FAIL
메시지: "No chart elements found"
```

**원인**
- GCS 이미지 호스팅 서버 연결 실패
- 차트 생성 파이프라인 오류
- 이미지 파일 생성 실패

**확인 사항**
- [ ] GCS (Google Cloud Storage) 버킷 접근 가능한가?
- [ ] 서비스 계정 권한 확인
- [ ] 차트 생성 서비스 로그 확인

**대응 방법**
```bash
# GCS 접근성 테스트
gsutil ls gs://your-bucket-name/

# 백엔드 차트 생성 로그
docker logs <backend-container> | grep -i "chart"
```

---

### 문제 4: content_not_empty FAIL (뉴스 섹션)

**증상**
```
체크: 섹션: 주요 뉴스 - FAIL
메시지: "섹션: 주요 뉴스: 45자 (최소 100)"
```

**원인**
- 뉴스 크롤링 작업이 데이터를 수집하지 못함
- 해당 날짜에 뉴스가 없음
- 뉴스 API 연결 실패

**확인 사항**
- [ ] 뉴스 크롤링 서비스 상태 확인
- [ ] 외부 뉴스 API 연결 상태 확인
- [ ] 해당 날짜에 실제 뉴스가 있는가?

**대응 방법**
```bash
# 뉴스 크롤링 수동 실행
curl -X POST http://localhost:3000/api/admin/news/crawl \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-02-09"}'

# 뉴스 데이터 조회
curl http://localhost:3000/api/admin/news?date=2026-02-09
```

---

### 문제 5: 모든 타겟 broken (전체 장애)

**증상**
```
healthyTargets: 0
brokenTargets: 4
authSucceeded: false (또는 콘솔 에러 대량 발생)
```

**원인**
- 인증 실패
- 네트워크 연결 차단
- IBK 서버 다운
- 브라우저 샌드박스 문제

**확인 사항**
- [ ] 인증 상태 확인 (위의 "문제 2" 참고)
- [ ] 네트워크 연결 확인
- [ ] IBK 서버 상태 확인

**대응 방법**
```bash
# 인증 상태 확인
curl -X POST http://localhost:3000/api/report-monitoring/ui-check

# 스크린샷 확인 (앱 스크린샷 폴더)
ls -lh apps/backend/screenshots/

# 백엔드 로그 전체 확인
docker logs <backend-container> | tail -100
```

---

## 알림 및 모니터링

### Slack 알림

체크 결과에 **degraded** 또는 **broken** 타겟이 있으면 자동으로 Slack으로 알림이 발송됩니다.

**알림 내용**
- 전체 타겟 수 및 상태별 분류
- 각 타겟별 실패 항목 (category별 그룹핑)
  - 📋 구조 문제
  - 📝 콘텐츠 부족
  - 🖥️ 렌더링 오류
  - ⚠️ 에러 메시지
- 체크 소요 시간
- 인증 성공 여부

---

## 대시보드에서 확인하기

### UI 체크 결과 페이지

1. 관리자 대시보드 접속
2. "Report Monitoring" → "UI Check" 메뉴
3. 최신 체크 결과 확인
4. "이력 조회" 탭에서 과거 결과 검색

### 상세 정보 확인

- 각 리포트의 체크 결과 클릭
- 실패한 체크 항목 및 메시지 확인
- 필요시 스크린샷 확인 (broken 상태일 때만 저장)

---

## 환경 설정

### 필수 환경변수

```env
# UI 체크 활성화
UI_CHECK_ENABLED=true

# IBK 로그인 자격증명
UI_CHECK_USERNAME=your-username
UI_CHECK_PASSWORD=your-password

# 선택사항: 스크린샷 저장 경로
UI_CHECK_SCREENSHOT_DIR=/app/screenshots
```

### 설정 파일

`config/ui-checks.json` 파일에서 체크 항목을 관리합니다.

**구조**:
```json
{
  "auth": { /* 로그인 설정 */ },
  "defaults": { /* 기본 타임아웃, viewport 등 */ },
  "targets": [
    {
      "id": "summary-daily",
      "name": "Summary Daily",
      "url": "https://ibk.onelineai.com/report/daily/summary/...",
      "theme": "GENERAL",
      "checks": [ /* 체크 항목 */ ]
    }
  ]
}
```

---

## 운영팀 체크리스트

### 일일 확인 사항

- [ ] 오전 8:35 경 UI 체크 실행 완료 확인
- [ ] 모든 타겟이 "healthy" 상태인가?
- [ ] Slack 알림 수신 여부 확인

### 주간 확인 사항

- [ ] 일주일 동안 이슈 이력 검토
- [ ] 자주 발생하는 문제 패턴 파악
- [ ] 필요시 리포트 생성 파이프라인 최적화

### 월간 확인 사항

- [ ] 전월 UI 체크 통계 리포트 작성
- [ ] 신규 리포트 추가 시 체크 항목 설정 검토
- [ ] 인증서 갱신 필요성 확인

---

## 추가 정보

### 기술 문서

- 백엔드 구현: `apps/backend/src/report-monitoring/ui-check.service.ts`
- 설정 파일: `config/ui-checks.json`
- 타입 정의: `apps/backend/src/report-monitoring/interfaces/`

### 연락처

- 개발팀: [담당 개발자 연락처]
- 운영팀: [운영팀 연락처]
- 긴급 문제: [긴급 연락처]

### 자주 묻는 질문 (FAQ)

**Q: UI 체크를 수동으로 실행할 수 있나?**
A: 네. 대시보드의 "UI Check" 페이지에서 "지금 실행" 버튼을 클릭하거나 API를 통해 실행할 수 있습니다.

**Q: 과거 결과를 다운로드할 수 있나?**
A: 현재는 웹 인터페이스 조회만 가능합니다. 데이터는 데이터베이스에 저장되므로 필요시 개발팀에 요청하면 CSV 형식으로 추출해드립니다.

**Q: 알림 채널을 변경할 수 있나?**
A: Slack 이외 다른 채널(이메일, SMS 등)로의 알림은 현재 미지원입니다. 필요시 개발팀에 요청하면 추가 구현 가능합니다.

**Q: 체크 항목을 커스터마이징할 수 있나?**
A: 가능합니다. `config/ui-checks.json` 파일을 수정하면 새로운 체크 항목을 추가하거나 기존 항목을 변경할 수 있습니다. 변경 후 백엔드를 재시작해야 적용됩니다.

---

## 버전 정보

- **문서 버전**: 1.0
- **작성일**: 2026-02-09
- **마지막 수정**: 2026-02-09
- **대상 독자**: 운영팀, 비개발자
