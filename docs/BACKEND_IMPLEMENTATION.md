# Backend 구현 내역

## 개요
NestJS 기반 백엔드에 캐싱 레이어, 메트릭 API, 이상 탐지 모듈을 구현했습니다.

---

## 1. 캐싱 레이어

### 1.1 파일 구조
```
apps/backend/src/
├── cache/
│   ├── cache.module.ts      # 글로벌 캐시 모듈
│   └── cache.service.ts     # In-Memory 캐시 서비스
```

### 1.2 CacheService 주요 기능

| 메서드 | 설명 |
|--------|------|
| `get<T>(key)` | 캐시에서 값 조회 |
| `set<T>(key, value, ttlSeconds)` | 캐시에 값 저장 |
| `delete(key)` | 특정 키 삭제 |
| `flush()` | 전체 캐시 초기화 |
| `getStats()` | 캐시 통계 조회 (hits, misses, keys, hitRate) |

### 1.3 TTL 설정

| 데이터 유형 | TTL | 용도 |
|------------|-----|------|
| KPI 데이터 | 5분 | 대시보드 상단 카드 |
| 시계열 데이터 | 15분 | 트래픽, 비용 차트 |
| 테넌트 집계 | 15분 | 파이 차트, 비교 분석 |
| 이상 탐지 | 5분 | 알림 |

### 1.4 사용 예시
```typescript
// BigQueryService에서 캐싱 적용
async getRealtimeKPI(projectId: string): Promise<RealtimeKPI> {
  const cacheKey = `kpi:${projectId}`;
  const cached = this.cacheService.get<RealtimeKPI>(cacheKey);

  if (cached) return cached;

  const result = await this.queryBigQuery(METRICS_QUERIES.REALTIME_KPI, projectId);
  this.cacheService.set(cacheKey, result, 300); // 5분 TTL

  return result;
}
```

---

## 2. 메트릭 API

### 2.1 파일 구조
```
apps/backend/src/bigquery/
├── queries/
│   └── metrics.queries.ts   # SQL 쿼리 모음
├── bigquery.controller.ts   # API 엔드포인트
└── bigquery.service.ts      # 비즈니스 로직
```

### 2.2 SQL 쿼리 목록 (metrics.queries.ts)

| 쿼리 이름 | 설명 |
|-----------|------|
| `REALTIME_KPI` | 실시간 KPI (총 요청, 성공/실패, 토큰 사용량) |
| `HOURLY_TRAFFIC` | 24시간 트래픽 추이 |
| `DAILY_TRAFFIC` | 30일간 일별 트래픽 |
| `TENANT_USAGE` | 테넌트별 사용량 집계 |
| `USAGE_HEATMAP` | 요일/시간대별 사용량 히트맵 |
| `COST_TREND` | 일별 토큰 비용 추이 |
| `ERROR_ANALYSIS` | 에러 원인 분석 |
| `TOKEN_EFFICIENCY` | 토큰 효율성 분석 |
| `ANOMALY_STATS` | 이상 탐지용 통계 |

### 2.3 API 엔드포인트

#### 메트릭 API
| Method | Endpoint | 설명 | TTL |
|--------|----------|------|-----|
| GET | `/projects/:projectId/metrics/realtime` | 실시간 KPI | 5분 |
| GET | `/projects/:projectId/metrics/hourly` | 시간별 트래픽 | 15분 |
| GET | `/projects/:projectId/metrics/daily` | 일별 트래픽 | 15분 |

#### 분석 API
| Method | Endpoint | 설명 | TTL |
|--------|----------|------|-----|
| GET | `/projects/:projectId/analytics/tenant-usage` | 테넌트별 사용량 | 15분 |
| GET | `/projects/:projectId/analytics/cost-trend` | 비용 추이 | 15분 |
| GET | `/projects/:projectId/analytics/heatmap` | 사용량 히트맵 | 15분 |
| GET | `/projects/:projectId/analytics/errors` | 에러 분석 | 15분 |

#### AI API
| Method | Endpoint | 설명 | TTL |
|--------|----------|------|-----|
| GET | `/projects/:projectId/ai/token-efficiency` | 토큰 효율성 | 15분 |
| GET | `/projects/:projectId/ai/anomaly-stats` | 이상 탐지 통계 | 5분 |

#### 캐시 관리 API
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/cache/stats` | 캐시 통계 조회 |
| DELETE | `/cache/flush` | 캐시 전체 초기화 |

---

## 3. 이상 탐지 모듈

### 3.1 파일 구조
```
apps/backend/src/ml/
├── ml.module.ts
└── anomaly/
    ├── anomaly.module.ts
    ├── anomaly.service.ts      # Z-Score 기반 이상 탐지
    └── anomaly.controller.ts   # API 엔드포인트
```

### 3.2 탐지 알고리즘

**Z-Score 기반 이상 탐지**
```
Z = (X - μ) / σ

