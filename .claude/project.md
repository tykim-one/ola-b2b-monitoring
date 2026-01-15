# OLA B2B Monitoring 프로젝트 문서

## 프로젝트 개요

**OLA B2B Monitoring**은 GCP BigQuery 기반의 B2B LLM API 로그 모니터링 시스템입니다. pnpm 모노레포 구조로 구성되어 있으며, 실시간 대시보드 시각화, 데이터 분석, 캐싱, 이상 탐지 기능을 제공합니다.

**목적**: B2B 파트너사의 LLM API 사용량을 모니터링하고, 토큰 사용량, 비용, 에러율 등을 실시간으로 분석

---

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| **Frontend** | Next.js 16.1.1, React 19.2, Tailwind CSS 4, Recharts |
| **Backend** | NestJS 10, TypeScript 5.7, Express |
| **Database** | Google Cloud BigQuery (Cloud Logging Export) |
| **Caching** | node-cache (in-memory, Redis 전환 준비) |
| **AI** | Google Gemini API (로그 분석) |
| **Monorepo** | pnpm workspace |

---

## 디렉토리 구조

```
ola-b2b-monitoring/
├── apps/
│   ├── backend/              # NestJS API 서버 (Port 3000)
│   │   ├── src/
│   │   │   ├── bigquery/     # BigQuery 연동 (서비스, 컨트롤러, 쿼리)
│   │   │   │   ├── bigquery.module.ts
│   │   │   │   ├── bigquery.service.ts    # 핵심 비즈니스 로직
│   │   │   │   ├── bigquery.controller.ts # REST API 엔드포인트
│   │   │   │   └── queries/
│   │   │   │       └── metrics.queries.ts # SQL 쿼리 템플릿
│   │   │   ├── cache/        # 인메모리 캐시 레이어
│   │   │   │   ├── cache.module.ts
│   │   │   │   └── cache.service.ts
│   │   │   ├── ml/anomaly/   # Z-Score 이상 탐지
│   │   │   │   ├── anomaly.service.ts
│   │   │   │   └── anomaly.controller.ts
│   │   │   └── common/       # 공통 유틸리티
│   │   └── service-account.json  # GCP 서비스 계정 (gitignore)
│   │
│   └── frontend-next/        # Next.js 대시보드 (Port 3001)
│       └── src/
│           ├── app/          # App Router 페이지
│           │   ├── dashboard/
│           │   │   ├── page.tsx              # 메인 대시보드
│           │   │   ├── operations/page.tsx   # 운영 모니터링
│           │   │   ├── business/page.tsx     # 비즈니스 분석
│           │   │   └── ai-performance/page.tsx # AI 성능
│           │   ├── logs/page.tsx             # 로그 탐색기
│           │   └── architecture/page.tsx     # 아키텍처 뷰
│           ├── components/   # 재사용 컴포넌트
│           │   ├── charts/   # Recharts 차트 컴포넌트
│           │   │   ├── RealtimeTrafficChart.tsx
│           │   │   ├── TenantPieChart.tsx
│           │   │   ├── CostTrendChart.tsx
│           │   │   ├── ErrorGauge.tsx
│           │   │   ├── TokenScatterPlot.tsx
│           │   │   └── UsageHeatmap.tsx
│           │   ├── kpi/
│           │   │   └── KPICard.tsx
│           │   ├── Sidebar.tsx
│           │   └── LogExplorer.tsx
│           └── services/
│               └── geminiService.ts  # Gemini AI 연동
│
├── packages/
│   └── shared-types/         # 공유 TypeScript 타입
│       └── src/index.ts
│
└── docs/                     # 문서
    ├── BACKEND_IMPLEMENTATION.md
    ├── FRONTEND_IMPLEMENTATION.md
    └── USAGE_GUIDE.md
```

---

## 핵심 데이터 모델 (packages/shared-types)

