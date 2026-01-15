<!-- Parent: ../AGENTS.md -->
# apps

## Purpose
모노레포의 애플리케이션 패키지들을 포함합니다. 백엔드 API 서버와 프론트엔드 대시보드가 여기에 위치합니다.

## Subdirectories
- `backend/` - NestJS 기반 REST API 서버 (BigQuery 연동, 캐싱, 이상 탐지)
- `frontend-next/` - Next.js 16 기반 모니터링 대시보드 (React 19, Recharts)

## For AI Agents
- 각 앱은 독립적인 package.json과 설정을 가짐
- 앱 간 타입 공유는 `@ola/shared-types` 워크스페이스 패키지를 통해 이루어짐
- 개별 실행: `pnpm dev:backend` 또는 `pnpm dev:frontend-next`
