# 개선 대상 데이터 요약 (Markdown)

> 작성일: 2026-02-20  
> 기준 테이블: `finola-global.ola_monitoring.view_ola_monitoring`  
> 기준 기간: 최근 7일 (KST, `DATE(timestamp,'Asia/Seoul') >= DATE_SUB(CURRENT_DATE('Asia/Seoul'), INTERVAL 6 DAY)`)  
> 공통 필터: `user_input IS NOT NULL AND TRIM(user_input) != ''`

---

## 1) 2.2 기준: `FINAL` 제외 데이터 (개선 1순위)

### 1.1 response_node 분포 (`response_node != 'FINAL'`)

| response_node | 건수 |
|---|---:|
| AMBIGUOUS | 82 |
| UNSUPPORTED | 71 |
| SAFETY | 24 |
| ETN | 8 |
| **합계** | **185** |

해석:
- 현재 개선 대상 non-final 턴은 총 185건.
- 실무적으로 `AMBIGUOUS + UNSUPPORTED`가 대부분(153건, 82.7%)을 차지.

---

## 2) 12.4 기준: `FINAL` 중 고위험(HIGH) 데이터

### 2.1 측정 기준 (요약)

- `risk_score = 2*data_gap_phrase + 2*boilerplate_phrase + short_answer_flag + low_token_for_comprehensive`
- HIGH 기준: `risk_score >= 3`

### 2.2 카테고리별 HIGH 리스크

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

개선 포인트:
- 비율 중심: `comparison`, `trading`, `etf_fund`
- 건수 중심: `analyst`, `financial`

---

## 3) 12.5 기준: `FINAL` 중 데이터부재형 응답

### 3.1 카테고리별 데이터부재형 비율

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

해석:
- `FINAL`로 종료되어도, 특정 카테고리는 "데이터 없음" 안내형 답변 비중이 높음.
- 체감 품질 관점에서 `trading`, `etf_fund`, `forecast`, `analyst`, `financial` 개선 우선.

---

## 4) 멀티턴 추가 분석 (요청 반영)

질문 요지: "같은 채팅 플로우(세션)에서 FINAL을 거쳤는데도 non-final이 뜨는 케이스를 따로 보고 싶다."

### 4.1 세션 단위 교차 현황

| 지표 | 값 |
|---|---:|
| 전체 세션 수 | 1,237 |
| FINAL only 세션 | 1,095 |
| non-final only 세션 | 88 |
| FINAL + non-final 혼합 세션 | 54 |
| 혼합 세션 비율 | 4.37% |
| 세션 평균 턴 수 | 1.57 |

### 4.2 non-final 턴의 세션 출처

| session_type | non-final 턴 수 | 비율(%) |
|---|---:|---:|
| nonfinal_only_session | 111 | 60.00 |
| mixed_session (FINAL도 있었던 세션) | 74 | 40.00 |

핵심:
- non-final의 **40%는 이미 같은 세션에서 FINAL을 경험한 사용자**에게서 발생.
- 즉 "FINAL 경험이 있었음 = 이후도 안정"이 아님.

### 4.3 혼합 세션(mixed_session) 내 non-final node 분포

| response_node | 건수 | 비율(%) |
|---|---:|---:|
| AMBIGUOUS | 37 | 50.00 |
| UNSUPPORTED | 27 | 36.49 |
| SAFETY | 10 | 13.51 |

참고:
- `ETN`은 혼합세션에서 거의 없고, 주로 non-final only 세션에서 발생.

### 4.4 "FINAL -> non-final" 전이 (같은 세션 연속 턴)

| 전이 패턴 | 건수 |
|---|---:|
| FINAL -> UNSUPPORTED | 16 |
| FINAL -> AMBIGUOUS | 16 |
| FINAL -> SAFETY | 2 |
| **합계** | **34** |

해석:
- 같은 대화 흐름에서 직전 턴은 정상 종료였지만, 다음 턴에서 지원불가/모호로 전환되는 케이스가 실제로 존재.

### 4.5 혼합 세션 내 주요 category x non-final 조합

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
- "짧은/불완전 후속질문(simple_name)"이 mixed-session non-final의 대표 패턴.

### 4.6 전이 사례 (샘플)

| timestamp | session_id | 전이 | user_input 샘플 |
|---|---|---|---|
| 2026-02-19 22:09:38 | 411b3c2c-6ce1-4abf-bed3-56ac0ed3983b | FINAL -> UNSUPPORTED | 유리기판 관련 저PER 종목 중 눈에 띄는 곳 있나요? |
| 2026-02-19 11:59:16 | 340c8231-df51-401e-91a8-845db7fde11d | FINAL -> AMBIGUOUS | 애너토크목표가 |
| 2026-02-19 00:41:03 | 346173c3-e5a4-443e-ab62-c25e4992e1ec | FINAL -> SAFETY | 지금 구입해도 될까? |
| 2026-02-18 12:18:21 | 684ae3da-6239-4567-9c49-c02e6baca497 | FINAL -> UNSUPPORTED | 수수료는? |
| 2026-02-15 23:10:52 | 4067d4da-0ff4-4721-88c5-2ff8fa0c2be8 | FINAL -> AMBIGUOUS | 삼성디스플레이 OLED 투자 계획은 어떻게 되나요? |

---

## 5) 개선 우선순위 제안 (이번 데이터 기준)

1. `mixed_session` 방어: FINAL 이후 후속질문에서 `AMBIGUOUS/UNSUPPORTED` 전이 억제
2. `simple_name` 후속질문 자동 리라이트: 종목/기간/지표를 강제 보강
3. `analyst/financial/etf_fund/trading`의 데이터부재형 응답에 대체질문/대체지표 자동 제안
4. 모니터링 지표 추가:
   - `mixed_session_rate`
   - `post_final_nonfinal_transition_rate`
   - `post_final_ambiguous_rate`
