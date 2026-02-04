<!-- Parent: ../AGENTS.md -->
# frontend-next

## Purpose
Next.js 16 + React 19 기반 B2B LLM 모니터링 대시보드입니다. Recharts 시각화, Tailwind CSS 스타일링, TanStack Query 서버 상태 관리를 사용합니다.

## Key Files
- `package.json` - 의존성 (Next.js 16, React 19, TanStack Query, Recharts, Zustand, Zod)
- `next.config.ts` - Next.js 빌드 설정
- `tailwind.config.js` - Tailwind CSS 테마, 플러그인
- `postcss.config.mjs` - PostCSS 설정
- `eslint.config.mjs` - ESLint 규칙

## Subdirectories
- `public/` - 정적 자산 (아이콘, SVG) (see public/AGENTS.md)
- `src/` - 소스 코드 (see src/AGENTS.md)

## For AI Agents
- **개발 서버**: `pnpm dev:frontend-next` (포트 3001)
- **빌드**: `pnpm build:frontend-next`
- **환경변수**: `.env.local`에 `NEXT_PUBLIC_API_URL` 설정
- **차트 테마**: 다크 모드 (`bg-slate-800`), 색상 팔레트 (#3b82f6, #8b5cf6, #10b981)
- **인증**: AuthContext에서 JWT 관리, api-client.ts에서 자동 토큰 갱신

## Dependencies
- `@ola/shared-types` - 백엔드 공유 TypeScript 타입
- Backend API (포트 3000) - REST API 엔드포인트
