# 챗봇 품질 분석 종합 리포트 (카테고라이징/클러스터링/질문수준)

> 작성일: 2026-02-19  
> 분석 기간: 최근 7일 (KST, `CURRENT_DATE('Asia/Seoul') - 6일` ~ 오늘)  
> 데이터 소스: `finola-global.ola_monitoring.view_ola_monitoring`  
> 분석 모수: 2,181건 (`user_input` 공백 제외 기준)

---

## 0. 목적 및 질문

이 문서는 다음 운영 질문에 답하기 위해 작성되었다.

1. 카테고리별로 질문이 몇 건 발생하는가?
2. 우리가 답변을 잘 할 수 있는 질문은 무엇인가?
3. 질문 자체의 수준(좋은 질문)을 판단하는 근거는 무엇인가?
4. 신규 채팅이 들어왔을 때 어떤 카테고리/품질 기준으로 편입할 것인가?
5. `user_input`-`llm_response` 페어에서 챗봇 개선 인사이트를 어떻게 추출할 것인가?

---

## 1. 분석 방법

### 1.1 데이터 추출 범위

- 테이블: `finola-global.ola_monitoring.view_ola_monitoring`
- 기간 필터: `DATE(timestamp, 'Asia/Seoul') >= DATE_SUB(CURRENT_DATE('Asia/Seoul'), INTERVAL 6 DAY)`
- 분석 레코드 조건: `user_input IS NOT NULL AND TRIM(user_input) != ''`

### 1.2 카테고라이징 방법

- 규칙 기반(Regex) 분류를 적용해 14개 카테고리로 분류:
  - `comprehensive_analysis`, `stock_price`, `news`, `financial`, `analyst`, `forecast`, `comparison`, `etf_fund`, `sector_theme`, `trading`, `brokerage`, `howto`, `simple_name`, `other`
- 본 분류는 운영 로그 기반의 1차 라우팅 지표이며, 고도화 단계에서 LLM 분류와 결합 가능.

### 1.3 템플릿 클러스터링 방법

- 질문 텍스트 정규화:
  - 6자리 종목코드 -> `ticker`
  - `(<6자리>)` -> `(ticker)`
  - `종목명(코드)` 패턴 -> `{stock}(ticker)`
- 정규화 결과를 `template_key`로 집계하여 반복 템플릿의 품질을 산출.

### 1.4 질문 수준(Tier) 스코어링 방법

- 5축 점수 합산(휴리스틱):
  - 구체성, 의도 명확성, 분석 깊이, 시간 맥락, 비교 프레임
- Tier 매핑:
  - S: 10+, A: 7~9, B: 4~6, C: 1~3, D: 0

### 1.5 지표별 측정 기준 (산식 + 판정 기준)

#### 1.5.1 공통 집계 기준

- 집계 단위: `user_input`이 비어있지 않은 요청 1건 = 1 레코드
- 기간 기준: KST 일자 기준 최근 7일
- 비율 계산: `ROUND(분자 / 분모 * 100, 2)`

#### 1.5.2 전체 KPI 측정 기준

| 지표 | 측정 산식 (BigQuery) | 판정 기준 |
|---|---|---|
| Total Requests | `COUNT(*)` | 트래픽 규모 지표 (판정 없음) |
| Success Count | `COUNTIF(success)` | 기술적 성공 지표 |
| Fail Count | `COUNTIF(NOT success)` | 기술적 실패 지표 |
| Zero Total Tokens | `COUNTIF(total_tokens = 0)` | 0이면 정상 아님 후보, 비율 추적 |
| Avg Total Tokens | `ROUND(AVG(total_tokens), 2)` | 응답 밀도 추세 비교 |
| P95/P99 Total Tokens | `APPROX_QUANTILES(total_tokens,100)[OFFSET(95/99)]` | 상위 꼬리(고비용/장문) 감시 |

#### 1.5.3 Response Node 측정 기준

