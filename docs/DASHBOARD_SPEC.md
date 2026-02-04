# OLA B2B 모니터링 대시보드 명세서

> 최종 갱신: 2026-02-04
>
> 이 문서는 OLA B2B 모니터링 시스템의 모든 대시보드 페이지에 대해 표시 데이터, 모니터링 대상, 출력 조건을 정리한 명세서입니다.

---

## 목차

- [1. 일반 대시보드](#1-일반-대시보드)
  - [1.1 비즈니스 대시보드](#11-비즈니스-대시보드)
  - [1.2 운영 대시보드](#12-운영-대시보드)
  - [1.3 품질 분석 대시보드](#13-품질-분석-대시보드)
  - [1.4 챗봇 품질 대시보드](#14-챗봇-품질-대시보드)
  - [1.5 AI 성능 대시보드](#15-ai-성능-대시보드)
  - [1.6 LLM 분석 (대화형)](#16-llm-분석-대화형)
  - [1.7 리포트 모니터링](#17-리포트-모니터링)
  - [1.8 사용자 분석](#18-사용자-분석)
  - [1.9 사용자 상세 프로필](#19-사용자-상세-프로필)
  - [1.10 ETL Minkabu](#110-etl-minkabu)
  - [1.11 ETL Wind](#111-etl-wind)
- [2. 관리자 대시보드](#2-관리자-대시보드)
  - [2.1 사용자 관리](#21-사용자-관리)
  - [2.2 역할 관리](#22-역할-관리)
  - [2.3 필터 관리](#23-필터-관리)
  - [2.4 배치 분석 허브](#24-배치-분석-허브)
  - [2.5 이슈 빈도 분석](#25-이슈-빈도-분석)
  - [2.6 프롬프트 템플릿 관리](#26-프롬프트-템플릿-관리)
  - [2.7 스케줄 관리](#27-스케줄-관리)
  - [2.8 문제 채팅 규칙 관리](#28-문제-채팅-규칙-관리)
- [3. 공통 기반](#3-공통-기반)

---

## 1. 일반 대시보드

### 1.1 비즈니스 대시보드

| 항목 | 내용 |
|------|------|
| **경로** | `/dashboard/business` |
| **프론트엔드** | `apps/frontend-next/src/app/dashboard/business/page.tsx` |
| **목적** | 테넌트별 LLM 토큰 사용량, 비용 트렌드, 시간대별 이용 패턴을 비즈니스 관점에서 모니터링 |

#### 표시 데이터

| 구분 | 항목 | 설명 |
|------|------|------|
| **KPI 카드** | 총 토큰 | 조회 기간 내 전체 토큰 사용량 합계 |
| | 예상 비용 | `총 토큰 × 토큰당 단가` 기반 비용 추정 |
| | 총 요청 수 | BigQuery 로그 건수 |
| | 활성 테넌트 | 기간 내 1건 이상 요청한 고유 tenant_id 수 |
| **파이 차트** | 테넌트별 토큰 사용량 | `TenantPieChart` — tenant_id 기준 토큰 비율 |
| **라인 차트** | 일별 비용 트렌드 | `CostTrendChart` — 날짜별 `SUM(total_tokens) × 단가` |
| **히트맵** | 시간대별 사용량 | `UsageHeatmap` — 요일(Y축) × 시간(X축) 매트릭스 |
| **테이블** | 테넌트 상세 현황 | tenant_id, 요청 수, 총 토큰, 평균 토큰, 에러율 |

#### 데이터 소스

| API 엔드포인트 | BigQuery 로직 |
|---------------|---------------|
| `GET /projects/{projectId}/api/analytics/tenant-usage?days={days}` | `GROUP BY tenant_id, DATE(timestamp)` |
| `GET /projects/{projectId}/api/analytics/cost-trend?days={days}` | `SUM(CAST(total_tokens AS FLOAT64)) * cost_per_token` per day |
| `GET /projects/{projectId}/api/analytics/heatmap?days={days}` | `GROUP BY EXTRACT(DAYOFWEEK FROM timestamp), EXTRACT(HOUR FROM timestamp)` |
| `GET /projects/{projectId}/api/metrics/realtime?days={days}` | 최근 24시간 집계 KPI |

#### 필터/조건

| 필터 | 기본값 | 설명 |
|------|--------|------|
| **날짜 범위** | 30일 (month) | `DateRangeFilter` 컴포넌트로 day/week/month/custom 선택 |
| **프로젝트** | `ibks` | URL 파라미터 기반 프로젝트 식별 |

#### 갱신 주기

- 자동 새로고침: **없음** (수동 갱신)
- 백엔드 캐시: MEDIUM (15분)

---

### 1.2 운영 대시보드

| 항목 | 내용 |
|------|------|
| **경로** | `/dashboard/operations` |
| **프론트엔드** | `apps/frontend-next/src/app/dashboard/operations/page.tsx` |
| **목적** | 실시간 시스템 상태, 트래픽, 에러율을 운영 관점에서 모니터링 |

#### 표시 데이터

| 구분 | 항목 | 설명 |
|------|------|------|
| **KPI 카드** | 총 요청 수 | 조회 기간 내 전체 요청 건수 |
| | 에러율 | `COUNTIF(success=FALSE) / COUNT(*)` 비율 |
| | 평균 토큰 | 요청당 평균 total_tokens |
| | 활성 테넌트 | 고유 tenant_id 수 |
| **라인 차트** | 시간별 트래픽 | `RealtimeTrafficChart` — 시간 단위 요청 수 추이 |
| **게이지** | 서비스 가용성 | `ErrorGauge` — 성공률 % 게이지 |
| **상태 표시** | 시스템 헬스 | BigQuery 연결, NestJS API, In-Memory Cache 상태 |

#### 데이터 소스

| API 엔드포인트 | BigQuery 로직 |
|---------------|---------------|
| `GET /projects/{projectId}/api/metrics/realtime?days={days}` | 최근 24시간 기본 KPI 집계 |
| `GET /projects/{projectId}/api/metrics/hourly?days={days}` | `GROUP BY TIMESTAMP_TRUNC(timestamp, HOUR)` |

#### 필터/조건

| 필터 | 기본값 | 설명 |
|------|--------|------|
| **날짜 범위** | 1일 (day) | 운영 모니터링 특성상 최근 24시간 기본 |

#### 갱신 주기

- 자동 새로고침: **5분마다**
- 백엔드 캐시: SHORT (5분)

---

### 1.3 품질 분석 대시보드

| 항목 | 내용 |
|------|------|
| **경로** | `/dashboard/quality` |
| **프론트엔드** | `apps/frontend-next/src/app/dashboard/quality/page.tsx` |
| **목적** | 챗봇 응답의 토큰 효율성, 질문-응답 상관관계, 반복 패턴을 분석하여 서비스 품질 추적 |

#### 표시 데이터

| 구분 | 항목 | 설명 |
|------|------|------|
| **KPI 카드** | 평균 효율성 | `AVG(output_tokens / input_tokens)` — 토큰 효율 비율 |
| | 총 요청 | 조회 기간 내 전체 건수 |
| | 평균 응답 길이 | 평균 output_tokens |
| | FAQ 후보 수 | 반복 패턴 5회 이상 질문 수 |
| **라인 차트** | 토큰 효율성 추세 | `TokenEfficiencyTrendChart` — 일별 효율성 변화 |
| **산점도** | 질문-응답 상관관계 | `QueryResponseScatterPlot` — input_tokens(X축) vs output_tokens(Y축) |
| **테이블** | 반복 질문 패턴 | `RepeatedQueriesTable` — query_pattern, 발생 횟수, 평균 output_tokens, 최초/최근 발생일 |
| **섹션** | FAQ 분석 | `FAQAnalysisSection` — FAQ 클러스터링 결과 |

#### 데이터 소스

| API 엔드포인트 | BigQuery 로직 |
|---------------|---------------|
| `GET /projects/{projectId}/api/quality/efficiency-trend?days={days}` | `AVG(CAST(output_tokens AS FLOAT64) / CAST(input_tokens AS FLOAT64))` per day |
| `GET /projects/{projectId}/api/quality/query-response-correlation?days={days}` | input_tokens vs output_tokens 샘플 데이터 |
| `GET /projects/{projectId}/api/quality/repeated-patterns?days={days}` | `GROUP BY LOWER(TRIM(user_input))` WHERE `COUNT(*) > 5` |

#### 필터/조건

| 필터 | 기본값 | 설명 |
|------|--------|------|
| **날짜 범위** | 30일 (month) | 장기 트렌드 분석 기본값 |

#### 갱신 주기

- 자동 새로고침: **15분마다**
- 백엔드 캐시: MEDIUM (15분)

---

### 1.4 챗봇 품질 대시보드

| 항목 | 내용 |
|------|------|
| **경로** | `/dashboard/chatbot-quality` |
| **프론트엔드** | `apps/frontend-next/src/app/dashboard/chatbot-quality/page.tsx` |
| **목적** | 사용자 감정(불만/긴급), 신규 패턴, 재질문, 세션 성공률 등 챗봇 대화 품질을 심층 분석 |

#### 표시 데이터

| 구분 | 항목 | 설명 |
|------|------|------|
| **KPI 카드** | 불만 표현 쿼리 | 감정 분석에서 FRUSTRATED/EMOTIONAL/URGENT로 분류된 건수 |
| | 신규 패턴 | 최근 기간에 새로 등장한 질문 패턴 수 |
| | 세션 성공률 | 해결된 세션 비율 (감사 표현 등 휴리스틱 기반) |
| | 평균 불만율 | 전체 대비 불만 감정 비율 |
| **테이블 1** | 신규 패턴 | normalizedQuery, 패턴 유형, 최근 빈도, 성장률 |
| **테이블 2** | 감정 분석 | timestamp, sentimentFlag (FRUSTRATED/EMOTIONAL/URGENT/NEUTRAL), user_input, 성공 여부 |
| **테이블 3** | 재질문 패턴 | sessionId, 질문 횟수, 유사도 점수, 해결 여부 |
| **테이블 4** | 테넌트 품질 요약 | 총 세션, 세션 성공률, 불만율, 평균 턴 수 |

#### 데이터 소스

| API 엔드포인트 | 로직 |
|---------------|------|
| `GET /projects/{projectId}/api/quality/emerging-patterns?days={days}&comparisonDays={days*4}` | 최근 7일 패턴 vs 과거 기간 비교 → 성장률 계산 |
| `GET /projects/{projectId}/api/quality/sentiment?days={days}` | user_input 패턴 매칭 (`짜증`, `왜`, `환불`, `frustrated` 등) |
| `GET /projects/{projectId}/api/quality/rephrased-queries?days={days}` | 동일 session_id 내 유사 질문 (Levenshtein distance 기반) |
| `GET /projects/{projectId}/api/quality/tenant-summary?days={days}` | 테넌트별 세션/불만율 집계 |

#### 감정 분류 조건

| 감정 플래그 | 탐지 조건 |
|------------|----------|
| `FRUSTRATED` | 사용자 입력에 `짜증`, `왜 안`, `frustrated`, `angry` 등 패턴 포함 |
| `EMOTIONAL` | 감정적 표현 패턴 탐지 |
| `URGENT` | 긴급한 요청 패턴 (`급해`, `urgent`, `ASAP` 등) |
| `NEUTRAL` | 위 패턴에 해당하지 않는 일반 질문 |

#### 필터/조건

| 필터 | 기본값 | 설명 |
|------|--------|------|
| **날짜 범위** | 7일 (week) | 최근 품질 변화 탐지에 적합 |

#### 갱신 주기

- 자동 새로고침: 없음 (React Query staleTime: 5분 캐시)
- 백엔드 캐시: SHORT (5분)

---

### 1.5 AI 성능 대시보드

| 항목 | 내용 |
|------|------|
| **경로** | `/dashboard/ai-performance` |
| **프론트엔드** | `apps/frontend-next/src/app/dashboard/ai-performance/page.tsx` |
| **목적** | LLM 토큰 분포, 이상 탐지(Z-Score), 성능 최적화 권고사항 모니터링 |

#### 표시 데이터

| 구분 | 항목 | 설명 |
|------|------|------|
| **KPI 카드** | 평균 효율성 | output_tokens / input_tokens 비율 |
| | 평균 토큰/요청 | 요청당 평균 total_tokens |
| | 응답 성공률 | `COUNTIF(success=TRUE) / COUNT(*)` |
| | P99 토큰 | 상위 1% 토큰 사용량 (99번째 백분위) |
| **산점도** | 입출력 토큰 분포 | `TokenScatterPlot` — input_tokens(X) vs output_tokens(Y), 테넌트별 색상 구분 |
| **테이블** | 이상 탐지 통계 | tenant별 평균 토큰, 표준편차, P99, 샘플 수, 이상 임계값 |
| **섹션** | AI 모델 권고사항 | Z-Score 이상 탐지, Prophet/ARIMA 예측, K-Means 클러스터링 안내 |

#### 이상 탐지 로직

| 지표 | 산출 방식 | 임계값 |
|------|----------|--------|
| 이상 임계값 | `avg_tokens + 3 × stddev_tokens` | Z-Score > 3 시 이상으로 판정 |
| P99 토큰 | 99번째 백분위 값 | 상위 1% 초과 사용 탐지 |

#### 데이터 소스

| API 엔드포인트 | BigQuery 로직 |
|---------------|---------------|
| `GET /projects/{projectId}/api/ai/token-efficiency?days={days}` | 테넌트별 토큰 분포 통계 |
| `GET /projects/{projectId}/api/ai/anomaly-stats?days={days}` | `AVG`, `STDDEV`, `APPROX_QUANTILES` per tenant |

#### 필터/조건

| 필터 | 기본값 | 설명 |
|------|--------|------|
| **날짜 범위** | 7일 (week) | 이상 탐지 민감도에 적합한 기간 |

#### 갱신 주기

- 자동 새로고침: **15분마다**
- 백엔드 캐시: MEDIUM (15분)

---

### 1.6 LLM 분석 (대화형)

| 항목 | 내용 |
|------|------|
| **경로** | `/dashboard/analysis` |
| **프론트엔드** | `apps/frontend-next/src/app/dashboard/analysis/page.tsx` |
| **목적** | AI(Gemini)와의 대화형 인터페이스로 로그 데이터를 자연어로 분석 |

#### 표시 데이터

| 구분 | 항목 | 설명 |
|------|------|------|
| **사이드바** | 세션 목록 | 분석 세션 리스트 (제목, 메시지 수) |
| **채팅 영역** | 대화 이력 | 사용자 메시지(우측) ↔ AI 응답(좌측), Markdown 렌더링 |
| **메타데이터** | 응답 정보 | AI 응답별 토큰 수, 지연 시간(latency) |
| **토글** | 메트릭 포함 | 실시간 메트릭 데이터를 메시지에 첨부하는 옵션 |

#### 데이터 소스

| API 엔드포인트 | 설명 |
|---------------|------|
| `GET /api/admin/analysis/sessions` | 세션 목록 조회 |
| `GET /api/admin/analysis/sessions/{id}` | 세션 + 메시지 이력 |
| `POST /api/admin/analysis/sessions/{id}/chat` | 메시지 전송 → Gemini API → 응답 |
| `POST /api/admin/analysis/sessions` | 새 세션 생성 |
| `DELETE /api/admin/analysis/sessions/{id}` | 세션 삭제 |

#### 필터/조건

| 조건 | 설명 |
|------|------|
| **Include Current Metrics** | 체크 시 현재 시스템 메트릭을 LLM 컨텍스트에 포함 |
| **세션 선택** | 좌측 세션 목록에서 특정 세션 클릭하여 전환 |

#### 갱신 주기

- 자동 새로고침: 없음 (대화형 인터페이스)

---

### 1.7 리포트 모니터링

| 항목 | 내용 |
|------|------|
| **경로** | `/dashboard/report-monitoring` |
| **프론트엔드** | `apps/frontend-next/src/app/dashboard/report-monitoring/page.tsx` |
| **목적** | 금융 리포트(주식, 원자재, 환율, 배당) 데이터의 존재성, 완전성, 신선도, 의심값을 모니터링 |

#### 표시 데이터

| 구분 | 항목 | 설명 |
|------|------|------|
| **KPI 카드 (6개)** | 전체 리포트 수 | 모니터링 대상 전체 심볼 수 |
| | 정상 | 모든 검사를 통과한 리포트 수 |
| | 🔴 누락 | DB에 존재하지 않는 심볼 수 |
| | 🟠 불완전 | 필수 필드가 NULL인 심볼 수 |
| | 🟡 확인필요 | 값이 의심스러운(변동 없는) 심볼 수 |
| | ⚠️ 오래됨 | `updated_at`이 기준 시간을 초과한 심볼 수 |
| **테이블** | 리포트별 상태 | 리포트 타입별 totalTargets, missingSymbols, incompleteSymbols, suspiciousSymbols, staleSymbols |
| **상세** | 이슈 상세 | 심볼별 문제 분류 및 구체적 사유 (확장/축소 가능) |
| **시스템** | 스케줄러 상태 | DB 연결, cron 식, timezone, 다음 실행 시간, 타겟 파일 목록 |

#### 모니터링 대상 리포트 유형

| 리포트 타입 | 대상 | 검사 테이블 |
|------------|------|------------|
| `ai_stock` | AI 추천 종목 | `gold.daily_item_info` |
| `commodity` | 원자재 | `gold.daily_item_info` |
| `forex` | 환율 | `gold.daily_item_info` |
| `dividend` | 배당 | `gold.daily_item_info` |

#### 검사 조건 (Alert 로직)

| 검사 유형 | 조건 | 심각도 |
|----------|------|--------|
| **존재성 (Missing)** | 타겟 심볼이 DB에 없음 | 🔴 Critical |
| **완전성 (Incomplete)** | 필수 필드(price 등)가 NULL | 🟠 Critical |
| **의심값 (Suspicious)** | `prev_close == current_price` (변동 없음) | 🟡 Warning |
| **신선도 (Stale)** | `updated_at`이 기준 시간 초과 | ⚠️ Warning |

#### 데이터 소스

| API 엔드포인트 | 설명 |
|---------------|------|
| `GET /api/report-monitoring/health` | DB 연결 + 스케줄러 상태 |
| `GET /api/report-monitoring/status` | 최신 모니터링 결과 |
| `POST /api/report-monitoring/trigger` | 즉시 전체 체크 실행 |

#### 알림

- Slack 웹훅으로 Critical/Warning 알림 발송
- 스케줄러 기반 자동 체크 (기본: 매일 오전 9시 KST)

#### 갱신 주기

- 자동 새로고침: **5분마다**

---

### 1.8 사용자 분석

| 항목 | 내용 |
|------|------|
| **경로** | `/dashboard/user-analytics` |
| **프론트엔드** | `apps/frontend-next/src/app/dashboard/user-analytics/page.tsx` |
| **목적** | 개별 사용자별 활동량, 질문 패턴, 문제 채팅을 분석 |

#### 탭 구조

##### 탭 1: 사용자 (Users)

| 구분 | 항목 | 설명 |
|------|------|------|
| **KPI 카드** | 총 유저 | 기간 내 고유 `x_enc_data` 수 |
| | 총 질문 | 전체 요청 건수 |
| | 총 토큰 | 전체 토큰 사용량 합계 |
| | 평균 질문/유저 | 총 질문 ÷ 총 유저 |
| **테이블** | 유저 목록 | userId, 질문 수, 성공률, 총 토큰, 평균 토큰 |
| **테이블** | 유저 질문 패턴 | 선택된 유저의 질문 패턴, 발생 횟수, 고유 테넌트, 최초/최근 발생 |
| **모달** | 유저 활동 상세 | `UserActivityDialog` — 전체 대화 내역 |

##### 탭 2: 문제 채팅 (Problematic)

| 구분 | 항목 | 설명 |
|------|------|------|
| **KPI 카드** | 문제 채팅 수 | 규칙에 매칭된 총 건수 |
| | 상위 3 규칙 통계 | 가장 많이 탐지된 규칙 3개의 개별 건수 |
| **필터 칩** | 규칙 필터 | 활성화된 규칙별 토글 (ON/OFF) |
| **테이블** | 문제 채팅 목록 | userInput, 규칙명, 심각도, timestamp, 개선 제안 |
| **모달** | 상세 보기 | `ProblematicChatDialog` — 전체 대화 + 매칭된 규칙 상세 |

#### 데이터 소스

| API 엔드포인트 | BigQuery 로직 |
|---------------|---------------|
| `GET /projects/{projectId}/api/analytics/user-list?days={days}&limit={limit}` | `GROUP BY x_enc_data` 집계 |
| `GET /projects/{projectId}/api/analytics/user-patterns?userId={id}&days={days}` | 특정 유저의 `GROUP BY LOWER(TRIM(user_input))` |
| `GET /api/problematic-chat/rules` | 규칙 목록 (SQLite) |
| `GET /api/problematic-chat?days={days}&limit={limit}&ruleIds={ids}` | 규칙 기반 BigQuery WHERE 절 동적 생성 |
| `GET /api/problematic-chat/stats?days={days}` | 규칙별 매칭 건수 통계 |

#### 필터/조건

| 필터 | 기본값 | 설명 |
|------|--------|------|
| **날짜 범위** | 7일 (week) | |
| **규칙 필터** | 전체 선택 | 개별 규칙 ON/OFF 토글 |
| **유저 선택** | 없음 | 테이블에서 유저 클릭 시 패턴 로드 |

#### 갱신 주기

- 자동 새로고침: **15분마다**
- 백엔드 캐시: SHORT (5분)

---

### 1.9 사용자 상세 프로필

| 항목 | 내용 |
|------|------|
| **경로** | `/dashboard/user-analytics/{userId}` |
| **프론트엔드** | `apps/frontend-next/src/app/dashboard/user-analytics/[userId]/page.tsx` |
| **목적** | 특정 사용자의 행동 프로필, 감정 분석, 카테고리 분포를 상세 분석 |

#### 표시 데이터

| 구분 | 항목 | 설명 |
|------|------|------|
| **프로필 요약** | 행동 요약 | LLM이 생성한 사용자 행동 요약, 주요 관심사, 페인포인트 |
| **감정 분석** | 감정 분포 | 긍정/중립/부정 비율 (SentimentIndicator) |
| **카테고리** | 질문 카테고리 분포 | 키워드 기반 or LLM 기반 카테고리 분류 결과 |
| **모달** | 대화 내역 | 전체 대화 히스토리 열람 |

#### 데이터 소스

| API 엔드포인트 | 설명 |
|---------------|------|
| `GET /api/admin/user-profiling/{userId}?days={days}` | 프로필 + 감정 + 카테고리 통합 |
| `GET /projects/{projectId}/api/analytics/user-list` | 유저 기본 정보 매칭 |

#### 프로파일링 로직

| 분석 항목 | 방식 | 설명 |
|----------|------|------|
| **감정 분석** | `SentimentAnalysisService` | 사용자 입력 텍스트의 감정 분류 |
| **카테고리 분류 (Quick)** | 키워드 기반 | 즉시 분류, 낮은 정확도 |
| **카테고리 분류 (LLM)** | Gemini 배치 분석 | 높은 정확도, 지연 있음 |
| **행동 요약** | LLM 생성 | `behaviorSummary`, `mainInterests`, `painPoints` |

#### 필터/조건

| 필터 | 기본값 | 설명 |
|------|--------|------|
| **날짜 범위** | 7일 | 7/14/30일 선택 가능 |

---

### 1.10 ETL Minkabu

| 항목 | 내용 |
|------|------|
| **경로** | `/dashboard/etl/minkabu` |
| **프론트엔드** | `apps/frontend-next/src/app/dashboard/etl/minkabu/page.tsx` |
| **목적** | Minkabu 뉴스 크롤링 ETL 파이프라인의 실행 상태, 성공률, 수집 통계를 모니터링 |

#### 표시 데이터

| 구분 | 항목 | 설명 |
|------|------|------|
| **KPI 카드** | 총 실행 횟수 | 조회 기간 내 ETL 실행 건수 |
| | 성공률 | 성공 실행 / 전체 실행 비율 |
| | 평균 기사 수집 | 실행당 평균 수집 기사 수 |
| | 현재 상태 | 최근 실행의 상태 (성공/실패/진행중) |
| **영역 차트** | 일별 실행 트렌드 | 일별 실행 수 및 성공률 추이 |
| **막대 차트** | 헤드라인 수집 통계 | 오늘/어제 헤드라인 수집량 비교 |
| **테이블** | 최근 실행 기록 | id, 시작 시간, 상태, 오늘/어제 헤드라인, 수집 기사, 인덱스 수, 에러 수, 소요 시간 |
| **섹션** | 에러 분석 | errorMessage, 발생 횟수, 최초/최근 발생, 영향 받은 실행 수 |

#### 데이터 소스

| API 엔드포인트 | 설명 |
|---------------|------|
| `GET /api/etl/minkabu/summary?days={days}` | 기간별 요약 통계 |
| `GET /api/etl/minkabu/recent-runs?limit=10` | 최근 10개 실행 기록 |
| `GET /api/etl/minkabu/daily-trend?days={days}` | 일별 실행 트렌드 |
| `GET /api/etl/minkabu/headline-stats?days={days}` | 헤드라인 수집 통계 |
| `GET /api/etl/minkabu/error-analysis?days={days}` | 에러 분석 |
| `GET /api/etl/minkabu/health` | 시스템 상태 |

#### 필터/조건

| 필터 | 기본값 | 설명 |
|------|--------|------|
| **날짜 범위** | 7일 (week) | |

#### 갱신 주기

- 자동 새로고침: **5분마다**

---

### 1.11 ETL Wind

| 항목 | 내용 |
|------|------|
| **경로** | `/dashboard/etl/wind` |
| **프론트엔드** | `apps/frontend-next/src/app/dashboard/etl/wind/page.tsx` |
| **목적** | Wind 데이터 ETL 파이프라인의 실행 상태, 파일 처리 현황, 에러를 모니터링 |

#### 표시 데이터

| 구분 | 항목 | 설명 |
|------|------|------|
| **KPI 카드** | 총 실행 횟수 | 조회 기간 내 ETL 실행 건수 |
| | 성공률 | 성공 실행 / 전체 실행 비율 |
| | 평균 소요시간 | 실행당 평균 durationMs |
| | 현재 상태 | 최근 실행의 상태 |
| **영역 차트** | 일별 실행 트렌드 | 일별 실행 수 및 성공률 추이 |
| **막대 차트** | 파일 처리 통계 | 파일 처리 완료 vs 스킵 건수 |
| **테이블** | 최근 실행 기록 | id, 시작 시간, 상태, 처리/발견 파일, 삽입 레코드, 에러 수, 소요 시간 |
| **섹션** | 에러 분석 | errorMessage, 발생 횟수, 최초/최근 발생, 영향 받은 실행 수 |

#### 데이터 소스

| API 엔드포인트 | 설명 |
|---------------|------|
| `GET /api/etl/wind/summary?days={days}` | 기간별 요약 통계 |
| `GET /api/etl/wind/recent-runs?limit=10` | 최근 10개 실행 기록 |
| `GET /api/etl/wind/daily-trend?days={days}` | 일별 실행 트렌드 |
| `GET /api/etl/wind/file-stats?days={days}` | 파일 처리 통계 |
| `GET /api/etl/wind/error-analysis?days={days}` | 에러 분석 |
| `GET /api/etl/wind/health` | 시스템 상태 |

#### 필터/조건

| 필터 | 기본값 | 설명 |
|------|--------|------|
| **날짜 범위** | 7일 (week) | |

#### 갱신 주기

- 자동 새로고침: **5분마다**

---

## 2. 관리자 대시보드

> 관리자 대시보드는 JWT 인증 + RBAC 권한이 필요합니다.

### 2.1 사용자 관리

| 항목 | 내용 |
|------|------|
| **경로** | `/dashboard/admin/users` |
| **프론트엔드** | `apps/frontend-next/src/app/dashboard/admin/users/page.tsx` |
| **목적** | 시스템 사용자 CRUD 관리 (관리자, 분석가 등) |

#### 표시 데이터

| 구분 | 항목 | 설명 |
|------|------|------|
| **통계** | 총 사용자 / 활성 / 비활성 | 등록 사용자 현황 |
| **테이블** | 사용자 목록 | 상태 표시등, 이름, 이메일, 역할, 최종 로그인, 액션 |

#### 데이터 소스

| API 엔드포인트 | 설명 |
|---------------|------|
| `GET /api/admin/users` | 전체 사용자 목록 (역할 포함) |
| `POST /api/admin/users` | 사용자 생성 |
| `PUT /api/admin/users/{id}` | 사용자 수정 |
| `DELETE /api/admin/users/{id}` | 사용자 삭제 |

#### 필터/조건

| 필터 | 설명 |
|------|------|
| **검색** | 이름, 이메일, 역할명으로 클라이언트 사이드 필터링 |

---

### 2.2 역할 관리

| 항목 | 내용 |
|------|------|
| **경로** | `/dashboard/admin/roles` |
| **프론트엔드** | `apps/frontend-next/src/app/dashboard/admin/roles/page.tsx` |
| **목적** | RBAC 역할 및 권한 관리 |

#### 표시 데이터

| 구분 | 항목 | 설명 |
|------|------|------|
| **통계** | 총 역할 / 총 사용자 / 평균 사용자/역할 | |
| **카드 그리드** | 역할 카드 | 역할명, 설명, 사용자 수, 권한 목록 |

#### 데이터 소스

| API 엔드포인트 | 설명 |
|---------------|------|
| `GET /api/admin/roles` | 역할 목록 (권한 포함) |
| `GET /api/admin/users` | 역할별 사용자 수 계산용 |
| `POST/PUT/DELETE /api/admin/roles/{id}` | 역할 CRUD |

#### 필터/조건

| 필터 | 설명 |
|------|------|
| **검색** | 역할명, 설명으로 클라이언트 사이드 필터링 |

---

### 2.3 필터 관리

| 항목 | 내용 |
|------|------|
| **경로** | `/dashboard/admin/filters` |
| **프론트엔드** | `apps/frontend-next/src/app/dashboard/admin/filters/page.tsx` |
| **목적** | 대시보드 공통 필터 프리셋 관리 (날짜 범위, 테넌트, 심각도 등) |

#### 표시 데이터

| 구분 | 항목 | 설명 |
|------|------|------|
| **통계** | 총 필터 / 기본 필터명 / 날짜 범위 포함 수 | |
| **카드 그리드** | 필터 카드 | 필터명, 설명, 기본 필터 배지, 조건 미리보기 (날짜, 테넌트, 심각도, 토큰, 검색어) |

#### 데이터 소스

| API 엔드포인트 | 설명 |
|---------------|------|
| `GET /api/admin/filters` | 저장된 필터 목록 |
| `POST/PUT/DELETE /api/admin/filters/{id}` | 필터 CRUD |
| `PUT /api/admin/filters/{id}/default` | 기본 필터 설정 |

#### 저장되는 필터 조건

| 조건 | 타입 | 설명 |
|------|------|------|
| `dateRange` | `{start, end}` | 날짜 범위 |
| `tenants` | `string[]` | 테넌트 ID 목록 |
| `severities` | `string[]` | INFO/WARN/ERROR |
| `tokenRange` | `{min, max}` | 토큰 범위 |
| `searchQuery` | `string` | 검색어 |

---

### 2.4 배치 분석 허브

| 항목 | 내용 |
|------|------|
| **경로** | `/dashboard/admin/batch-analysis` |
| **프론트엔드** | `apps/frontend-next/src/app/dashboard/admin/batch-analysis/page.tsx` |
| **목적** | LLM 기반 채팅 품질 배치 분석, FAQ 분석, 세션 분석의 통합 허브 |

#### 탭 구조

##### 탭 1: 채팅 품질 분석 (Chat Quality)

| 구분 | 항목 | 설명 |
|------|------|------|
| **작업 목록** | 배치 작업 | 상태(PENDING/RUNNING/COMPLETED/FAILED), 대상 날짜, 테넌트, 진행률 |
| **작업 상세** | 분석 결과 | 대화별 점수 (quality, relevance, completeness, clarity / 각 1-10), 감정, 이슈, 개선 제안 |

**LLM 분석 결과 스키마:**

| 필드 | 타입 | 설명 |
|------|------|------|
| `quality_score` | 1-10 | 전반적 품질 점수 |
| `relevance` | 1-10 | 관련성 점수 |
| `completeness` | 1-10 | 완전성 점수 |
| `clarity` | 1-10 | 명확성 점수 |
| `issues` | string[] | 발견된 문제 목록 |
| `improvements` | string[] | 개선 제안 목록 |
| `sentiment` | enum | positive / neutral / negative |
| `summary` | string | 한 줄 요약 |

##### 탭 2: FAQ 분석 (FAQ Analysis)

| 구분 | 항목 | 설명 |
|------|------|------|
| **작업 목록** | FAQ 작업 | 상태, 기간, 클러스터 수 |
| **작업 상세** | FAQ 클러스터 | 대표 질문, 빈도, 변형 질문 수, LLM 사유 분석, 포함 질문 목록 |

**클러스터링 로직:**
1. BigQuery에서 빈도순 상위 1000개 user_input 조회
2. 텍스트 정규화 → 유사 질문 그룹핑
3. LLM 기반 의미적 유사 그룹 병합
4. 클러스터별 사유 분석 생성

##### 탭 3: 세션 분석 (Session Analysis)

| 구분 | 항목 | 설명 |
|------|------|------|
| **통계** | 세션 해결률, 평균 턴 수, 이탈률 | 전체 세션 통계 |
| **세션 목록** | 페이지네이션 테이블 | 세션ID, 턴 수, 해결 여부, 불만 여부 |
| **타임라인** | 대화 타임라인 | 턴별 사용자 입력 → AI 응답 시간순 표시 |

#### 데이터 소스

| API 엔드포인트 | 설명 |
|---------------|------|
| `GET/POST /api/admin/batch-analysis/jobs` | 배치 작업 목록/생성 |
| `POST /api/admin/batch-analysis/jobs/{id}/run` | 작업 실행 |
| `GET /api/admin/batch-analysis/results?jobId={id}&minAvgScore=&maxAvgScore=&sentiment=&hasIssues=` | 결과 조회 (필터) |
| `POST /api/quality/faq-analysis` | FAQ 분석 실행 |
| `GET /api/admin/session-analysis/stats` | 세션 통계 |
| `GET /api/admin/session-analysis/sessions` | 세션 목록 |
| `GET /api/admin/session-analysis/sessions/{id}/timeline` | 세션 타임라인 |

#### 필터/조건 (결과 조회 시)

| 필터 | 설명 |
|------|------|
| `minAvgScore` / `maxAvgScore` | 평균 점수 범위 (0-10) |
| `sentiment` | positive / neutral / negative |
| `hasIssues` | 이슈 존재 여부 (true/false) |
| `tenantId` | 테넌트 필터 |

#### 알림

- 품질 점수 < 5인 결과 → **Slack 알림** 자동 발송

#### 갱신 주기

- 작업 RUNNING 상태일 때: **5초마다** 자동 새로고침

---

### 2.5 이슈 빈도 분석

| 항목 | 내용 |
|------|------|
| **경로** | `/dashboard/admin/batch-analysis/issue-frequency` |
| **프론트엔드** | `apps/frontend-next/src/app/dashboard/admin/batch-analysis/issue-frequency/page.tsx` |
| **목적** | 배치 분석에서 발견된 이슈의 빈도를 집계하여 주요 문제 파악 |

#### 표시 데이터

| 구분 | 항목 | 설명 |
|------|------|------|
| **통계** | 총 이슈 / 분석 결과 수 / 고유 이슈 유형 | |
| **가로 막대 차트** | 이슈 빈도 | Recharts 막대 차트 — 이슈명별 발생 횟수 |
| **확장 목록** | 이슈 상세 | 이슈명, 건수, 비율, 샘플 결과 (user_input, tenant, 평균 점수) |

#### 데이터 소스

| API 엔드포인트 | 설명 |
|---------------|------|
| `GET /api/admin/batch-analysis/issue-frequency?tenantId=&startDate=&endDate=&limit=` | 이슈 빈도 집계 |
| `GET /api/admin/batch-analysis/tenants` | 사용 가능한 테넌트 목록 |

#### 필터/조건

| 필터 | 기본값 | 설명 |
|------|--------|------|
| **테넌트** | 전체 | 드롭다운 선택 |
| **시작일/종료일** | 없음 | 날짜 입력 필드 |
| **표시 개수** | 10 | 5/10/20/50 선택 |

---

### 2.6 프롬프트 템플릿 관리

| 항목 | 내용 |
|------|------|
| **경로** | `/dashboard/admin/batch-analysis/prompts` |
| **프론트엔드** | `apps/frontend-next/src/app/dashboard/admin/batch-analysis/prompts/page.tsx` |
| **목적** | LLM 배치 분석에 사용되는 프롬프트 템플릿 관리 |

#### 표시 데이터

| 구분 | 항목 | 설명 |
|------|------|------|
| **목록** | 템플릿 리스트 | 이름, 설명, 생성/수정일, 기본 배지 |
| **미리보기** | 프롬프트 텍스트 | 처음 500자 미리보기 |

#### 데이터 소스

| API 엔드포인트 | 설명 |
|---------------|------|
| `GET/POST/PUT/DELETE /api/admin/batch-analysis/prompts/{id}` | 템플릿 CRUD |

#### 템플릿 변수

| 변수 | 설명 |
|------|------|
| `{{user_input}}` | 사용자 질문 텍스트 |
| `{{llm_response}}` | LLM 응답 텍스트 |

#### 필수 출력 형식

```json
{
  "quality_score": "1-10",
  "relevance": "1-10",
  "completeness": "1-10",
  "clarity": "1-10",
  "issues": ["string"],
  "improvements": ["string"],
  "sentiment": "positive|neutral|negative",
  "summary": "string"
}
```

---

### 2.7 스케줄 관리

| 항목 | 내용 |
|------|------|
| **경로** | `/dashboard/admin/batch-analysis/schedules` |
| **프론트엔드** | `apps/frontend-next/src/app/dashboard/admin/batch-analysis/schedules/page.tsx` |
| **목적** | 배치 분석 자동 실행 스케줄 관리 (다중 스케줄 지원) |

#### 표시 데이터

| 구분 | 항목 | 설명 |
|------|------|------|
| **통계** | 총 스케줄 / 활성 / 비활성 | |
| **테이블** | 스케줄 목록 | 상태 토글, 이름, 실행 시간 (요일 포함), 대상 테넌트, 샘플 크기, 액션 |

#### 데이터 소스

| API 엔드포인트 | 설명 |
|---------------|------|
| `GET/POST/PUT/DELETE /api/admin/batch-analysis/schedules/{id}` | 스케줄 CRUD |
| `PUT /api/admin/batch-analysis/schedules/{id}/toggle` | 활성/비활성 토글 |
| `GET /api/admin/batch-analysis/prompts` | 사용 가능한 프롬프트 목록 |
| `GET /api/admin/batch-analysis/tenants` | 사용 가능한 테넌트 목록 |

#### 스케줄 설정 항목

| 필드 | 타입 | 설명 |
|------|------|------|
| `hour` | number | 실행 시간 (0-23) |
| `minute` | number | 실행 분 (0-59) |
| `daysOfWeek` | number[] | 요일 (0=일, 6=토). 표시: "매일", "평일" 등 |
| `timeZone` | string | 타임존 (기본: Asia/Seoul) |
| `targetTenantId` | string? | 대상 테넌트 (선택, 미지정 시 전체) |
| `sampleSize` | number | 분석할 채팅 샘플 수 |
| `promptTemplateId` | string | 사용할 프롬프트 템플릿 |

---

### 2.8 문제 채팅 규칙 관리

| 항목 | 내용 |
|------|------|
| **경로** | `/dashboard/admin/problematic-rules` |
| **프론트엔드** | `apps/frontend-next/src/app/dashboard/admin/problematic-rules/page.tsx` |
| **목적** | 문제 채팅 탐지를 위한 동적 규칙 엔진 관리 |

#### 표시 데이터

| 구분 | 항목 | 설명 |
|------|------|------|
| **테이블** | 규칙 목록 | 상태 토글, 규칙명, 필드(색상 배지), 조건, 설명, 액션 |

#### 필드 유형별 색상 코드

| 타입 | 색상 | 필드 예시 |
|------|------|----------|
| 숫자형 | 🟡 amber | `output_tokens`, `input_tokens`, `token_ratio` |
| 텍스트형 | 🔴 rose | `llm_response`, `user_input` |
| 불린형 | 🔵 cyan | `success` |

#### 데이터 소스

| API 엔드포인트 | 설명 |
|---------------|------|
| `GET /api/problematic-chat/rules` | 규칙 목록 |
| `POST /api/problematic-chat/rules` | 규칙 생성 |
| `PUT /api/problematic-chat/rules/{id}` | 규칙 수정 |
| `DELETE /api/problematic-chat/rules/{id}` | 규칙 삭제 |
| `PUT /api/problematic-chat/rules/{id}/toggle` | 활성/비활성 토글 |

#### 규칙 엔진 구성

| 설정 | 타입 | 설명 |
|------|------|------|
| `config.field` | string | BigQuery 필드명 |
| `config.operator` | enum | 비교 연산자 |
| `config.value` | mixed | 비교 값 (연산자에 따라 타입 변동) |

#### 사용 가능한 연산자

| 연산자 | 적용 대상 | 설명 | 입력 타입 |
|--------|----------|------|----------|
| `lt` / `lte` | 숫자 | 미만 / 이하 | number |
| `gt` / `gte` | 숫자 | 초과 / 이상 | number |
| `eq` / `neq` | 숫자/불린 | 같음 / 다름 | number/boolean |
| `contains` | 텍스트 | 포함 | string |
| `not_contains` | 텍스트 | 미포함 | string |
| `contains_any` | 텍스트 | 하나라도 포함 | string[] (쉼표 구분) |
| `in` | 텍스트 | 목록 내 포함 | string[] (쉼표 구분) |

#### BigQuery SQL 생성 예시

```sql
-- 숫자형: output_tokens < 1500
WHERE CAST(output_tokens AS FLOAT64) < 1500

-- 텍스트형: llm_response에 '죄송' 또는 '모르겠' 포함
WHERE (LOWER(llm_response) LIKE '%죄송%' OR LOWER(llm_response) LIKE '%모르겠%')

-- 불린형: 실패한 요청
WHERE success = FALSE
```

---

## 3. 공통 기반

### 3.1 BigQuery 테이블 스키마

| 필드 | 타입 | 설명 |
|------|------|------|
| `timestamp` | TIMESTAMP | 로그 발생 시간 |
| `tenant_id` | STRING | 테넌트 식별자 |
| `success` | BOOL | 요청 성공 여부 (`= TRUE` 사용, `= 'true'` 아님) |
| `input_tokens` | STRING | 입력 토큰 (`CAST AS FLOAT64` 필수) |
| `output_tokens` | STRING | 출력 토큰 |
| `total_tokens` | STRING | 전체 토큰 |
| `user_input` | STRING | 사용자 질문 텍스트 |
| `llm_response` | STRING | LLM 응답 텍스트 |
| `severity` | STRING | 로그 수준 (INFO/WARN/ERROR) |
| `request_metadata` | STRUCT | 메타데이터 (session_id, x_enc_data, service, endpoint) |

> **주의**: `request_metadata`는 STRUCT이므로 `JSON_VALUE()` 사용 불가. `request_metadata.session_id` 형태로 직접 접근.

### 3.2 캐시 전략

| TTL | 시간 | 적용 대상 |
|-----|------|----------|
| `SHORT` | 5분 | 실시간 KPI, 에러 분석, 감정 분석, 사용자 활동 |
| `MEDIUM` | 15분 | 시간별/일별 트래픽, 테넌트 사용량, 품질 트렌드 |
| `LONG` | 1시간 | 정적 데이터, 설정 정보 |

### 3.3 인증 체계

| 항목 | 값 |
|------|-----|
| Access Token | 15분 유효, Authorization 헤더 |
| Refresh Token | 7일 유효, httpOnly 쿠키 |
| 가드 순서 | JwtAuthGuard → PermissionsGuard → ThrottlerGuard |
| 인증 우회 | `@Public()` 데코레이터 |
| 권한 형식 | `@Permissions('resource:action')` |

### 3.4 자동 새로고침 요약

| 대시보드 | 주기 | 기본 조회 기간 |
|----------|------|---------------|
| 비즈니스 | 수동 | 30일 |
| 운영 | 5분 | 1일 |
| 품질 분석 | 15분 | 30일 |
| 챗봇 품질 | 캐시 5분 | 7일 |
| AI 성능 | 15분 | 7일 |
| LLM 분석 | 수동 | - |
| 리포트 모니터링 | 5분 | - |
| 사용자 분석 | 15분 | 7일 |
| 사용자 상세 | 수동 | 7일 |
| ETL Minkabu | 5분 | 7일 |
| ETL Wind | 5분 | 7일 |
| 배치 분석 (실행중) | 5초 | - |
