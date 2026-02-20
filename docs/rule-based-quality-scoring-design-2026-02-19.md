# 룰베이스 질문/답변 품질 평가 로직 설계

> **작성일**: 2026-02-19  
> **데이터 기준**: 12,831건 (2026-01-27 ~ 02-19)  
> **목표**: LLM 호출 없이, BigQuery 컬럼만으로 연산 가능한 품질 스코어링

---

## 1. 사용 가능한 연산 재료

### 1.1 BigQuery 컬럼 목록

| 컬럼 | 타입 | 용도 |
|------|------|------|
| `user_input` | STRING | 질문 텍스트 → LENGTH, REGEXP |
| `llm_response` | STRING | 답변 텍스트 → LENGTH, REGEXP, 구조 분석 |
| `input_tokens` | FLOAT64 | LLM에 전달된 전체 프롬프트 토큰 |
| `output_tokens` | FLOAT64 | LLM이 생성한 응답 토큰 |
| `total_tokens` | FLOAT64 | input + output |
| `success` | BOOL | 시스템 성공 여부 |
| `message_length` | FLOAT64 | 메시지 길이 |
| `timestamp` | TIMESTAMP | 시간 |
| `request_metadata.session_id` | STRING | 세션 ID |
| `request_metadata.x_enc_data` | STRING | 유저 ID (암호화) |
| `tenant_id` | STRING | 테넌트 |

### 1.2 파생 가능한 메트릭 (14개)

| # | 메트릭 | 연산식 | 비용 |
|---|--------|--------|------|
| M1 | 질문 길이 (자) | `LENGTH(user_input)` | O(1) |
| M2 | 답변 길이 (자) | `LENGTH(llm_response)` | O(1) |
| M3 | 아웃풋 토큰 | `output_tokens` | O(1) |
| M4 | 인풋 토큰 | `input_tokens` | O(1) |
| M5 | **아웃풋/인풋 토큰 비율** | `output_tokens / input_tokens` | O(1) |
| M6 | **답변/질문 길이 비율** | `LENGTH(response) / LENGTH(input)` | O(1) |
| M7 | 답변 줄 수 | `ARRAY_LENGTH(SPLIT(response, '\n'))` | O(n) |
| M8 | 종목코드 포함 여부 | `REGEXP_CONTAINS(input, r'\d{6}')` | O(n) |
| M9 | 답변 내 테이블 존재 | `REGEXP_CONTAINS(response, r'\|.*\|.*\|')` | O(n) |
| M10 | 답변 내 숫자 데이터 존재 | `REGEXP_CONTAINS(response, r'\d{1,3}(,\d{3})+')` | O(n) |
| M11 | 답변 내 날짜 존재 | `REGEXP_CONTAINS(response, r'\d{4}[-/]\d{2}')` | O(n) |
| M12 | 답변 내 볼드 마크다운 | `REGEXP_CONTAINS(response, r'\*\*.*\*\*')` | O(n) |
| M13 | 답변 사과 패턴 | `REGEXP_CONTAINS(response, r'^(>?\s*)?죄송')` | O(n) |
| M14 | 질문 키워드 카테고리 | 아래 §3 참조 | O(n) |

---

## 2. 메트릭별 식별력 분석 (데이터 기반)

### 2.1 정상(OK) vs 실패(FAIL) 비교표

```
메트릭               │   OK (12,142건)   │   FAIL (689건)    │ 격차 배수
─────────────────────┼───────────────────┼───────────────────┼──────────
M3  output_tokens    │  평균 1,060       │  평균 36          │  29.4x ⭐⭐⭐
M5  out/in 비율      │  평균 0.21        │  평균 0.05        │  4.2x  ⭐⭐⭐
M6  답변/질문 길이비 │  평균 111.4       │  평균 13.0        │  8.6x  ⭐⭐⭐
M7  답변 줄 수       │  평균 51          │  평균 0.5         │  102x  ⭐⭐⭐
M2  답변 길이        │  평균 2,136자     │  평균 120자       │  17.8x ⭐⭐⭐
M9  테이블 존재      │  83.3%            │  0.0%             │  ∞     ⭐⭐⭐
M10 숫자 데이터      │  81.3%            │  0.0%             │  ∞     ⭐⭐⭐
M11 날짜 존재        │  89.7%            │  0.0%             │  ∞     ⭐⭐⭐
M12 볼드 마크다운    │  93.5%            │  0.1%             │  935x  ⭐⭐⭐
M8  종목코드(질문)   │  60.8%            │  3.9%             │  15.6x ⭐⭐
M1  질문 길이        │  평균 24.1자      │  평균 12.6자      │  1.9x  ⭐
M4  input_tokens     │  평균 6,061       │  평균 783         │  7.7x  ⭐⭐
```

