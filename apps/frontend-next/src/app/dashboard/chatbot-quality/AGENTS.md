<!-- Parent: ../AGENTS.md -->
# chatbot-quality

## Purpose
챗봇 품질 분석 페이지입니다. 신규 질문 패턴, 감정 분석, 재질문 패턴, 테넌트별 품질 요약을 제공합니다.

## Key Files
- `page.tsx` - 품질 KPI, 4개 테이블 (신규 패턴, 감정, 재질문, 테넌트 요약)

## For AI Agents
- **신규 패턴**: NEW (완전 새로운 패턴), TRENDING (급증 패턴)
- **감정 분석**: FRUSTRATED, EMOTIONAL, URGENT, NEUTRAL (사용자 감정 상태)
- **재질문 패턴**: 같은 세션에서 유사한 질문을 반복하는 경우
- **테넌트 요약**: 테넌트별 세션 성공률, 불만율, 평균 대화 턴, 평균 세션 길이

## Dependencies
- Backend: `/api/quality/chatbot/*` (NestJS)
- Service: chatbotQualityService.ts
- Shared types: `@ola/shared-types` (EmergingQueryPattern, SentimentAnalysisResult, etc.)
