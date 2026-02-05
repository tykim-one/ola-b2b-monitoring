<!-- Parent: ../AGENTS.md -->
# login/

## Purpose
JWT 기반 로그인 페이지. 이메일/비밀번호 인증 후 대시보드로 리다이렉트합니다.

## Key Files
- `page.tsx` - 로그인 폼 컴포넌트 (이메일/비밀백도 입력, 유효성 검사, 리다이렉트 보호)

## Subdirectories
없음

## For AI Agents
- **URL 경로**: `/login` (Route Group `(auth)` 제외)
- **주요 기능**:
  - 이메일/비밀번호 폼 검증 (클라이언트 사이드)
  - `useAuth()` 훅으로 로그인 API 호출
  - 성공 시 `/dashboard` 또는 `?redirect` 쿼리 파라미터로 지정된 경로로 이동
  - Open Redirect 취약점 방지 (`isValidRedirectPath` 함수)
- **스타일**: 화이트 테마, 중앙 정렬 카드 레이아웃
- **에러 처리**: 서버 응답 메시지를 에러 박스로 표시
- **Suspense**: LoginForm을 Suspense로 감싸 로딩 스켈레톤 제공

## Dependencies
- `@/contexts/AuthContext` - useAuth 훅으로 login 함수 호출
- `next/navigation` - useRouter, useSearchParams