### 2.2 output_tokens 임계값 탐색 (가장 강력한 단일 지표)

```
output_tokens 구간  │  전체  │  실패  │ 실패율  │ 판정
────────────────────┼────────┼────────┼─────────┼─────────
0                   │   223  │   223  │ 100.0%  │ 🔴 확정 실패
1 ~ 30              │   124  │   111  │  89.5%  │ 🔴 거의 실패
31 ~ 60             │   397  │   241  │  60.7%  │ 🟡 의심
61 ~ 100            │   408  │   114  │  27.9%  │ 🟡 주의
101 ~ 200           │   486  │     0  │   0.0%  │ ✅ 안전
201+                │ 11,194 │     0  │   0.0%  │ ✅ 완전 안전
```

> **결정적 임계값**: `output_tokens >= 101` 이면 **실패 0건**. 이것 하나로 완벽한 이진 분류기.

### 2.3 input_tokens 임계값

```
input_tokens 구간   │  전체  │  실패  │ 실패율  │ 해석
────────────────────┼────────┼────────┼─────────┼───────────────
0                   │   223  │   223  │ 100.0%  │ 가드레일 사전 차단 (Type A)
1 ~ 500             │   218  │    11  │   5.0%  │ 컨텍스트 극소
501 ~ 1,000         │   769  │   388  │  50.5%  │ 가드레일 거절 (Type B/C/D)
1,001 ~ 2,000       │   209  │    40  │  19.1%  │ 부분 처리 후 거절
2,001 ~ 4,000       │ 2,523  │    21  │   0.8%  │ 거의 안전
4,001+              │ 8,890  │     6  │   0.1%  │ 완전 안전
```

> **인사이트**: `input_tokens = 0`이면 LLM 호출 자체가 안 된 것 (가드레일 사전 차단). `501~1000` 구간은 LLM이 호출되었지만 거절한 케이스.

### 2.4 구조적 요소의 정밀도 (Precision)

**"이 요소가 응답에 있으면 → 정상 응답"의 확률:**

| 구조적 요소 | 있을 때 정상 확률 | 없을 때 정상 확률 | 판별력 |
|------------|----------------|----------------|-------|
| 날짜 (`YYYY-MM-DD`) | **100.0%** | 67.0% | ⭐⭐⭐ 완벽 |
| 테이블 (`\|...\|`) | **100.0%** | 74.6% | ⭐⭐⭐ 완벽 |
| 포맷된 숫자 (`1,234`) | **100.0%** | 77.4% | ⭐⭐⭐ 완벽 |
| 볼드 (`**...**`) | **100.0%** | 53.6% | ⭐⭐⭐ 완벽 |
| 시장 참조 (KOSPI/KOSDAQ) | **99.4%** | 93.1% | ⭐⭐ 강력 |
| 원/% 기호 | **99.0%** | 69.4% | ⭐⭐ 강력 |
| 종목코드 (질문) | **99.6%** | 87.8% | ⭐⭐ 강력 |

---

## 3. 추천 방식: 복합 스코어링 시스템

### 3.1 왜 복합 방식인가

단일 메트릭(예: output_tokens > 100)으로도 실패 탐지는 가능하지만, **품질 등급화** (얼마나 좋은 답변인지)에는 여러 축이 필요합니다.

```
접근법 A: 단일 임계값 (output_tokens > 100)
  → 실패 탐지 100%    → 품질 등급화 불가 ❌

접근법 B: 복합 스코어 (output_tokens + 구조 + 키워드)
  → 실패 탐지 100%    → 품질 4단계 등급화 ✅
```

### 3.2 설계: 3-레이어 평가 체계

```
Layer 1: 질문 품질 스코어 (Q-Score)     ← 인풋 기반
Layer 2: 답변 품질 스코어 (A-Score)     ← 아웃풋 기반  
Layer 3: 상호작용 스코어 (I-Score)      ← 인풋×아웃풋 관계
─────────────────────────────────────
= 종합 품질 등급 (Grade A/B/C/D/F)
```

---

## 4. Layer 1: 질문 품질 스코어 (Q-Score, 0~100)

### 4.1 구성 요소 (5개, 합계 100점)

```sql
Q_Score =
    specificity_score      -- 구체성     (0~30점)
  + intent_clarity_score   -- 의도명확성  (0~25점)
  + context_richness_score -- 맥락풍부성  (0~20점)  
  + length_score           -- 길이적정성  (0~15점)
  + formality_score        -- 형식적정성  (0~10점)
```