```typescript
// 실시간 KPI
interface RealtimeKPI {
  total_requests: number;
  success_count: number;
  fail_count: number;
  error_rate: number;
  total_tokens: number;
  avg_tokens: number;
  total_input_tokens: number;
  total_output_tokens: number;
  active_tenants: number;
}

// B2B 로그 (BigQuery jsonPayload 구조)
interface B2BLog {
  user_input: string;
  timestamp: { value: string } | string;
  tenant_id: string;
  llm_response: string;
  // Optional fields
  id?: string;
  level?: LogLevel;
  latencyMs?: number;
  partnerId?: string;
  statusCode?: number;
}

// 테넌트 사용량
interface TenantUsage {
  tenant_id: string;
  request_count: number;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  avg_tokens: number;
  fail_count: number;
  error_rate: number;
}

// 비용 추이
interface CostTrend {
  date: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  input_cost: number;
  output_cost: number;
  total_cost: number;
}

// 이상 탐지 통계
interface AnomalyStats {
  tenant_id: string;
  avg_tokens: number;
  stddev_tokens: number;
  avg_input_tokens: number;
  stddev_input_tokens: number;
  sample_count: number;
  p99_tokens: number;
}
```

---

## Backend API 엔드포인트

### 메트릭 API
| Method | Endpoint | 설명 | TTL |
|--------|----------|------|-----|
| GET | `/projects/:projectId/bigquery/metrics/realtime` | 실시간 KPI (24시간) | 5분 |
| GET | `/projects/:projectId/bigquery/metrics/hourly` | 시간별 트래픽 | 15분 |
| GET | `/projects/:projectId/bigquery/metrics/daily` | 일별 트래픽 (30일) | 15분 |

### 분석 API
| Method | Endpoint | 설명 | TTL |
|--------|----------|------|-----|
| GET | `/projects/:projectId/bigquery/analytics/tenant-usage?days=N` | 테넌트별 사용량 | 15분 |
| GET | `/projects/:projectId/bigquery/analytics/cost-trend` | 비용 추이 | 15분 |
| GET | `/projects/:projectId/bigquery/analytics/heatmap` | 요일x시간 히트맵 | 15분 |
| GET | `/projects/:projectId/bigquery/analytics/errors` | 에러 분석 | 15분 |

### AI 분석 API
| Method | Endpoint | 설명 | TTL |
|--------|----------|------|-----|
| GET | `/projects/:projectId/bigquery/ai/token-efficiency` | 토큰 효율성 | 15분 |
| GET | `/projects/:projectId/bigquery/ai/anomaly-stats` | 이상 탐지 통계 | 5분 |
| GET | `/projects/:projectId/bigquery/ai/query-patterns` | 쿼리 패턴 | 15분 |

### ML 이상 탐지 API
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/projects/:projectId/ml/anomaly/detect` | 종합 이상 탐지 |
| GET | `/projects/:projectId/ml/anomaly/tokens` | 토큰 이상 |
| GET | `/projects/:projectId/ml/anomaly/errors` | 에러율 이상 |
| GET | `/projects/:projectId/ml/anomaly/traffic` | 트래픽 스파이크 |

### 캐시 관리 API
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/projects/:projectId/bigquery/cache/stats` | 캐시 통계 |
| DELETE | `/projects/:projectId/bigquery/cache` | 캐시 초기화 |

### 기타
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/projects/:projectId/bigquery/logs?limit=N` | 샘플 로그 조회 |
| POST | `/projects/:projectId/bigquery/query` | 커스텀 SQL 실행 |
| GET | `/api` | Swagger 문서 |

---

## Frontend 주요 페이지

| 경로 | 기능 | 주요 컴포넌트 |
|------|------|--------------|
| `/dashboard` | 메인 대시보드 개요 | Dashboard.tsx |
| `/dashboard/operations` | 운영 모니터링 (KPI, 트래픽, 에러) | KPICard, RealtimeTrafficChart, ErrorGauge |
| `/dashboard/business` | 비즈니스 분석 (테넌트, 비용) | TenantPieChart, CostTrendChart, UsageHeatmap |
| `/dashboard/ai-performance` | AI 성능 (토큰 효율, 이상 탐지) | TokenScatterPlot, AnomalyStats |
| `/logs` | 로그 탐색기 + Gemini AI 분석 | LogExplorer, geminiService |
| `/architecture` | 시스템 아키텍처 시각화 | ArchitectureView |

---

## 이상 탐지 알고리즘

**Z-Score 기반 탐지**: `Z = (X - μ) / σ`

| 타입 | 조건 | 심각도 |
|------|------|--------|
| `token_spike` | 토큰 > P99 또는 \|Z\| ≥ 2 | medium~critical |
| `error_rate` | 에러율 > 5% | medium~critical |
| `traffic_spike` | 트래픽 \|Z\| ≥ 2 | medium~critical |

**심각도 매핑**:
- \|Z\| ≥ 4 → critical
- \|Z\| ≥ 3 → high
- \|Z\| ≥ 2 → medium

---

## 캐싱 전략

| TTL | 상수 | 데이터 유형 |
|-----|------|------------|
| 60초 | HEALTH | 헬스 체크 |
| 300초 (5분) | SHORT | 실시간 KPI, 에러 메트릭 |
| 900초 (15분) | MEDIUM | 시계열 데이터, 차트, 집계 |
| 3600초 (1시간) | LONG | 정적 참조 데이터 |

---

## 실행 방법

```bash
# 의존성 설치
pnpm install