| 지표 | 측정 산식 | 판정 기준 |
|---|---|---|
| Response Node Count | `GROUP BY response_node` 후 `COUNT(*)` | 상태별 절대량 확인 |
| Node 비율 | `COUNT(*) / SUM(COUNT(*)) OVER()` | `FINAL` 외 노드 비율이 높으면 품질 리스크 |

주의:
- 이 리포트는 `success`와 별도로 `response_node`를 품질 지표로 본다.
- 즉 `success=true`여도 `UNSUPPORTED`, `AMBIGUOUS`, `SAFETY`면 사용자 체감 품질은 낮을 수 있다.

#### 1.5.4 카테고리 지표 측정 기준

| 지표 | 측정 산식 | 이번 리포트 판정 기준 |
|---|---|---|
| Category Count | 규칙 기반 `CASE ... END AS category` 후 `COUNT(*)` | 트래픽 우선순위 산정 |
| Category 비율 | `COUNT(*) / SUM(COUNT(*)) OVER()` | 5% 이상 카테고리 우선 모니터링 |
| Category FINAL 비율 | `COUNTIF(response_node='FINAL') / COUNT(*)` | `>=95%` 양호, `80~95%` 주의, `<80%` 취약 |
| Category Non-FINAL 건수 | `COUNTIF(response_node!='FINAL')` | `>=10건`이면 원인분석 우선 대상 |
| Category Avg Tokens | `ROUND(AVG(total_tokens),2)` | 비용/응답밀도 보조 지표 |

#### 1.5.5 템플릿 클러스터링 지표 측정 기준

| 지표 | 측정 산식 | 이번 리포트 판정 기준 |
|---|---|---|
| Template Key | 정규화(`코드/종목명 치환`) 후 `template_key` 생성 | 동일 형식 질문 묶음 |
| Template Count | `GROUP BY category, template_key` 후 `COUNT(*)` | `COUNT >= 3`부터 반복 패턴으로 간주 |
| Template FINAL 비율 | `COUNTIF(response_node='FINAL') / COUNT(*)` | Golden 후보: `COUNT>=3` and `FINAL>=95%` |

#### 1.5.6 질문 수준(Tier) 지표 측정 기준

질문 점수(`question_score`)는 아래 5개 축의 합(0~13점):

1. 구체성(0~3): 종목코드/종목명 명시 여부
2. 의도 명확성(0~3): 분석/조회 의도 키워드 명시 여부
3. 분석 깊이(0~3): 주가/뉴스/재무/전망/비교 요소의 다면성
4. 시간 맥락(0~2): 기간/시점 표현 포함 여부
5. 비교 프레임(0~2): 비교/순위/대조 표현 포함 여부

Tier 매핑 기준:

- S: `score >= 10`
- A: `7 <= score <= 9`
- B: `4 <= score <= 6`
- C: `1 <= score <= 3`
- D: `score = 0`

운영 해석 기준:

- `S/A`: 고품질 질문군
- `B`: 일반 질문군
- `C/D`: 모호/불완전 질문군(리라이트 우선 대상)

---

## 2. 전체 현황 (최근 7일)

### 2.1 전체 KPI

| 지표 | 값 |
|---|---:|
| Total Requests | 2,181 |
| Success (`success=true`) | 2,181 |
| Fail (`success=false`) | 0 |
| Zero Total Tokens | 36 |
| Avg Total Tokens | 6,319.46 |
| P95 Total Tokens | 9,243 |
| P99 Total Tokens | 20,597 |

### 2.2 Response Node 분포

| response_node | 건수 |
|---|---:|
| FINAL | 1,957 |
| UNSUPPORTED | 90 |
| AMBIGUOUS | 89 |
| SAFETY | 36 |
| ETN | 8 |
| DELISTED | 1 |

해석:
- `success=true`와 `response_node != FINAL`이 동시에 존재한다. 즉 운영 성공 플래그만으로 품질을 판단하면 과대평가될 수 있다.

---

## 3. 카테고리별 건수 및 품질

