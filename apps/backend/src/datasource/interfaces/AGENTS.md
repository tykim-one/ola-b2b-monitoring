<!-- Parent: ../AGENTS.md -->

# DataSource Interfaces

데이터 소스 추상화를 위한 인터페이스 및 타입 정의입니다.

## Purpose

- **MetricsDataSource 인터페이스**: 모든 데이터 소스 구현체가 따라야 하는 계약
- **설정 타입 정의**: BigQuery, PostgreSQL, MySQL 등 각 데이터 소스 설정 스키마

## Key Files

| File | Description |
|------|-------------|
| `metrics-datasource.interface.ts` | 핵심 인터페이스 - 11개 메트릭 메서드 + 3개 lifecycle 메서드 |
| `datasource-config.interface.ts` | 데이터 소스별 설정 타입 (BigQuery, PostgreSQL, MySQL) |
| `index.ts` | 모듈 재export |

## MetricsDataSource Interface

```typescript
interface MetricsDataSource {
  // Lifecycle
  initialize(): Promise<void>;
  dispose(): Promise<void>;
  isHealthy(): Promise<boolean>;

  // Core Metrics (11 methods)
  getRealtimeKPI(): Promise<RealtimeKPI>;
  getHourlyTraffic(): Promise<HourlyTraffic[]>;
  getDailyTraffic(): Promise<DailyTraffic[]>;
  getTenantUsage(days?: number): Promise<TenantUsage[]>;
  getUsageHeatmap(): Promise<UsageHeatmapCell[]>;
  getErrorAnalysis(): Promise<ErrorAnalysis[]>;
  getTokenEfficiency(): Promise<TokenEfficiency[]>;
  getAnomalyStats(): Promise<AnomalyStats[]>;
  getCostTrend(): Promise<CostTrend[]>;
  getQueryPatterns(): Promise<QueryPattern[]>;
  getSampleLogs(limit?: number): Promise<B2BLog[]>;

  // Quality Analysis (3 methods)
  getTokenEfficiencyTrend(): Promise<TokenEfficiencyTrend[]>;
  getQueryResponseCorrelation(): Promise<QueryResponseCorrelation[]>;
  getRepeatedQueryPatterns(): Promise<RepeatedQueryPattern[]>;
}
```

## For AI Agents

- **새 데이터 소스 추가 시**: `datasource-config.interface.ts`에 설정 타입을 먼저 추가
- **인터페이스 확장 시**: 모든 구현체(`implementations/`)도 함께 업데이트 필요
- **타입은 shared-types 사용**: 반환 타입은 `@ola/shared-types`에서 import

## Dependencies

- `@ola/shared-types`: 메트릭 반환 타입 정의
