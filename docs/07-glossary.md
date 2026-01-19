# 용어 사전

OLA B2B Monitoring 시스템에서 사용되는 주요 용어를 설명합니다.

---

## 비즈니스 용어

### 테넌트 (Tenant)
B2B 서비스를 이용하는 **기업 고객**을 의미합니다. 예를 들어 A회사, B회사가 각각 하나의 테넌트입니다. 테넌트별로 사용량, 비용, 품질을 별도로 추적합니다.

### 토큰 (Token)
LLM(대규모 언어 모델)이 텍스트를 처리할 때 사용하는 **기본 단위**입니다. 대략 한글 1글자 = 1~2 토큰, 영어 1단어 = 1 토큰 정도입니다.

- **입력 토큰 (Input Token)**: 사용자가 질문한 내용의 토큰 수
- **출력 토큰 (Output Token)**: AI가 응답한 내용의 토큰 수
- **총 토큰**: 입력 + 출력 토큰의 합계

토큰 수에 따라 API 비용이 발생합니다.

### KPI (Key Performance Indicator)
핵심 성과 지표입니다. 이 시스템에서 주로 사용하는 KPI:
- **총 요청 수**: 특정 기간 동안 들어온 API 요청 횟수
- **성공률**: 요청 중 정상 처리된 비율 (%)
- **평균 토큰**: 요청당 평균 토큰 사용량
- **활성 테넌트**: 해당 기간에 서비스를 이용한 고객 수

### 세션 (Session)
한 사용자가 서비스를 이용하는 **연속된 대화 흐름**입니다. 한 세션 내에서 여러 질문과 답변이 오갈 수 있습니다.

### 배치 분석 (Batch Analysis)
매일 자동으로 실행되는 **대량 품질 검사**입니다. 전날의 대화 로그 중 일부를 샘플링하여 AI가 품질을 평가합니다.

---

## 품질 관련 용어

### 품질 점수 (Quality Score)
AI가 대화의 품질을 1~10점으로 평가한 점수입니다.
- **관련성 (Relevance)**: 답변이 질문과 관련있는지
- **완결성 (Completeness)**: 답변이 충분히 상세한지
- **명확성 (Clarity)**: 답변이 이해하기 쉬운지

### 감정 분석 (Sentiment Analysis)
사용자의 질문에서 **감정 상태**를 분석합니다.
- **긍정 (Positive)**: 만족, 감사 표현
- **중립 (Neutral)**: 일반적인 질문
- **부정 (Negative)**: 불만, 짜증 표현

### 재질문 패턴 (Rephrased Query)
같은 세션 내에서 **비슷한 질문을 반복**하는 패턴입니다. 첫 답변이 만족스럽지 않아 다시 질문하는 경우로, 품질 개선이 필요한 신호입니다.

### FAQ 패턴 (Repeated Query Pattern)
여러 사용자가 **자주 묻는 질문**입니다. FAQ로 등록하면 더 빠르고 정확한 답변을 제공할 수 있습니다.

### 이상 탐지 (Anomaly Detection)
평소와 다른 **비정상적인 패턴**을 자동으로 감지합니다. 예: 갑자기 토큰 사용량이 급증하거나, 에러율이 높아지는 경우

---

## 기술 용어

### API (Application Programming Interface)
소프트웨어 간에 데이터를 주고받는 **통신 규약**입니다. 프론트엔드(화면)와 백엔드(서버)가 API를 통해 데이터를 교환합니다.

### REST API
웹에서 가장 널리 쓰이는 API 방식입니다. URL로 리소스를 지정하고, HTTP 메서드(GET, POST 등)로 작업을 수행합니다.

### JWT (JSON Web Token)
로그인 인증에 사용되는 **디지털 신분증**입니다. 로그인하면 JWT를 발급받고, 이후 요청에 JWT를 첨부하여 본인임을 증명합니다.

### RBAC (Role-Based Access Control)
역할 기반 접근 제어입니다. 사용자에게 역할(관리자, 분석가, 뷰어 등)을 부여하고, 역할에 따라 접근 가능한 기능을 제한합니다.

### BigQuery
Google Cloud에서 제공하는 **대용량 데이터 분석 서비스**입니다. 이 시스템에서는 모든 LLM 로그를 BigQuery에 저장하고 분석합니다.

### LLM (Large Language Model)
대규모 언어 모델입니다. ChatGPT, Gemini 같은 AI가 LLM의 예시입니다. 사용자의 질문을 이해하고 답변을 생성합니다.

### Gemini
Google에서 만든 LLM입니다. 이 시스템에서는 품질 분석과 AI 챗봇에 Gemini를 사용합니다.

---

## 시스템 용어

### 대시보드 (Dashboard)
데이터를 시각적으로 보여주는 **화면**입니다. 차트, 그래프, 테이블 등으로 복잡한 데이터를 쉽게 이해할 수 있습니다.

### 히트맵 (Heatmap)
데이터의 크기를 **색상 농도**로 표현한 차트입니다. 예: 시간대별 사용량을 밝은 색(적음)~진한 색(많음)으로 표시

### 캐시 (Cache)
자주 요청되는 데이터를 **임시 저장**하여 빠르게 응답하는 기술입니다. 이 시스템은 5분~1시간 단위로 캐시를 사용합니다.

### 모노레포 (Monorepo)
여러 프로젝트(프론트엔드, 백엔드, 공유 라이브러리)를 **하나의 저장소**에서 관리하는 방식입니다.

### Prisma
데이터베이스를 쉽게 다루기 위한 **도구**입니다. SQL을 직접 작성하지 않고 코드로 DB를 조작할 수 있습니다.

---

## 약어 모음

| 약어 | 전체 명칭 | 의미 |
|------|----------|------|
| API | Application Programming Interface | 프로그램 간 통신 규약 |
| B2B | Business to Business | 기업 간 거래 |
| CRUD | Create, Read, Update, Delete | 기본 데이터 작업 |
| DB | Database | 데이터베이스 |
| JWT | JSON Web Token | 인증 토큰 |
| KPI | Key Performance Indicator | 핵심 성과 지표 |
| LLM | Large Language Model | 대규모 언어 모델 |
| RBAC | Role-Based Access Control | 역할 기반 접근 제어 |
| REST | Representational State Transfer | API 설계 방식 |
| SQL | Structured Query Language | DB 질의 언어 |
| TTL | Time To Live | 캐시 유효 시간 |
| UI | User Interface | 사용자 화면 |
| UX | User Experience | 사용자 경험 |

---

## 관련 문서

- [프로젝트 개요](./01-overview.md) - 시스템 전체 소개
- [기능 가이드](./02-features.md) - 실제 사용 방법