| Category | 건수 | 비율(%) | FINAL 비율(%) | AMBIGUOUS | UNSUPPORTED | SAFETY | Avg Tokens |
|---|---:|---:|---:|---:|---:|---:|---:|
| comprehensive_analysis | 1,198 | 54.93 | 96.58 | 30 | 5 | 0 | 7,318.19 |
| other | 155 | 7.11 | 57.42 | 7 | 35 | 22 | 3,621.30 |
| simple_name | 146 | 6.69 | 66.44 | 23 | 24 | 1 | 5,223.36 |
| financial | 129 | 5.91 | 95.35 | 6 | 0 | 0 | 6,235.10 |
| news | 128 | 5.87 | 99.22 | 0 | 1 | 0 | 4,546.34 |
| stock_price | 115 | 5.27 | 95.65 | 5 | 0 | 0 | 5,377.92 |
| analyst | 115 | 5.27 | 99.13 | 1 | 0 | 0 | 5,023.69 |
| forecast | 63 | 2.89 | 85.71 | 5 | 4 | 0 | 4,377.06 |
| etf_fund | 49 | 2.25 | 67.35 | 10 | 3 | 3 | 7,050.08 |
| trading | 35 | 1.60 | 62.86 | 0 | 4 | 9 | 4,794.69 |
| howto | 15 | 0.69 | 73.33 | 2 | 1 | 1 | 3,467.40 |
| sector_theme | 14 | 0.64 | 92.86 | 0 | 1 | 0 | 15,688.93 |
| brokerage | 13 | 0.60 | 7.69 | 0 | 12 | 0 | 1,417.92 |
| comparison | 6 | 0.28 | 100.00 | 0 | 0 | 0 | 5,015.33 |

핵심 포인트:
- 물량 기준 핵심 카테고리는 `comprehensive_analysis`(54.93%).
- 품질 취약 구간은 `other`, `simple_name`, `etf_fund`, `trading`, `brokerage`.
- `brokerage`는 도메인 내 사용자 기대와 정책/지원범위의 괴리가 매우 큼(UNSUPPORTED 집중).

---

## 4. 비정상 응답(Non-FINAL) 집중 구간

상위 집중 항목:

- `other -> UNSUPPORTED`: 35
- `comprehensive_analysis -> AMBIGUOUS`: 30
- `simple_name -> UNSUPPORTED`: 24
- `simple_name -> AMBIGUOUS`: 23
- `other -> SAFETY`: 22
- `brokerage -> UNSUPPORTED`: 12
- `etf_fund -> AMBIGUOUS`: 10
- `trading -> SAFETY`: 9

해석:
- 실패의 상당 부분은 모델 생성 실패라기보다, 입력 모호성(`simple_name`)과 정책 경계(`trading`, `brokerage`)에서 발생.

---

## 5. 템플릿 클러스터링 결과

### 5.1 반복 템플릿 Top

| category | template_key | 건수 | FINAL 비율(%) | Avg Tokens |
|---|---|---:|---:|---:|
| comprehensive_analysis | `{stock}(ticker)를 종합적으로 분석해줘` | 1,081 | 97.59 | 7,137.46 |
| comprehensive_analysis | `{stock}(ticker) 종합적으로 분석해줘` | 19 | 94.74 | 8,494.00 |
| comprehensive_analysis | `kodex {stock}(ticker)를 종합적으로 분석해줘` | 15 | 66.67 | 10,941.07 |

해석:
- 동일 템플릿이라도 인스턴스(종목/ETF/ETN 성격)에 따라 성능 편차가 크다.
- 특히 KODEX 계열 일부는 ETN/레버리지 관련 정책 분기로 FINAL 비율이 급락한다.

### 5.2 Golden Template 후보 (초안)

우선순위 후보:
1. `{stock}(ticker)를 종합적으로 분석해줘` (대규모 + 높은 FINAL)
2. 목표주가 추이 질문형(반복 출현 + 높은 품질)
3. 주가 변동 이유 질문형(반복 출현 + 높은 품질)

