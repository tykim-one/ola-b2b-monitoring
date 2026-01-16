<!-- Parent: ../AGENTS.md -->
# services

## Purpose
외부 API 및 서비스 연동 클라이언트입니다.

## Key Files
- `geminiService.ts` - Google Gemini AI API 연동
- `analysisService.ts` - LLM 분석 세션 관리 API
- `userAnalyticsService.ts` - 유저 분석 API (x_enc_data 기준)
  - `fetchUserRequestCounts()` - 유저별 요청 수 조회
  - `fetchUserTokenUsage()` - 유저별 토큰 사용량 조회
  - `fetchUserQuestionPatterns()` - 유저별 질문 패턴 조회
  - `fetchUserList()` - 유저 목록 (통합 통계) 조회
  - `fetchUserActivity()` - 유저 활동 상세 (대화 이력) 조회

## For AI Agents
- API 클라이언트는 이 디렉토리에 추가
- 백엔드 API 호출 시 fetch 또는 axios 사용
- 환경변수로 API URL 설정 (`NEXT_PUBLIC_API_URL`)
