# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Required Actions (MUST FOLLOW)

- **AGENTS.md 자동 갱신**: 새 디렉토리 생성, 디렉토리 삭제, 디렉토리 구조 변경 작업 완료 후 **반드시** `/deepinit --update` 명령을 실행하여 AGENTS.md 문서를 갱신할 것

## Project Overview

OLA B2B Monitoring - GCP BigQuery 기반 B2B LLM 로그 모니터링 대시보드 시스템입니다. 테넌트별 LLM 사용량, 토큰 효율성, 비용 트렌드, 이상 탐지 등을 시각화합니다.

## Commands

```bash
# 전체 스택 동시 개발 서버 실행
pnpm dev:all

# 개별 실행
pnpm dev:frontend-next  # Next.js 프론트엔드 (포트 3001)
pnpm dev:backend        # NestJS 백엔드 (포트 3000)

# 빌드
pnpm build              # 전체 빌드
pnpm build:frontend-next
pnpm build:backend

# 테스트 (백엔드)
cd apps/backend
pnpm test               # 전체 테스트
pnpm test:watch         # 워치 모드
pnpm test -- --testPathPattern="bigquery"  # 특정 테스트

# 린트
cd apps/backend && pnpm lint
cd apps/frontend-next && pnpm lint

# 공유 타입 빌드
cd packages/shared-types && pnpm build
```

## Architecture

### Monorepo Structure (pnpm workspaces)

- **apps/backend**: NestJS API 서버 - BigQuery 연동, 캐싱, 이상 탐지
- **apps/frontend-next**: Next.js 16 + React 19 대시보드 - Recharts 시각화
- **packages/shared-types**: `@ola/shared-types` - 프론트/백엔드 공유 TypeScript 타입

### Backend (NestJS) Module Structure

```
src/
├── bigquery/          # BigQuery 연동 모듈
│   ├── bigquery.service.ts    # 쿼리 실행, 메트릭 조회 (캐싱 적용)
│   ├── bigquery.controller.ts # REST API 엔드포인트
│   └── queries/               # SQL 쿼리 빌더
├── cache/             # node-cache 기반 캐싱 서비스
├── ml/anomaly/        # Z-Score 기반 이상 탐지 서비스
└── common/strategies/ # 프로젝트별 필터링 전략
```

### Frontend Component Structure

```
src/
├── app/               # Next.js App Router 페이지
│   ├── dashboard/     # 대시보드 라우트
│   └── [projectId]/   # 프로젝트별 동적 라우트
├── components/
│   ├── charts/        # Recharts 기반 차트 컴포넌트
│   │   ├── RealtimeTrafficChart.tsx
│   │   ├── CostTrendChart.tsx
│   │   ├── UsageHeatmap.tsx
│   │   ├── TenantPieChart.tsx
│   │   └── TokenScatterPlot.tsx
│   ├── kpi/           # KPI 카드 컴포넌트
│   ├── Dashboard.tsx
│   ├── LogExplorer.tsx
│   └── Sidebar.tsx
└── services/          # API 클라이언트
```

### API Route Pattern

모든 API는 `/projects/:projectId/bigquery/*` 패턴을 따릅니다:

- `GET /metrics/realtime` - 실시간 KPI (5분 캐시)
- `GET /metrics/hourly` - 시간별 트래픽 (15분 캐시)
- `GET /analytics/tenant-usage` - 테넌트별 사용량
- `GET /analytics/heatmap` - 사용량 히트맵
- `GET /analytics/cost-trend` - 비용 트렌드
- `GET /ai/anomaly-stats` - 이상 탐지 통계

### Caching Strategy

`CacheService`는 세 가지 TTL을 사용합니다:
- `SHORT` (5분): 실시간 KPI, 에러 분석, 이상 탐지
- `MEDIUM` (15분): 시간별/일별 트래픽, 테넌트 사용량
- `LONG` (1시간): 정적 데이터

### Shared Types

`@ola/shared-types` 패키지에서 타입을 import하여 프론트/백엔드 타입 안전성을 보장합니다:
```typescript
import { RealtimeKPI, HourlyTraffic, TenantUsage } from '@ola/shared-types';
```

## Environment Variables

Backend (`apps/backend/.env`):
```env
PORT=3000
GCP_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
BIGQUERY_DATASET=your_dataset
BIGQUERY_TABLE=logs
GCP_BQ_LOCATION=asia-northeast3
CORS_ORIGIN=http://localhost:3001
```

Frontend (`apps/frontend-next/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## AGENTS.md Documentation System

이 프로젝트는 계층적 AGENTS.md 문서 시스템을 사용합니다. 각 디렉토리에 AI 에이전트를 위한 컨텍스트 문서가 있습니다.

### 문서 구조

```
/AGENTS.md (루트 - 프로젝트 전체 개요)
├── apps/AGENTS.md
│   ├── backend/AGENTS.md
│   │   └── src/AGENTS.md
│   │       ├── bigquery/AGENTS.md (+ dto/, queries/)
│   │       ├── cache/AGENTS.md
│   │       ├── common/AGENTS.md (+ strategies/)
│   │       └── ml/AGENTS.md (+ anomaly/)
│   └── frontend-next/AGENTS.md
│       └── src/AGENTS.md
│           ├── app/AGENTS.md (+ dashboard/)
│           ├── components/AGENTS.md (+ charts/, kpi/)
│           ├── entities/AGENTS.md
│           ├── features/AGENTS.md
│           ├── widgets/AGENTS.md
│           ├── services/AGENTS.md
│           └── lib/AGENTS.md
├── packages/AGENTS.md
│   └── shared-types/AGENTS.md (+ src/)
└── docs/AGENTS.md
```

### AGENTS.md 활용법

- **컨텍스트 탐색**: 특정 디렉토리 작업 시 해당 AGENTS.md를 먼저 읽어 목적과 구조 파악
- **상위 참조**: 각 파일의 `<!-- Parent: ../AGENTS.md -->` 태그로 상위 컨텍스트 추적
- **작업 지침**: "For AI Agents" 섹션에서 해당 디렉토리 작업 시 주의사항 확인

### 문서 업데이트

코드베이스 구조 변경 시 `/deepinit --update` 명령으로 AGENTS.md 파일들을 갱신할 수 있습니다.