X: 현재 값
μ: 평균
σ: 표준편차
임계값: |Z| > 2.5
```

### 3.3 탐지 대상

| 타입 | 탐지 조건 | 심각도 |
|------|-----------|--------|
| `token_spike` | 토큰 사용량 > P99 또는 Z-Score > 2.5 | high |
| `error_rate` | 에러율 > 5% | high |
| `traffic_spike` | 트래픽 급증 (Z-Score > 2.5) | medium |

### 3.4 API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/ml/anomalies/:projectId` | 현재 이상 탐지 결과 |
| GET | `/ml/anomalies/:projectId/history` | 이상 탐지 이력 (최근 100건) |

### 3.5 응답 예시
```json
{
  "success": true,
  "data": [
    {
      "type": "token_spike",
      "severity": "high",
      "tenant_id": "tenant-001",
      "message": "토큰 사용량이 P99(15000)를 초과했습니다: 18500",
      "value": 18500,
      "threshold": 15000,
      "detected_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

---

## 4. 공유 타입 (shared-types)

### 4.1 파일 위치
```
packages/shared-types/src/index.ts
```

### 4.2 주요 타입

```typescript
// KPI
interface RealtimeKPI {
  total_requests: number;
  success_count: number;
  fail_count: number;
  error_rate: number;
  total_tokens: number;
  avg_tokens: number;
  active_tenants: number;
}

// 트래픽
interface HourlyTraffic {
  hour: string;
  request_count: number;
  success_count: number;
  fail_count: number;
  total_tokens: number;
}

// 테넌트 사용량
interface TenantUsage {
  tenant_id: string;
  request_count: number;
  total_tokens: number;
  error_rate: number;
}

// 비용 추이
interface CostTrend {
  date: string;
  input_tokens: number;
  output_tokens: number;
  total_cost: number;
}

// 이상 탐지 통계
interface AnomalyStats {
  tenant_id: string;
  avg_tokens: number;
  stddev_tokens: number;
  p99_tokens: number;
  sample_count: number;
}
```

---

## 5. 환경 설정

### 5.1 필수 환경 변수
```env
# BigQuery
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GCP_PROJECT_ID=your-project-id

# BigQuery 테이블 (기본값)
BIGQUERY_DATASET=your_dataset
BIGQUERY_TABLE=your_logs_table
```

### 5.2 의존성
```json
{
  "dependencies": {
    "@google-cloud/bigquery": "^7.x",
    "node-cache": "^5.x"
  }
}
```

---

## 6. 실행 방법

```bash
# 개발 모드
pnpm dev:backend

# 빌드
pnpm build:backend

# Swagger 문서
# http://localhost:3000/api
```

---

## 7. 확장 방법

### 7.1 새 메트릭 쿼리 추가

1. `metrics.queries.ts`에 SQL 쿼리 추가
```typescript
export const METRICS_QUERIES = {
  // 기존 쿼리...
  NEW_METRIC: `
    SELECT ...
    FROM \`{projectId}.{dataset}.{table}\`
    WHERE ...
  `,
};
```

2. `bigquery.service.ts`에 메서드 추가
```typescript
async getNewMetric(projectId: string): Promise<NewMetricType> {
  const cacheKey = `new-metric:${projectId}`;
  const cached = this.cacheService.get<NewMetricType>(cacheKey);
  if (cached) return cached;

  const result = await this.executeQuery(METRICS_QUERIES.NEW_METRIC, projectId);
  this.cacheService.set(cacheKey, result, 300);
  return result;
}
```

3. `bigquery.controller.ts`에 엔드포인트 추가
```typescript
@Get('projects/:projectId/metrics/new-metric')
async getNewMetric(@Param('projectId') projectId: string) {
  return this.bigqueryService.getNewMetric(projectId);
}
```

### 7.2 새 이상 탐지 규칙 추가

`anomaly.service.ts`의 `detectAnomalies` 메서드에 규칙 추가:
```typescript
// 새로운 탐지 규칙
if (stat.some_condition > threshold) {
  anomalies.push({
    type: 'new_anomaly_type',
    severity: 'medium',
    tenant_id: stat.tenant_id,
    message: '이상 탐지 메시지',
    value: stat.some_value,
    threshold: threshold,
    detected_at: new Date().toISOString(),
  });
}
```

### 7.3 예측 모델 추가 (Phase 7)

```typescript
// apps/backend/src/ml/forecast/forecast.service.ts
@Injectable()
export class ForecastService {
  async predictDailyUsage(projectId: string, days: number): Promise<Forecast[]> {
    // Prophet 또는 ARIMA 모델 구현
    // Python 마이크로서비스 연동 또는 ml.js 사용
  }
}
```

### 7.4 Redis 캐시로 전환

사용자가 증가하면 `cache.service.ts`를 Redis로 교체:
```typescript
import { Redis } from 'ioredis';

@Injectable()
export class CacheService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
    });
  }

  async get<T>(key: string): Promise<T | undefined> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : undefined;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
  }
}
```
