<!-- Parent: ../AGENTS.md -->
# admin

## Purpose
관리자 전용 페이지 그룹입니다. 사용자/역할 관리, 저장된 필터, LLM 분석, 배치 분석, 문제 채팅 규칙 관리 기능을 제공합니다.

## Subdirectories
- `users/` - 사용자 관리 (CRUD, 역할 할당)
- `roles/` - 역할/권한 관리
- `filters/` - 저장된 필터 관리
- `analysis/` - LLM 분석 세션 (Gemini 연동 대화형 분석)
- `batch-analysis/` - 배치 채팅 품질 분석 (일일 자동 분석, 스케줄, 프롬프트)
- `problematic-rules/` - 문제 채팅 규칙 관리 (동적 규칙 엔진)

## For AI Agents
- 모든 페이지는 관리자 권한 필요 (JWT + RBAC)
- 각 디렉토리의 `page.tsx`가 메인 페이지, `components/` 하위에 로컬 컴포넌트
