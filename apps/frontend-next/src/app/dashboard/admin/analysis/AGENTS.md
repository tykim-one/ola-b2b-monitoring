<!-- Parent: ../AGENTS.md -->
# analysis

## Purpose
LLM 분석 세션 관리 페이지입니다. Gemini API를 사용한 대화형 데이터 분석 기능을 제공합니다.

## Key Files
- `page.tsx` - 세션 목록 페이지 (카드 그리드, 검색, 생성/삭제)
- `[id]/page.tsx` - 세션 채팅 인터페이스 (메시지 히스토리, 실시간 대화)

## Subdirectories
- `components/` - NewSessionModal

## For AI Agents
- **세션 생성**: title + optional context (metricsSnapshot 등) 첨부 가능
- **채팅 인터페이스**: POST /api/admin/analysis/sessions/:id/chat로 메시지 전송
- **컨텍스트**: 메트릭 스냅샷을 첨부하면 LLM이 데이터 기반 분석 가능
- **Gemini 모델**: gemini-2.0-flash (환경변수 설정)

## Dependencies
- Backend: `/api/admin/analysis/*` (NestJS)
- Shared types: `@ola/shared-types` (AnalysisSession, AnalysisMessage)
- LLM: Gemini API (admin/analysis/llm 모듈)