---

## 6. 질문 수준(Tier) 결과

| Tier | 건수 | 비율(%) | FINAL 비율(%) | AMBIGUOUS | UNSUPPORTED | SAFETY |
|---|---:|---:|---:|---:|---:|---:|
| S | 13 | 0.60 | 92.31 | 1 | 0 | 0 |
| A | 1,171 | 53.69 | 96.93 | 23 | 7 | 0 |
| B | 535 | 24.53 | 93.46 | 26 | 6 | 2 |
| C | 462 | 21.18 | 67.10 | 39 | 77 | 34 |

해석:
- Tier C에서 성능 저하가 급격하며(67.10%), 운영 개선의 1순위 타깃이다.
- 즉, “좋은 질문”을 늘리는 UX/리라이트 설계가 전체 품질 개선에 직접적으로 기여한다.

---

## 7. "좋은 질문" 평가 프레임워크

### 7.1 2축 정의

- 축 1: Question Quality (질문 자체 수준)
- 축 2: Answerability (시스템이 답변 가능한가)

두 축은 독립이다. 질문이 좋아도 지원 범위 밖이면 답변이 어려울 수 있고, 질문이 단순해도 시스템이 잘 처리할 수 있다.

### 7.2 주식 도메인 "좋은 질문" 7개 지표

1. 종목 특정성 (종목명/코드 포함)
2. 정보 유형 명시 (주가/재무/뉴스/배당 등)
3. 시간 범위 (최근 N일, 분기, 연도)
4. 분석 관점 (펀더멘털/테크니컬/리스크)
5. 비교 요소 (A vs B, 시점 비교)
6. 실행 가능성 (의사결정에 도움되는 구조)
7. 데이터 기반성 (객관 데이터로 답변 가능한가)

### 7.3 신규 채팅 편입/게이팅 기준

권장 게이트:

- `QQS 높음 + ANS 높음`: 즉시 답변 (Golden 후보)
- `QQS 낮음 + ANS 높음`: 질문 리라이트 후 답변
- `QQS 높음 + ANS 낮음`: 부분 답변 + 명확한 한계/대안 제시
- `QQS 낮음 + ANS 낮음`: 명확화 질문 또는 제한 안내

---

## 8. 시스템 개선 인사이트 (`user_input`, `llm_response` 페어 기반)

1. `success` 중심 모니터링만으로는 실제 체감 품질을 설명하지 못한다. `response_node`와 결합해야 한다.
2. `simple_name` 진입은 대화 확장 유도(추천질문/후속질문 제안) 설계가 필수다.
3. `brokerage`는 사용자 기대가 높지만 현재 지원/정책 라우팅이 약해 불만 유발 가능성이 높다.
4. `trading`/`etf_fund`는 정책 거절 시 대체 정보(리스크/지표/비교)를 즉시 제공해야 이탈이 줄어든다.
5. 템플릿 단위와 인스턴스 단위를 분리해 모니터링해야 한다. 같은 형식이라도 종목별 데이터 가용성이 다르다.

---

## 9. 실행 계획

### 9.1 즉시 (이번 주)

1. 주간 scorecard 뷰 생성: `category`, `tier`, `response_node` 교차 집계
2. `simple_name`/`brokerage` 전용 리라이트 가이드 문구 적용
3. 정책 거절 응답(`SAFETY`, `UNSUPPORTED`)에 대체 정보 제시 템플릿 추가

### 9.2 단기 (2주)

1. `question_category`, `question_tier`, `answerability_label`, `gate_decision` 메타데이터 파이프라인 구축
2. Golden Set v1 구축: 카테고리별 상위 템플릿 + 기준 답변 샘플
3. `QQS x ANS` 매트릭스 기반 운영 대시보드 추가

### 9.3 중기 (1개월)

1. LLM 분류 + 규칙 분류 하이브리드 운영
2. 카테고리별 자동 인사이트 리포트(주간)
3. 신규 질문의 Golden Set 자동 편입/보류/제외 룰 자동화