### 4.2 각 요소 연산 로직

#### (1) 구체성 스코어 (0~30)

```sql
specificity_score = 
  -- 종목코드 포함 (6자리 숫자)
  CASE WHEN REGEXP_CONTAINS(user_input, r'\d{6}') THEN 15 ELSE 0 END
  +
  -- 종목명으로 추정되는 고유명사 (한글 2~8자 연속)
  CASE WHEN REGEXP_CONTAINS(user_input, r'[가-힣]{2,8}(주|전자|화학|건설|증권|반도체|에너지|바이오)')
       THEN 10 ELSE 0 END
  +
  -- 구체적 지표 언급
  CASE WHEN REGEXP_CONTAINS(user_input, r'(PER|PBR|ROE|EPS|BPS|배당수익률|영업이익률|시가총액)')
       THEN 5 ELSE 0 END
```

#### (2) 의도 명확성 스코어 (0~25)

```sql
intent_clarity_score =
  -- 분석 키워드 (가장 높은 의도 명확성)
  CASE WHEN REGEXP_CONTAINS(user_input, r'(종합적으로 분석|상세히 분석|비교 분석)')
       THEN 25
  -- 정보 유형 특정 키워드
  WHEN REGEXP_CONTAINS(user_input, r'(주가 동향|재무 지표|목표주가|배당 현황|뉴스 동향|실적 분석)')
       THEN 20
  -- 일반 질문 키워드
  WHEN REGEXP_CONTAINS(user_input, r'(알려|설명|보여|비교|분석|조회)')
       THEN 15
  -- 의문문 형태
  WHEN REGEXP_CONTAINS(user_input, r'[?？]')
       THEN 10
  -- 단순 입력 (종목명만)
  WHEN LENGTH(user_input) <= 10
       THEN 5
  ELSE 8 END
```

#### (3) 맥락 풍부성 스코어 (0~20)

```sql
context_richness_score =
  -- 시간적 맥락
  (CASE WHEN REGEXP_CONTAINS(user_input, r'(최근 \d+(개월|일|년)|20\d{2}년|\d+분기)')
        THEN 8
        WHEN REGEXP_CONTAINS(user_input, r'(최근|올해|이번|작년|전월)')
        THEN 4
        ELSE 0 END)
  +
  -- 비교 프레임
  (CASE WHEN REGEXP_CONTAINS(user_input, r'(vs|대비|비교|차이|유사|비슷)')
        THEN 7 ELSE 0 END)
  +
  -- 복합 요청 (여러 정보 동시 요청)
  (CASE WHEN (REGEXP_CONTAINS(user_input, r'주가') AND REGEXP_CONTAINS(user_input, r'뉴스'))
          OR (REGEXP_CONTAINS(user_input, r'재무') AND REGEXP_CONTAINS(user_input, r'전망'))
        THEN 5 ELSE 0 END)
```

#### (4) 길이 적정성 스코어 (0~15)

```sql
-- 데이터 기반: 질문 길이 16~30자가 최다 + 최고 응답 품질
length_score =
  CASE
    WHEN LENGTH(user_input) BETWEEN 15 AND 40 THEN 15  -- 최적 구간 (P25~P75)
    WHEN LENGTH(user_input) BETWEEN 8 AND 14 THEN 10   -- 양호
    WHEN LENGTH(user_input) BETWEEN 41 AND 80 THEN 12  -- 상세 (약간 길지만 좋음)
    WHEN LENGTH(user_input) BETWEEN 4 AND 7 THEN 5     -- 짧지만 종목명 가능
    WHEN LENGTH(user_input) <= 3 THEN 2                 -- 너무 짧음
    ELSE 8                                               -- 매우 김
  END
```

#### (5) 형식 적정성 스코어 (0~10)

```sql
formality_score =
  -- 한글 비율 (정상적 한국어 질문)
  (CASE WHEN SAFE_DIVIDE(
          ARRAY_LENGTH(REGEXP_EXTRACT_ALL(user_input, r'[가-힣]')),
          LENGTH(user_input)
        ) >= 0.5
        THEN 5 ELSE 2 END)
  +
  -- 오타/초성 패턴 없음
  (CASE WHEN NOT REGEXP_CONTAINS(user_input, r'[ㄱ-ㅎㅏ-ㅣ]{2,}')
        THEN 3 ELSE 0 END)
  +
  -- 욕설/비속어 없음
  (CASE WHEN NOT REGEXP_CONTAINS(user_input, r'(시발|ㅅㅂ|ㅂㅅ|병신|개새|미친)')
        THEN 2 ELSE 0 END)
```

