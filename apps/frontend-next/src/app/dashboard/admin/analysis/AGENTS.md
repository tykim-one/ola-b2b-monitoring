<!-- Parent: ../AGENTS.md -->
# Analysis Management Page

## Purpose
LLM 분석 세션 관리 페이지. 분석 세션 목록 조회, 생성, 세션별 대화 기능.

## Key Files
- `page.tsx` - 분석 세션 목록 페이지
- `[id]/page.tsx` - 개별 분석 세션 대화 페이지

## Subdirectories
- `components/` - 페이지 전용 컴포넌트
- `[id]/` - 동적 라우트 (세션 상세)

## For AI Agents
- API: /admin/analysis 엔드포인트 사용
- LLM 채팅 인터페이스 제공