---

## 10. 참고한 내부 자산

- `apps/backend/src/ibk-chat-report/queries/ibk-chat-report.queries.ts`
- `apps/backend/src/ibk-chat-report/services/question-scorer.service.ts`
- `apps/backend/src/user-profiling/category-classifier.service.ts`
- `docs/question-quality-strategy-2026-02-19.md`
- `docs/rule-based-quality-scoring-design-2026-02-19.md`
- `docs/llm-response-quality-analysis-2026-02-19.md`

---

## 11. 참고한 외부 프레임워크 (요약)

- QGEval (질문 품질/답변가능성 다차원 평가)
- FailSafeQA (금융 도메인 질의 실패 유형: 오타/불완전/도메인외)
- RAGAS (컨텍스트 적합성/신뢰성 측정)
- LLM-RUBRIC (다차원 루브릭 기반 평가)

실무 반영 포인트:
- 질문 품질과 답변 가능성을 분리 평가해야 오진단을 줄일 수 있다.
- 금융 도메인은 규정/정책 준수 축을 별도 지표로 둬야 한다.

---

## 12. 개선 대상 데이터 통합 정리 (요청 반영)

본 섹션은 기존 2.2/12.4/12.5 데이터를 멀티턴 관점까지 포함해 통합 정리한 결과다.

상세 건별 리스트(원본 내역)는 아래 문서에 별도 저장:

- `docs/analysis-data-2026-02-19/improvement-detail-lists-2026-02-20.md`

참고: 로그가 실시간으로 누적되므로, 건수의 최신 스냅샷은 위 상세 리스트 문서를 기준으로 본다.

### 12.1 `FINAL` 제외 데이터 (2.2 기준)

| response_node | 건수 |
|---|---:|
| AMBIGUOUS | 82 |
| UNSUPPORTED | 71 |
| SAFETY | 24 |
| ETN | 8 |
| **합계** | **185** |

해석:
- 개선 대상 non-final 턴은 총 185건.
- `AMBIGUOUS + UNSUPPORTED`가 153건(82.7%)으로 대부분을 차지.

### 12.2 `FINAL` 중 HIGH 리스크 (12.4 기준)

리스크 산식:

- `risk_score = 2*data_gap_phrase + 2*boilerplate_phrase + short_answer_flag + low_token_for_comprehensive`
- HIGH: `risk_score >= 3`, MEDIUM: `risk_score = 2`

| category | FINAL 건수 | HIGH 건수 | HIGH 비율(%) | MEDIUM 건수 |
|---|---:|---:|---:|---:|
| comparison | 5 | 2 | 40.00 | 0 |
| trading | 12 | 2 | 16.67 | 3 |
| etf_fund | 29 | 3 | 10.34 | 5 |
| analyst | 132 | 10 | 7.58 | 6 |
| financial | 112 | 7 | 6.25 | 7 |
| forecast | 44 | 2 | 4.55 | 6 |
| simple_name | 97 | 3 | 3.09 | 8 |
| other | 79 | 2 | 2.53 | 12 |
| news | 100 | 1 | 1.00 | 0 |
| stock_price | 104 | 1 | 0.96 | 1 |
| comprehensive_analysis | 1018 | 1 | 0.10 | 22 |
| howto | 10 | 0 | 0.00 | 1 |
| sector_theme | 10 | 0 | 0.00 | 4 |
| brokerage | 1 | 0 | 0.00 | 0 |

개선 우선순위:
- 비율 중심: `comparison`, `trading`, `etf_fund`
- 건수 중심: `analyst`, `financial`

### 12.3 `FINAL` 중 데이터부재형 (12.5 기준)