### 4.3 Q-Score Tier 매핑

| Q-Score | Tier | 라벨 | 예시 |
|---------|------|------|------|
| 80~100 | S | 전문 분석 요청 | "삼성전자(005930) 최근 3개월 재무지표와 애널리스트 목표주가 추이 비교 분석" |
| 60~79 | A | 구체적 정보 요청 | "삼성전자(005930)를 종합적으로 분석해줘" |
| 40~59 | B | 일반 질문 | "삼성전자 최근 뉴스 알려줘" |
| 20~39 | C | 단순 입력 | "삼성전자" |
| 0~19 | D | 모호/부적합 | "주식", "ㅋㅋ", "개명" |

---

## 5. Layer 2: 답변 품질 스코어 (A-Score, 0~100)

### 5.1 구성 요소 (5개, 합계 100점)

```sql
A_Score =
    volume_score        -- 응답량     (0~25점)
  + structure_score     -- 구조화     (0~25점)
  + data_richness_score -- 데이터밀도 (0~25점)
  + token_efficiency    -- 토큰효율   (0~15점)
  + non_refusal_score   -- 비거절     (0~10점)
```

### 5.2 각 요소 연산 로직

#### (1) 응답량 스코어 (0~25)

```sql
-- 데이터 기반: output_tokens 101+ 이면 실패 0건
volume_score =
  CASE
    WHEN output_tokens >= 1200 THEN 25  -- P50 이상: 풍부한 응답
    WHEN output_tokens >= 800  THEN 22  -- 양호
    WHEN output_tokens >= 400  THEN 18  -- 보통
    WHEN output_tokens >= 200  THEN 14  -- 최소 허용
    WHEN output_tokens >= 101  THEN 10  -- 안전 하한
    WHEN output_tokens >= 61   THEN 5   -- 위험
    WHEN output_tokens >= 31   THEN 2   -- 거의 실패
    ELSE 0                               -- 실패
  END
```

#### (2) 구조화 스코어 (0~25)

```sql
-- 데이터 기반: 테이블/볼드/날짜 존재 시 정상 확률 100%
structure_score =
  (CASE WHEN REGEXP_CONTAINS(llm_response, r'\|.*\|.*\|') THEN 8 ELSE 0 END)  -- 테이블
  + (CASE WHEN REGEXP_CONTAINS(llm_response, r'\*\*.*\*\*') THEN 5 ELSE 0 END) -- 볼드
  + (CASE WHEN REGEXP_CONTAINS(llm_response, r'^[-•*]|\n[-•*]') THEN 4 ELSE 0 END) -- 불릿
  + (CASE WHEN ARRAY_LENGTH(REGEXP_EXTRACT_ALL(llm_response, r'\n')) >= 10 THEN 5
          WHEN ARRAY_LENGTH(REGEXP_EXTRACT_ALL(llm_response, r'\n')) >= 5 THEN 3
          ELSE 0 END)  -- 줄 수 (구조 복잡도)
  + (CASE WHEN REGEXP_CONTAINS(llm_response, r'(---|\n#{1,3}\s)') THEN 3 ELSE 0 END)  -- 섹션 구분
```

#### (3) 데이터 밀도 스코어 (0~25)

```sql
-- 데이터 기반: 숫자/날짜/시장참조 존재 시 정상 확률 99.4~100%
data_richness_score =
  (CASE WHEN REGEXP_CONTAINS(llm_response, r'\d{1,3}(,\d{3})+') THEN 8 ELSE 0 END)  -- 포맷된 숫자
  + (CASE WHEN REGEXP_CONTAINS(llm_response, r'\d{4}[-/]\d{2}[-/]\d{2}') THEN 5 ELSE 0 END)  -- 날짜
  + (CASE WHEN REGEXP_CONTAINS(llm_response, r'(KOSPI|KOSDAQ|코스피|코스닥)') THEN 4 ELSE 0 END)  -- 시장참조
  + (CASE WHEN REGEXP_CONTAINS(llm_response, r'(원|%)') THEN 4 ELSE 0 END)  -- 원/% 단위
  + (CASE WHEN REGEXP_CONTAINS(llm_response, r'\d{6}') THEN 4 ELSE 0 END)  -- 종목코드
```

#### (4) 토큰 효율 스코어 (0~15)

