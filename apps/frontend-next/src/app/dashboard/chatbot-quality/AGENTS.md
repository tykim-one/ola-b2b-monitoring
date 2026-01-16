<!-- Parent: ../AGENTS.md -->
# Chatbot Quality Dashboard

## Purpose
챗봇 품질 분석 대시보드입니다. 신규 질문 패턴, 감정 분석, 재질문 패턴, 테넌트별 품질 요약을 시각화합니다.

## Key Files
- `page.tsx` - 대시보드 메인 페이지

## 대시보드 구성

### KPI Cards
- 총 불만 질문 수 (FRUSTRATED 플래그)
- 신규 패턴 수 (patternType: NEW)
- 세션 성공률
- 평균 불만율

### 데이터 테이블

1. **신규 질문 패턴 (Emerging Patterns)**
   - 패턴 유형 배지: NEW (green), EMERGING (amber)
   - 최근 발생 횟수, 성장률
   - `/api/quality/emerging-patterns` 엔드포인트 사용

2. **감정 분석 (Sentiment Analysis)**
   - 감정 플래그: FRUSTRATED (red), EMOTIONAL (yellow), URGENT (orange)
   - 탐지된 키워드, 성공/실패 여부
   - `/api/quality/sentiment` 엔드포인트 사용

3. **재질문 패턴 (Rephrased Queries)**
   - 세션 ID, 질문 반복 횟수, 유사도 점수
   - 해결 여부 표시
   - `/api/quality/rephrased-queries` 엔드포인트 사용

4. **테넌트 품질 요약 (Tenant Quality Summary)**
   - 성공률 색상 코딩 (≥80% green, ≥60% amber, <60% red)
   - 불만율 경고 (>20% red, >10% amber)
   - `/api/quality/tenant-summary` 엔드포인트 사용

## 스타일링
- 다크 모드: bg-slate-800, bg-slate-900
- 색상 팔레트: emerald (성공), rose (위험), amber (경고), violet (테넌트), cyan (지표)
- 배지: 테두리 기반 + opacity 배경

## For AI Agents
- 새 차트/테이블 추가 시 Dashboard compound component 사용
- react-query로 5분 캐시 설정
- 타입은 @ola/shared-types에서 import

## Dependencies
- react-query (useQuery)
- @ola/shared-types (타입 정의)
- chatbotQualityService (API 클라이언트)
- Dashboard, DataTable, KPICard (compound components)
