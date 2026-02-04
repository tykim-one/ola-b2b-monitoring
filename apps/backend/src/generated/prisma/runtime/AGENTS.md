<!-- Parent: ../AGENTS.md -->
# runtime

## Purpose
Prisma ORM이 자동 생성한 런타임 파일입니다. `prisma generate` 명령으로 재생성됩니다.

## Key Files
- `client.js` / `client.d.ts` - Prisma 클라이언트 런타임 및 타입 정의
- `index-browser.js` / `index-browser.d.ts` - 브라우저 호환 런타임
- `wasm-compiler-edge.js` - 엣지 환경용 WASM 컴파일러

## For AI Agents
- ⚠️ 이 디렉토리의 파일은 **자동 생성**됨 - 수동 수정 금지
- 스키마 변경 시 `pnpm prisma:generate` 실행하여 재생성
- Prisma 스키마 파일: `apps/backend/prisma/schema.prisma`