| category | FINAL 건수 | data_gap 건수 | data_gap 비율(%) |
|---|---:|---:|---:|
| trading | 12 | 5 | 41.67 |
| sector_theme | 10 | 4 | 40.00 |
| comparison | 5 | 2 | 40.00 |
| etf_fund | 29 | 8 | 27.59 |
| forecast | 44 | 8 | 18.18 |
| other | 79 | 14 | 17.72 |
| financial | 112 | 14 | 12.50 |
| analyst | 132 | 16 | 12.12 |
| simple_name | 97 | 11 | 11.34 |
| howto | 10 | 1 | 10.00 |
| comprehensive_analysis | 1018 | 23 | 2.26 |
| stock_price | 104 | 2 | 1.92 |
| news | 100 | 1 | 1.00 |
| brokerage | 1 | 0 | 0.00 |

핵심:
- `FINAL`이어도 "데이터 없음형" 응답이 높은 카테고리가 존재.
- 체감 품질 리스크는 `trading`, `etf_fund`, `forecast`, `analyst`, `financial` 순으로 우선 관리가 필요.

### 12.4 멀티턴 교차 분석: 같은 세션에서 `FINAL`과 `non-FINAL` 공존

#### 12.4.1 세션 단위 현황

| 지표 | 값 |
|---|---:|
| 전체 세션 수 | 1,237 |
| FINAL only 세션 | 1,095 |
| non-final only 세션 | 88 |
| FINAL + non-final 혼합 세션 | 54 |
| 혼합 세션 비율 | 4.37% |
| 세션 평균 턴 수 | 1.57 |

#### 12.4.2 non-final 턴의 출처

| session_type | non-final 턴 수 | 비율(%) |
|---|---:|---:|
| nonfinal_only_session | 111 | 60.00 |
| mixed_session (FINAL도 있었던 세션) | 74 | 40.00 |

해석:
- non-final의 40%는 같은 세션에서 이미 FINAL 응답을 경험한 사용자의 후속 턴에서 발생.
- 즉 `FINAL 경험 = 세션 안정`이 아니다.

#### 12.4.3 mixed_session 내 non-final node 분포

| response_node | 건수 | 비율(%) |
|---|---:|---:|
| AMBIGUOUS | 37 | 50.00 |
| UNSUPPORTED | 27 | 36.49 |
| SAFETY | 10 | 13.51 |

#### 12.4.4 연속 전이: `FINAL -> non-FINAL`

| 전이 패턴 | 건수 |
|---|---:|
| FINAL -> UNSUPPORTED | 16 |
| FINAL -> AMBIGUOUS | 16 |
| FINAL -> SAFETY | 2 |
| **합계** | **34** |

#### 12.4.5 mixed_session 주요 `category x node`

| category | response_node | 건수 |
|---|---|---:|
| simple_name | AMBIGUOUS | 16 |
| other | UNSUPPORTED | 11 |
| simple_name | UNSUPPORTED | 7 |
| other | SAFETY | 6 |
| comprehensive_analysis | AMBIGUOUS | 4 |
| etf_fund | AMBIGUOUS | 4 |
| financial | AMBIGUOUS | 3 |
| forecast | UNSUPPORTED | 3 |
| trading | SAFETY | 3 |

의미:
- 같은 채팅 플로우에서 FINAL이 있더라도, 짧거나 모호한 후속질문(`simple_name`)에서 non-final이 재발.

### 12.5 운영 액션 (업데이트)

1. `FINAL_TECH`와 `FINAL_QUALITY`를 분리해 품질 통과 여부를 별도 기록
2. mixed_session 방어 규칙 추가: `FINAL -> AMBIGUOUS/UNSUPPORTED` 전이 즉시 리라이트 유도
3. `simple_name` 후속질문 자동 확장(종목/기간/지표 슬롯 채움)
4. data-gap 응답 정책 강화: "없음" 단답 대신 대체 질의 1~2개 강제 제시
5. 대시보드 신규 지표:
   - `mixed_session_rate`
   - `post_final_nonfinal_transition_rate`
   - `post_final_ambiguous_rate`
   - `final_data_gap_rate_by_category`

---

*보고서 최종 갱신: 2026-02-20 | 데이터 기준: BigQuery `finola-global.ola_monitoring.view_ola_monitoring`*
