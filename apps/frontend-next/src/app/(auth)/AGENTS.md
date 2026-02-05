<!-- Parent: ../AGENTS.md -->
# (auth)/

## Purpose
Next.js Route Group for authentication pages. 괄호로 감싸진 디렉토리는 URL에 포함되지 않으며, 인증 관련 페이지들을 그룹화합니다.

## Key Files
- `AGENTS.md` - 이 문서 (layout.tsx 없음, Route Group만 제공)

## Subdirectories
- `login/` - 로그인 페이지, see login/AGENTS.md

## For AI Agents
- Route Group 디렉토리이므로 URL 경로에 포함되지 않음
- `/login` URL로 직접 접근 가능 (`/(auth)/login`이 아님)
- 현재 layout.tsx가 없어 전역 레이아웃을 상속받음
- 향후 인증 페이지 전용 레이아웃이 필요하면 여기에 layout.tsx 추가

## Dependencies
- 루트 layout.tsx 상속
- AuthContext (전역 Provider)
