<!-- Parent: ../AGENTS.md -->
# Admin Dashboard

## Purpose
관리자 전용 대시보드 페이지 모음. 사용자 관리, 역할 관리, 필터 관리, 분석 세션 관리 기능 제공.

## Subdirectories
- `users/` - 사용자 계정 관리 페이지
- `roles/` - 역할 관리 페이지
- `filters/` - 데이터 필터 관리 페이지
- `analysis/` - LLM 분석 세션 관리 페이지

## For AI Agents
- 모든 페이지는 JWT 인증 필요 (AuthContext 사용)
- 관리자 권한 체크 필요 (ADMIN 역할)
- 다크 모드 테마 적용 (bg-slate-900)
