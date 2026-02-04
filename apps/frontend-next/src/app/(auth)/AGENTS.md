<!-- Parent: ../AGENTS.md -->
# (auth)

## Purpose
Next.js App Router의 인증 레이아웃 그룹입니다. 로그인 등 인증 관련 페이지를 별도 레이아웃으로 감쌉니다.

## Subdirectories
- `login/` - 로그인 페이지 (see login/AGENTS.md)

## For AI Agents
- 괄호 `()` 그룹은 URL 경로에 포함되지 않음 (라우트: `/login`)
- 인증되지 않은 사용자만 접근 가능 (middleware.ts에서 리다이렉트 처리)
