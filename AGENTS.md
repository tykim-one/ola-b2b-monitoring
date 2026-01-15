# OLA B2B Monitoring

## Purpose
GCP BigQuery 기반 B2B LLM 로그 모니터링 대시보드 시스템입니다. 테넌트별 LLM 사용량, 토큰 효율성, 비용 트렌드, 이상 탐지 등을 시각화합니다.

## Key Files
- `package.json` - 루트 워크스페이스 설정, 통합 스크립트
- `pnpm-workspace.yaml` - pnpm 모노레포 워크스페이스 정의
- `CLAUDE.md` - Claude Code용 프로젝트 가이드

## Subdirectories
- `apps/` - 애플리케이션 패키지들 (backend, frontend-next)
- `packages/` - 공유 라이브러리 (@ola/shared-types)
- `docs/` - 프로젝트 문서

## For AI Agents
- **개발 서버**: `pnpm dev:all`로 프론트엔드(3001)와 백엔드(3000) 동시 실행
- **타입 공유**: 프론트/백엔드 간 타입은 `@ola/shared-types`에서 import
- **API 패턴**: 모든 API는 `/projects/:projectId/bigquery/*` 경로를 따름
- **환경변수**: 백엔드는 `apps/backend/.env`, 프론트엔드는 `apps/frontend-next/.env.local`

## Architecture Overview
```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 16)                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌──────────────┐   │
│  │Dashboard│  │  KPI    │  │ Charts  │  │ LogExplorer  │   │
│  └────┬────┘  └────┬────┘  └────┬────┘  └──────┬───────┘   │
└───────┼────────────┼────────────┼───────────────┼───────────┘
        │            │            │               │
        └────────────┴─────┬──────┴───────────────┘
                           │ HTTP (REST API)
┌──────────────────────────┼──────────────────────────────────┐
│                    Backend (NestJS)                          │
│  ┌───────────────┐  ┌─────────────┐  ┌────────────────┐    │
│  │BigQueryModule │  │CacheModule  │  │ MlModule       │    │
│  │(데이터 조회)   │  │(node-cache) │  │(이상 탐지)     │    │
│  └───────┬───────┘  └──────┬──────┘  └───────┬────────┘    │
└──────────┼─────────────────┼─────────────────┼──────────────┘
           │                 │                 │
           └─────────────────┼─────────────────┘
                             │
                    ┌────────▼────────┐
                    │  GCP BigQuery   │
                    │  (로그 데이터)   │
                    └─────────────────┘
```

## Dependencies
- GCP BigQuery 연동 (서비스 계정 필요)
- pnpm (패키지 매니저)
- Node.js 20+
