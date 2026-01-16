<!-- Parent: ../AGENTS.md -->
# Quality Module

## Purpose
챗봇 품질 분석을 위한 감정 분석 서비스를 제공합니다. 사용자 질문의 감정(불만, 긴급, 감정적 표현)을 분석하고, 대화 흐름에서 불만족 신호를 탐지합니다.

## Key Files
- `sentiment-analysis.service.ts` - 감정 분석 서비스 (키워드 기반)
- `quality.module.ts` - NestJS 모듈 정의
- `index.ts` - 모듈 내보내기

## SentimentAnalysisService

### 주요 기능
1. **단일 텍스트 감정 분석** (`analyzeSentiment`)
   - frustrationLevel: 불만 수준 (0-1)
   - urgencyLevel: 긴급 수준 (0-1)
   - formalityLevel: 격식 수준 (0-1)
   - isComplaint: 불만 여부
   - detectedKeywords: 탐지된 키워드
   - emotionalPatterns: 감정 패턴 (이모티콘 등)

2. **대화 분석** (`analyzeConversation`)
   - 전체 대화의 불만 추세 분석
   - frustrationTrend: increasing/decreasing/stable
   - peakFrustrationIndex: 최고 불만 지점

3. **불만 탐지** (`detectFrustration`)
   - 액션 추천: monitor/alert/escalate

### 탐지 키워드 (한국어)
왜, 도대체, 짜증, 화나, 답답, 이상해, 바보, 멍청, 안돼, 못해, 실망, 최악, 쓰레기, 환불, 고소, 신고

### 탐지 키워드 (영어)
stupid, useless, terrible, worst, angry, frustrated, refund, sue, report

### 감정 패턴
ㅋㅋ, ㅎㅎ, ㅠㅠ, ㅜㅜ, ㅡㅡ, ;;, !!!, ???

## For AI Agents
- 감정 분석 로직 수정 시 키워드 목록과 가중치 조정 가능
- 임계값은 constructor에서 설정 가능
- BigQuery 쿼리 기반 분석과 연동하여 사용

## Dependencies
- 독립 모듈 (외부 의존성 없음)
- MetricsService와 함께 사용 권장
- SlackNotificationService와 연동하여 알림 전송 가능
