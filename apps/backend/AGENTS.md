<!-- Parent: ../AGENTS.md -->
# backend

## Purpose
NestJS 기반 REST API 서버입니다. GCP BigQuery에서 B2B LLM 로그 데이터를 조회하고, 메트릭을 계산하며, 캐싱과 이상 탐지 기능을 제공합니다.

## Key Files
- `src/main.ts` - 애플리케이션 엔트리포인트, Swagger 설정, CORS 설정
- `src/app.module.ts` - 루트 모듈, 전역 ConfigModule 설정
- `package.json` - 의존성 및 스크립트 정의
- `nest-cli.json` - NestJS CLI 설정

## Subdirectories
- `src/` - 소스 코드 (모듈, 서비스, 컨트롤러)
- `test/` - E2E 테스트

## For AI Agents
- **개발 서버**: `pnpm start:dev` 또는 루트에서 `pnpm dev:backend`
- **테스트**: `pnpm test` (단위), `pnpm test:e2e` (E2E)
- **린트**: `pnpm lint`
- **API 문서**: 개발 서버 실행 후 `/api-docs`에서 Swagger UI 확인
- **환경변수**: `.env` 파일에 GCP 설정 필요

## Dependencies
- `@google-cloud/bigquery` - BigQuery 클라이언트
- `@nestjs/*` - NestJS 프레임워크
- `node-cache` - 인메모리 캐싱
- `class-validator` / `class-transformer` - DTO 유효성 검사
- `@ola/shared-types` - 공유 타입
