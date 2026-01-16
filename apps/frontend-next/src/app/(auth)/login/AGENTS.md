<!-- Parent: ../AGENTS.md -->
# Login Page

## Purpose
관리자 로그인 페이지. JWT 인증을 통한 로그인 처리.

## Key Files
- `page.tsx` - 로그인 폼 페이지 컴포넌트

## For AI Agents
- API: POST /admin/auth/login 호출
- 로그인 성공 시 JWT 토큰을 localStorage에 저장
- AuthContext를 통해 인증 상태 관리
- 다크 모드 테마 적용
