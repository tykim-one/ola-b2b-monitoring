<!-- Parent: ../AGENTS.md -->
# login

## Purpose
로그인 페이지입니다. JWT 인증으로 사용자 로그인 처리 및 redirect 관리를 수행합니다.

## Key Files
- `page.tsx` - 로그인 폼, 유효성 검사, 리다이렉트 처리

## For AI Agents
- **인증 방식**: JWT (Access Token 15분, Refresh Token 7일)
- **리다이렉트 보안**: `isValidRedirectPath()` 함수로 open redirect 취약점 방지
- **허용 경로**: `/dashboard`, `/logs`, `/admin`으로 시작하는 내부 경로만 허용
- **폼 검증**: 이메일 형식, 비밀번호 최소 6자
- **에러 처리**: 백엔드 에러 메시지 표시

## Dependencies
- AuthContext: useAuth() 훅 (login 함수)
- Backend: `/api/admin/auth/login`
- Next.js: useRouter, useSearchParams (Suspense로 래핑)
