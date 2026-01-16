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

### Backend (NestJS) Architecture

**Three-Layer DataSource Pattern:**
```
Controller (metrics.controller.ts)
    ↓ calls
Service (metrics.service.ts) — 캐싱 래퍼
    ↓ delegates to
DataSource Interface (MetricsDataSource) — 추상화 계층
    ↓ implemented by
BigQueryMetricsDataSource / MySQLMetricsDataSource / ... — 실제 쿼리 실행
```

새 데이터소스 추가 시 (PostgreSQL, MySQL, MongoDB 등) `MetricsDataSource` 인터페이스만 구현하면 됨.

**Module Structure:**
```
src/
├── metrics/            # 메트릭 API 모듈 (데이터소스 중립, controller, service, queries/)
├── datasource/         # DataSource 추상화 계층
│   ├── interfaces/     # MetricsDataSource 인터페이스
│   └── implementations/ # BigQueryMetricsDataSource 구현체
├── cache/              # node-cache 기반 캐싱 서비스
├── ml/anomaly/         # Z-Score 기반 이상 탐지 서비스
└── common/strategies/  # 프로젝트별 필터링 전략
```

### Frontend Structure

```
src/
├── app/               # Next.js App Router 페이지
│   └── dashboard/     # 대시보드 페이지들 (business, operations, ai-performance)
├── components/
│   ├── charts/        # Recharts 기반 차트 (AreaChart, PieChart, ScatterChart, Heatmap 등)
│   └── kpi/           # KPICard 컴포넌트 (재사용 가능)
└── services/          # API 클라이언트
```

**차트 테마:** 다크 모드 (`bg-slate-800`), Recharts 색상 팔레트 (#3b82f6, #8b5cf6, #10b981)

### API Route Pattern

모든 메트릭 API는 `/projects/:projectId/api/*` 패턴을 따릅니다 (데이터소스 중립):

- `GET /api/metrics/realtime` - 실시간 KPI (5분 캐시)
- `GET /api/metrics/hourly` - 시간별 트래픽 (15분 캐시)
- `GET /api/analytics/tenant-usage` - 테넌트별 사용량
- `GET /api/analytics/heatmap` - 사용량 히트맵
- `GET /api/analytics/cost-trend` - 비용 트렌드
- `GET /api/ai/anomaly-stats` - 이상 탐지 통계
- `GET /api/quality/*` - 품질 분석 (효율성 트렌드, 상관관계, 반복 패턴)

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

## DataSource Extension Guide

새 데이터소스 (MySQL, MongoDB 등) 추가 시:

### 1. 구현체 생성
```typescript
// src/datasource/implementations/mysql-metrics.datasource.ts
export class MySQLMetricsDataSource implements MetricsDataSource {
  // 15개 메서드 + 3개 lifecycle 메서드 구현
}
```

### 2. 설정 타입 추가 (필요시)
```typescript
// src/datasource/interfaces/datasource-config.interface.ts
export interface MongoDBDataSourceConfig {
  type: 'mongodb';
  config: { connectionString: string; database: string; collection: string; };
}
```

### 3. Factory에 케이스 추가
```typescript
// src/datasource/factory/datasource.factory.ts
case 'mysql':
  return this.createMySQLDataSource(config);
```

### 4. 설정 파일에 프로젝트별 데이터소스 지정
```json
// config/datasources.config.json
{
  "default": { "type": "bigquery", ... },
  "projects": {
    "project-b": { "type": "mysql", "config": { ... } }
  }
}
```

## BigQuery Table Schema (Flat Schema)

테이블은 플랫 스키마를 사용합니다 (Cloud Logging Sink의 jsonPayload 중첩 구조가 아님):

```
루트 레벨 필드:
- timestamp: TIMESTAMP
- tenant_id: STRING
- success: BOOL (TRUE/FALSE)
- input_tokens: STRING (CAST AS FLOAT64 필요)
- output_tokens: STRING (CAST AS FLOAT64 필요)
- total_tokens: STRING (CAST AS FLOAT64 필요)
- user_input: STRING
- llm_response: STRING
- severity: STRING (INFO/WARN/ERROR)
- request_metadata: STRUCT (service, endpoint, session_id 등 포함)
```

쿼리 작성 시 주의:
- `success` 비교: `success = TRUE` (STRING 'true' 아님)
- 토큰 값 캐스팅: `CAST(total_tokens AS FLOAT64)`
- **DATE 타입 정규화**: BigQuery는 `DATE(timestamp)`를 `{ value: '2025-01-15' }` 객체로 반환함. `bigquery-metrics.datasource.ts`의 `normalizeDate()` 헬퍼로 문자열 변환 필수.

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

각 디렉토리에 AI 에이전트를 위한 계층적 AGENTS.md 문서가 있습니다.

- **컨텍스트 탐색**: 특정 디렉토리 작업 시 해당 AGENTS.md를 먼저 읽어 목적과 구조 파악
- **상위 참조**: `<!-- Parent: ../AGENTS.md -->` 태그로 상위 컨텍스트 추적
- **문서 업데이트**: 구조 변경 시 `/deepinit --update` 실행
