<!-- Parent: ../AGENTS.md -->
# packages

## Purpose
모노레포에서 공유되는 라이브러리 패키지들을 포함합니다.

## Subdirectories
- `shared-types/` - 프론트엔드와 백엔드에서 공유하는 TypeScript 타입 정의

## For AI Agents
- 새로운 공유 타입 추가 시 `packages/shared-types/src/index.ts`에 export
- 타입 변경 후 `pnpm build`로 dist 재빌드 필요
