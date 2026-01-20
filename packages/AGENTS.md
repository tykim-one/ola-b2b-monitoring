<!-- Parent: ../AGENTS.md -->
# packages

## Purpose
모노레포 공유 패키지들. 프론트엔드와 백엔드에서 공유하는 타입 정의 및 공통 유틸리티를 포함합니다.

## Subdirectories
- `shared-types/` - @ola/shared-types 패키지 (프론트/백엔드 공유 TypeScript 타입)

## For AI Agents
- 타입 변경 후 `cd packages/shared-types && pnpm build` 필요
- 프론트/백엔드에서 `import from '@ola/shared-types'`로 사용
- 새로운 공유 타입 추가 시 `packages/shared-types/src/index.ts`에 export 추가
