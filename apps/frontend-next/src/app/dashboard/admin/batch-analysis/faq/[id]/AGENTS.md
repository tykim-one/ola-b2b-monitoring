<!-- Parent: ../AGENTS.md -->
# [id]

## Purpose
특정 FAQ 클러스터의 상세 분석 페이지입니다. 클러스터에 포함된 질문들, 발생 빈도, LLM 분석 결과 등을 표시합니다.

## Key Files
- `page.tsx` - FAQ 클러스터 상세 페이지 컴포넌트

## For AI Agents
- 동적 라우트: `[id]` 파라미터로 클러스터 ID 전달
- 백엔드 FAQ Analysis API 연동
- 관련 컴포넌트: `src/components/faq-analysis/`

## Dependencies
- `faq-analysis` 백엔드 서비스
- FAQ 분석 컴포넌트
