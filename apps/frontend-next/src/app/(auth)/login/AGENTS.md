<!-- Parent: ../AGENTS.md -->
# login

## Purpose
로그인 페이지 컴포넌트입니다. JWT 인증을 통해 관리자 대시보드에 접근합니다.

## Key Files
- `page.tsx` - 로그인 폼 페이지 (이메일/비밀번호, AuthContext의 login 함수 호출)

## For AI Agents
- 라우트: `/login`
- 인증 성공 시 `/dashboard`로 리다이렉트
- AuthContext를 통해 JWT 토큰 저장/관리