```sql
-- 데이터 기반: OK 평균 out/in ratio = 0.21, FAIL 평균 = 0.05
-- 높을수록 인풋 대비 아웃풋이 많음 = LLM이 적극적으로 답변
token_efficiency =
  CASE
    WHEN input_tokens = 0 THEN 0                          -- 호출 자체 안 됨
    WHEN SAFE_DIVIDE(output_tokens, input_tokens) >= 0.20 THEN 15  -- 최적 (OK P50)
    WHEN SAFE_DIVIDE(output_tokens, input_tokens) >= 0.15 THEN 12  -- 양호
    WHEN SAFE_DIVIDE(output_tokens, input_tokens) >= 0.10 THEN 8   -- 보통
    WHEN SAFE_DIVIDE(output_tokens, input_tokens) >= 0.05 THEN 4   -- 부족
    ELSE 0                                                          -- 거의 거절
  END
```

#### (5) 비거절 스코어 (0~10)

```sql
-- 거절/사과 패턴 감지 (역방향 스코어: 없을수록 높음)
non_refusal_score =
  CASE
    WHEN REGEXP_CONTAINS(llm_response, r'^(>?\s*)?죄송합니다\. 저는 (법률|금융)')
      THEN 0  -- 고정 템플릿 거절
    WHEN REGEXP_CONTAINS(llm_response, r'질문의 범위가 너무 넓어')
      THEN 0  -- 범위 넓어 거절
    WHEN REGEXP_CONTAINS(llm_response, r'입력하신 내용을 정확히 이해하지 못했습니다')
      THEN 0  -- 이해 불가 거절
    WHEN REGEXP_CONTAINS(llm_response, r'죄송') AND output_tokens < 100
      THEN 2  -- 사과 + 짧은 응답
    WHEN REGEXP_CONTAINS(llm_response, r'제공되지 않') AND output_tokens >= 200
      THEN 7  -- 데이터 없음 안내지만 대안 제시
    WHEN REGEXP_CONTAINS(llm_response, r'죄송') AND output_tokens >= 200
      THEN 8  -- 사과하지만 내용은 있음
    ELSE 10   -- 거절 패턴 없음
  END
```

### 5.3 A-Score Grade 매핑

| A-Score | Grade | 라벨 | 특성 |
|---------|-------|------|------|
| 85~100 | A | 우수 | 테이블+숫자+볼드+풍부한 토큰 |
| 65~84 | B | 양호 | 주요 데이터 포함, 구조화됨 |
| 40~64 | C | 보통 | 기본 정보 제공, 구조 부족 |
| 20~39 | D | 미흡 | 내용 부족 또는 부분 거절 |
| 0~19 | F | 실패 | 템플릿 거절 또는 빈 응답 |

---

## 6. Layer 3: 상호작용 스코어 (I-Score, 0~100)

### 6.1 핵심 아이디어

**"질문 수준에 비해 답변이 얼마나 적절한가"**를 측정.

Q-Score가 높은데 A-Score가 낮으면 → 시스템 문제 (좋은 질문에 못 답변)
Q-Score가 낮은데 A-Score가 높으면 → 시스템 우수 (단순 질문에도 풍부한 답변)

### 6.2 연산 로직

```sql
I_Score =
  -- (1) Q-A 매칭도 (0~40): 질문 수준 대비 답변 적절성
  (CASE
    WHEN Q_Tier IN ('S','A') AND A_Grade IN ('A','B') THEN 40  -- 좋은 질문 + 좋은 답변
    WHEN Q_Tier IN ('S','A') AND A_Grade = 'C'        THEN 25  -- 좋은 질문 + 보통 답변 (아쉬움)
    WHEN Q_Tier IN ('S','A') AND A_Grade IN ('D','F') THEN 5   -- 좋은 질문 + 나쁜 답변 🔴
    WHEN Q_Tier IN ('B','C') AND A_Grade IN ('A','B') THEN 35  -- 보통 질문 + 좋은 답변 (우수)
    WHEN Q_Tier IN ('B','C') AND A_Grade = 'C'        THEN 25  -- 보통 질문 + 보통 답변
    WHEN Q_Tier IN ('B','C') AND A_Grade IN ('D','F') THEN 10  -- 보통 질문 + 나쁜 답변
    WHEN Q_Tier = 'D' AND A_Grade IN ('A','B')        THEN 30  -- 나쁜 질문인데 좋은 답변 (감동)
    WHEN Q_Tier = 'D'                                  THEN 15  -- 나쁜 질문
    ELSE 20
  END)
  +
  -- (2) 답변/질문 비율 적정성 (0~30)
  (CASE
    WHEN SAFE_DIVIDE(LENGTH(llm_response), LENGTH(user_input)) >= 80 THEN 30  -- OK P25 이상
    WHEN SAFE_DIVIDE(LENGTH(llm_response), LENGTH(user_input)) >= 40 THEN 22
    WHEN SAFE_DIVIDE(LENGTH(llm_response), LENGTH(user_input)) >= 15 THEN 15
    WHEN SAFE_DIVIDE(LENGTH(llm_response), LENGTH(user_input)) >= 5  THEN 8
    ELSE 0
  END)
  +
  -- (3) 정보 대응도 (0~30): 질문 키워드에 대응하는 답변 요소 존재
  (CASE WHEN REGEXP_CONTAINS(user_input, r'주가') AND REGEXP_CONTAINS(llm_response, r'\d{1,3}(,\d{3})+원?')
        THEN 10 ELSE 0 END
   + CASE WHEN REGEXP_CONTAINS(user_input, r'뉴스') AND REGEXP_CONTAINS(llm_response, r'(뉴스|기사|보도|발표)')
          THEN 10 ELSE 0 END
   + CASE WHEN REGEXP_CONTAINS(user_input, r'(재무|실적)') AND REGEXP_CONTAINS(llm_response, r'(매출|영업이익|순이익)')
          THEN 10 ELSE 0 END)
```

