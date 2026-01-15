<!-- Parent: ../AGENTS.md -->
# shared-types

## Purpose
프론트엔드와 백엔드에서 공유하는 TypeScript 타입 정의 패키지입니다. `@ola/shared-types`로 import하여 사용합니다.

## Key Files
- `src/index.ts` - 모든 타입 정의 및 export
- `package.json` - 패키지 설정, 빌드 스크립트
- `tsconfig.json` - TypeScript 컴파일 설정

## Subdirectories
- `src/` - 타입 정의 소스
- `dist/` - 컴파일된 .js 및 .d.ts 파일 (빌드 후 생성)

## For AI Agents
- **빌드**: `pnpm build` (tsc로 dist/ 생성)
- **워치 모드**: `pnpm dev`
- **사용법**: `import { RealtimeKPI, B2BLog } from '@ola/shared-types'`
- 새 타입 추가 시 `src/index.ts`에 export 추가 필요
- 타입 변경 후 반드시 빌드하여 dist/ 갱신

## Type Categories
- **B2BLog** - 기본 로그 타입
- **RealtimeKPI, HourlyTraffic, DailyTraffic** - 메트릭 타입
- **TenantUsage, CostTrend** - 분석 타입
- **AnomalyStats, TokenEfficiency** - AI/ML 타입
- **ApiResponse, CacheStats** - API 응답 타입
