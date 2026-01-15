<!-- Parent: ../AGENTS.md -->
# services

## Purpose
외부 API 및 서비스 연동 클라이언트입니다.

## Key Files
- `geminiService.ts` - Google Gemini AI API 연동

## For AI Agents
- API 클라이언트는 이 디렉토리에 추가
- 백엔드 API 호출 시 fetch 또는 axios 사용
- 환경변수로 API URL 설정 (`NEXT_PUBLIC_API_URL`)