---

## 7. 종합 등급 산정

### 7.1 통합 공식

```sql
Final_Score = (Q_Score * 0.25) + (A_Score * 0.50) + (I_Score * 0.25)
```

**가중치 근거:**
- **A-Score 50%**: 답변 품질이 사용자 경험에 가장 직접적 영향
- **Q-Score 25%**: 질문 품질은 개선 포인트 식별 (어떤 질문에 강/약한지)
- **I-Score 25%**: 질문-답변 매칭이 시스템 전반 역량 평가

### 7.2 최종 등급

| Final Score | 등급 | 라벨 | 조치 |
|-------------|------|------|------|
| 80~100 | ★ | 우수 | Golden Set 편입 후보 |
| 60~79 | A | 양호 | 정상 운영 |
| 40~59 | B | 보통 | 모니터링 |
| 20~39 | C | 미흡 | 개선 대상 → 원인 태깅 |
| 0~19 | F | 실패 | 즉시 알림 → 규칙 수정 |

---

## 8. 단일 BigQuery 쿼리로 구현

```sql
WITH scored AS (
  SELECT
    timestamp,
    user_input,
    llm_response,
    input_tokens,
    output_tokens,
    request_metadata.session_id,

    -- ========== Q-Score (질문 품질) ==========
    -- 구체성 (0~30)
    (CASE WHEN REGEXP_CONTAINS(user_input, r'\d{6}') THEN 15 ELSE 0 END
     + CASE WHEN REGEXP_CONTAINS(user_input, r'[가-힣]{2,8}(주|전자|화학|건설|증권|반도체|에너지|바이오)') THEN 10 ELSE 0 END
     + CASE WHEN REGEXP_CONTAINS(user_input, r'(PER|PBR|ROE|EPS|BPS|배당수익률|영업이익률|시가총액)') THEN 5 ELSE 0 END
    ) as q_specificity,

    -- 의도명확성 (0~25)
    (CASE
      WHEN REGEXP_CONTAINS(user_input, r'(종합적으로 분석|상세히 분석|비교 분석)') THEN 25
      WHEN REGEXP_CONTAINS(user_input, r'(주가 동향|재무 지표|목표주가|배당 현황|뉴스 동향|실적 분석)') THEN 20
      WHEN REGEXP_CONTAINS(user_input, r'(알려|설명|보여|비교|분석|조회)') THEN 15
      WHEN REGEXP_CONTAINS(user_input, r'[?？]') THEN 10
      WHEN LENGTH(user_input) <= 10 THEN 5
      ELSE 8 END
    ) as q_intent,

    -- 맥락풍부성 (0~20)
    (CASE WHEN REGEXP_CONTAINS(user_input, r'(최근 \d+(개월|일|년)|20\d{2}년|\d+분기)') THEN 8
          WHEN REGEXP_CONTAINS(user_input, r'(최근|올해|이번|작년|전월)') THEN 4 ELSE 0 END
     + CASE WHEN REGEXP_CONTAINS(user_input, r'(vs|대비|비교|차이|유사|비슷)') THEN 7 ELSE 0 END
     + CASE WHEN (REGEXP_CONTAINS(user_input, r'주가') AND REGEXP_CONTAINS(user_input, r'뉴스'))
             OR (REGEXP_CONTAINS(user_input, r'재무') AND REGEXP_CONTAINS(user_input, r'전망')) THEN 5 ELSE 0 END
    ) as q_context,

    -- 길이적정성 (0~15)
    (CASE
      WHEN LENGTH(user_input) BETWEEN 15 AND 40 THEN 15
      WHEN LENGTH(user_input) BETWEEN 8 AND 14 THEN 10
      WHEN LENGTH(user_input) BETWEEN 41 AND 80 THEN 12
      WHEN LENGTH(user_input) BETWEEN 4 AND 7 THEN 5
      WHEN LENGTH(user_input) <= 3 THEN 2
      ELSE 8 END
    ) as q_length,

    -- 형식적정성 (0~10)
    (CASE WHEN SAFE_DIVIDE(ARRAY_LENGTH(REGEXP_EXTRACT_ALL(user_input, r'[가-힣]')), LENGTH(user_input)) >= 0.5
          THEN 5 ELSE 2 END
     + CASE WHEN NOT REGEXP_CONTAINS(user_input, r'[ㄱ-ㅎㅏ-ㅣ]{2,}') THEN 3 ELSE 0 END
     + CASE WHEN NOT REGEXP_CONTAINS(user_input, r'(시발|ㅅㅂ|ㅂㅅ|병신|개새|미친)') THEN 2 ELSE 0 END
    ) as q_formality,

    -- ========== A-Score (답변 품질) ==========
    -- 응답량 (0~25)
    (CASE
      WHEN output_tokens >= 1200 THEN 25
      WHEN output_tokens >= 800  THEN 22
      WHEN output_tokens >= 400  THEN 18
      WHEN output_tokens >= 200  THEN 14
      WHEN output_tokens >= 101  THEN 10
      WHEN output_tokens >= 61   THEN 5
      WHEN output_tokens >= 31   THEN 2
      ELSE 0 END
    ) as a_volume,

    -- 구조화 (0~25)
    (CASE WHEN REGEXP_CONTAINS(llm_response, r'\|.*\|.*\|') THEN 8 ELSE 0 END
     + CASE WHEN REGEXP_CONTAINS(llm_response, r'\*\*.*\*\*') THEN 5 ELSE 0 END
     + CASE WHEN REGEXP_CONTAINS(llm_response, r'(^|\n)[-•*]') THEN 4 ELSE 0 END
     + CASE WHEN ARRAY_LENGTH(REGEXP_EXTRACT_ALL(llm_response, r'\n')) >= 10 THEN 5
            WHEN ARRAY_LENGTH(REGEXP_EXTRACT_ALL(llm_response, r'\n')) >= 5 THEN 3 ELSE 0 END
     + CASE WHEN REGEXP_CONTAINS(llm_response, r'(---|\n#{1,3}\s)') THEN 3 ELSE 0 END
    ) as a_structure,

    -- 데이터밀도 (0~25)
    (CASE WHEN REGEXP_CONTAINS(llm_response, r'\d{1,3}(,\d{3})+') THEN 8 ELSE 0 END
     + CASE WHEN REGEXP_CONTAINS(llm_response, r'\d{4}[-/]\d{2}[-/]\d{2}') THEN 5 ELSE 0 END
     + CASE WHEN REGEXP_CONTAINS(llm_response, r'(KOSPI|KOSDAQ|코스피|코스닥)') THEN 4 ELSE 0 END
     + CASE WHEN REGEXP_CONTAINS(llm_response, r'(원|%)') THEN 4 ELSE 0 END
     + CASE WHEN REGEXP_CONTAINS(llm_response, r'\d{6}') THEN 4 ELSE 0 END
    ) as a_data,

    -- 토큰효율 (0~15)
    (CASE
      WHEN input_tokens = 0 THEN 0
      WHEN SAFE_DIVIDE(output_tokens, input_tokens) >= 0.20 THEN 15
      WHEN SAFE_DIVIDE(output_tokens, input_tokens) >= 0.15 THEN 12
      WHEN SAFE_DIVIDE(output_tokens, input_tokens) >= 0.10 THEN 8
      WHEN SAFE_DIVIDE(output_tokens, input_tokens) >= 0.05 THEN 4
      ELSE 0 END
    ) as a_efficiency,

    -- 비거절 (0~10)
    (CASE
      WHEN REGEXP_CONTAINS(llm_response, r'^(>?\s*)?죄송합니다\. 저는 (법률|금융)') THEN 0
      WHEN REGEXP_CONTAINS(llm_response, r'질문의 범위가 너무 넓어') THEN 0
      WHEN REGEXP_CONTAINS(llm_response, r'입력하신 내용을 정확히 이해하지 못했습니다') THEN 0
      WHEN REGEXP_CONTAINS(llm_response, r'죄송') AND output_tokens < 100 THEN 2
      WHEN REGEXP_CONTAINS(llm_response, r'제공되지 않') AND output_tokens >= 200 THEN 7
      WHEN REGEXP_CONTAINS(llm_response, r'죄송') AND output_tokens >= 200 THEN 8
      ELSE 10 END
    ) as a_non_refusal

  FROM `finola-global.ola_monitoring.view_ola_monitoring`
  WHERE timestamp >= TIMESTAMP("2026-01-27")
    AND user_input IS NOT NULL
    AND llm_response IS NOT NULL
),
final AS (
  SELECT *,
    -- 합산
    (q_specificity + q_intent + q_context + q_length + q_formality) as Q_Score,
    (a_volume + a_structure + a_data + a_efficiency + a_non_refusal) as A_Score,

    -- Q-Tier
    CASE
      WHEN (q_specificity + q_intent + q_context + q_length + q_formality) >= 80 THEN 'S'
      WHEN (q_specificity + q_intent + q_context + q_length + q_formality) >= 60 THEN 'A'
      WHEN (q_specificity + q_intent + q_context + q_length + q_formality) >= 40 THEN 'B'
      WHEN (q_specificity + q_intent + q_context + q_length + q_formality) >= 20 THEN 'C'
      ELSE 'D'
    END as Q_Tier,

    -- A-Grade
    CASE
      WHEN (a_volume + a_structure + a_data + a_efficiency + a_non_refusal) >= 85 THEN 'A'
      WHEN (a_volume + a_structure + a_data + a_efficiency + a_non_refusal) >= 65 THEN 'B'
      WHEN (a_volume + a_structure + a_data + a_efficiency + a_non_refusal) >= 40 THEN 'C'
      WHEN (a_volume + a_structure + a_data + a_efficiency + a_non_refusal) >= 20 THEN 'D'
      ELSE 'F'
    END as A_Grade

  FROM scored
)
SELECT
  *,
  -- Final Score (가중 합산)
  ROUND(Q_Score * 0.25 + A_Score * 0.50 + 50 * 0.25, 1) as Final_Score
  -- 참고: I_Score는 Q_Tier/A_Grade 의존으로 여기서는 50 기본값 사용
  -- 실제 구현 시 §6의 로직으로 대체
FROM final
ORDER BY Final_Score ASC
LIMIT 100;
```

