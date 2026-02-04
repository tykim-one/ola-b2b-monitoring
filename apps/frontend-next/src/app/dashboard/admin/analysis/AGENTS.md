<!-- Parent: ../AGENTS.md -->
# analysis

## Purpose
LLM 기반 대화형 분석 세션 관리 페이지입니다. Gemini API를 통해 메트릭 데이터를 분석합니다.

## Key Files
- `page.tsx` - 분석 세션 목록 페이지

## Subdirectories
- `[id]/` - 개별 분석 세션 상세 페이지 (대화형 채팅 인터페이스)
- `components/` - 분석 페이지 로컬 컴포넌트

## For AI Agents
- 분석 세션은 ChatInterface 컴포넌트를 사용하여 LLM과 대화
- 메트릭 컨텍스트를 자동으로 LLM에 전달
