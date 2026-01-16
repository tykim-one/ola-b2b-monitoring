<!-- Parent: ../AGENTS.md -->
# [id]

## Purpose
분석 세션 상세 페이지입니다. 동적 라우트로 특정 분석 세션의 채팅 인터페이스를 제공합니다.

## Key Files
- `page.tsx` - 분석 세션 상세 페이지 (채팅 UI)

## For AI Agents
- **동적 라우트**: URL 파라미터 `id`로 세션 식별
- **params 접근**: `params.id`로 세션 ID 추출
- **채팅 인터페이스**: 사용자 질문 → LLM 응답 스트리밍 형태
- **세션 상태**: 세션 메타데이터 및 메시지 히스토리 표시