---

## 9. 빠른 검증용 축약 쿼리

바로 돌려볼 수 있는 등급 분포 확인 쿼리:

```sql
-- Q-Tier × A-Grade 교차표 (2분면 매핑)
WITH ... (위의 scored, final CTE 동일)
SELECT
  Q_Tier,
  A_Grade,
  COUNT(*) as cnt,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as pct,
  ROUND(AVG(Q_Score), 1) as avg_q,
  ROUND(AVG(A_Score), 1) as avg_a
FROM final
GROUP BY Q_Tier, A_Grade
ORDER BY Q_Tier, A_Grade;
```

---

## 10. 운영 활용

### 10.1 실시간 알림 규칙

| 조건 | 알림 레벨 | 설명 |
|------|----------|------|
| `A_Score < 20` | 🔴 Critical | 답변 실패 — 즉시 확인 |
| `Q_Tier IN ('S','A') AND A_Grade IN ('D','F')` | 🔴 Critical | 좋은 질문에 나쁜 답변 — 가장 위험 |
| `A_Score < 40 AND Q_Score >= 40` | 🟡 Warning | 합리적 질문에 부족한 답변 |
| `output_tokens = 0` | 🔴 Critical | LLM 호출 자체 차단 |
| `output_tokens BETWEEN 1 AND 100` | 🟡 Warning | 답변은 했지만 매우 짧음 |

### 10.2 일일 모니터링 대시보드 KPI

| KPI | 산식 | 목표 |
|-----|------|------|
| 답변 우수율 | `A_Grade IN ('A','B') / 전체` | ≥ 90% |
| 실패율 | `A_Grade = 'F' / 전체` | ≤ 3% |
| GOLD MINE 비율 | `Q_Tier IN ('S','A') AND A_Grade IN ('D','F') / 전체` | ≤ 1% |
| 평균 Final Score | `AVG(Final_Score)` | ≥ 65 |

---

*보고서 생성: 2026-02-19 | 데이터 기반 임계값 설정: 12,831건 분석*