# 전체 개발 서버 실행 (Frontend + Backend)
pnpm dev:all

# Backend만 실행 (Port 3000)
pnpm dev:backend

# Frontend만 실행 (Port 3001)
pnpm dev:frontend-next

# 빌드
pnpm build

# Swagger 문서
# http://localhost:3000/api
```

---

## 환경 변수

### Backend (.env)
```env
PORT=3000
GCP_PROJECT_ID=finola-global
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
BIGQUERY_DATASET=ola_monitoring
BIGQUERY_TABLE=view_ola_monitoring
CORS_ORIGIN=http://localhost:3001
GCP_BQ_LOCATION=asia-northeast3
```

### Frontend (.env)
```env
GEMINI_API_KEY=<your_gemini_api_key>
```

---

## BigQuery 스키마 (Cloud Logging Export)

테이블: `${GCP_PROJECT_ID}.${BIGQUERY_DATASET}.${BIGQUERY_TABLE}`

```sql
-- jsonPayload 구조 (STRUCT/RECORD 타입)
jsonPayload.tenant_id       STRING    -- 테넌트 ID
jsonPayload.user_input      STRING    -- 사용자 입력
jsonPayload.llm_response    STRING    -- LLM 응답
jsonPayload.input_tokens    FLOAT64   -- 입력 토큰
jsonPayload.output_tokens   FLOAT64   -- 출력 토큰
jsonPayload.total_tokens    FLOAT64   -- 총 토큰
jsonPayload.success         BOOL      -- 성공 여부
timestamp                   TIMESTAMP -- 로그 타임스탬프
```

---

## 확장 포인트

### 1. 새 메트릭 쿼리 추가
1. `apps/backend/src/bigquery/queries/metrics.queries.ts`에 SQL 추가
2. `bigquery.service.ts`에 캐싱 적용된 메서드 추가
3. `bigquery.controller.ts`에 엔드포인트 추가

### 2. 새 이상 탐지 규칙 추가
`apps/backend/src/ml/anomaly/anomaly.service.ts`의 `detectAnomalies` 메서드에 규칙 추가

### 3. Redis 캐시로 전환
`cache.service.ts`에서 `node-cache` → `ioredis` 교체

### 4. 예측 모델 추가 (계획)
`apps/backend/src/ml/forecast/` - Prophet/ARIMA 기반 사용량 예측

---

## 주요 의존성

### Backend
- `@nestjs/core` ^10.0.0
- `@google-cloud/bigquery` ^7.0.0
- `node-cache` ^5.1.2
- `class-validator` ^0.14.0
- `@nestjs/swagger` ^8.0.0

### Frontend
- `next` 16.1.1
- `react` 19.2.3
- `recharts` ^3.6.0
- `tailwindcss` ^4.0.0
- `@google/genai` ^1.35.0
- `lucide-react` ^0.513.0

---

## Git 정보

- **Main Branch**: dev
- **최근 커밋**:
  - 76c4b7b - 모니터링 대시보드 및 데이터 시각화 + 캐싱 및 이상 탐지
  - 307629a - 아키텍처 기본 세팅
  - f9359f4 - BigQuery 출력
  - 300abc6 - React → Next.js 마이그레이션
  - d8a85d8 - Backend 추가 및 GCP 연동
