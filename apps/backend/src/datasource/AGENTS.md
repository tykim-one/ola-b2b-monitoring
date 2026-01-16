<!-- Parent: ../AGENTS.md -->

# DataSource Module

데이터 소스 추상화 레이어 - 여러 데이터베이스 백엔드(BigQuery, PostgreSQL, MySQL 등)를 지원하는 공통 인터페이스를 제공합니다.

## Purpose

- **데이터 소스 추상화**: 다양한 데이터베이스를 동일한 인터페이스로 접근
- **프로젝트별 설정**: JSON 설정 파일을 통한 프로젝트별 데이터 소스 선택
- **확장 가능**: 새로운 데이터 소스 타입 추가 용이

## Architecture

```
MetricsService (caching)
        ↓
MetricsDataSource (interface)
        ↓
BigQueryMetricsDataSource / MySQLMetricsDataSource / MongoDBMetricsDataSource (future)
```

## Directory Structure

```
datasource/
├── index.ts                          # 모듈 재export
├── datasource.module.ts              # NestJS 모듈
├── datasource.config.ts              # 설정 로더 서비스
├── interfaces/
│   ├── index.ts
│   ├── metrics-datasource.interface.ts   # 핵심 인터페이스 (11개 메서드)
│   └── datasource-config.interface.ts    # 설정 타입 정의
├── implementations/
│   ├── index.ts
│   └── bigquery-metrics.datasource.ts    # BigQuery 구현체
├── factory/
│   ├── index.ts
│   └── datasource.factory.ts             # 인스턴스 팩토리
└── AGENTS.md
```

## Key Files

| File | Description |
|------|-------------|
| `metrics-datasource.interface.ts` | 11개 메트릭 메서드를 정의하는 핵심 인터페이스 |
| `datasource-config.interface.ts` | BigQuery/PostgreSQL/MySQL 설정 타입 |
| `bigquery-metrics.datasource.ts` | BigQuery SQL 쿼리 실행 구현체 |
| `datasource.factory.ts` | 설정 기반 인스턴스 생성 및 캐싱 |
| `datasource.config.ts` | JSON 설정 파일 로드 및 환경변수 치환 |

## MetricsDataSource Interface

```typescript
interface MetricsDataSource {
  // Lifecycle
  initialize(): Promise<void>;
  dispose(): Promise<void>;
  isHealthy(): Promise<boolean>;

  // Metrics (11 methods)
  getRealtimeKPI(): Promise<RealtimeKPI>;
  getHourlyTraffic(): Promise<HourlyTraffic[]>;
  getDailyTraffic(days?: number): Promise<DailyTraffic[]>;
  getTenantUsage(days?: number): Promise<TenantUsage[]>;
  getUsageHeatmap(): Promise<UsageHeatmapCell[]>;
  getErrorAnalysis(): Promise<ErrorAnalysis[]>;
  getTokenEfficiency(): Promise<TokenEfficiency[]>;
  getAnomalyStats(): Promise<AnomalyStats[]>;
  getCostTrend(): Promise<CostTrend[]>;
  getQueryPatterns(): Promise<QueryPattern[]>;
  getSampleLogs(limit?: number): Promise<B2BLog[]>;
}
```

## Configuration

설정 파일: `apps/backend/config/datasources.config.json`

```json
{
  "default": {
    "type": "bigquery",
    "config": {
      "projectId": "${GCP_PROJECT_ID}",
      "datasetId": "${BIGQUERY_DATASET}",
      "tableName": "${BIGQUERY_TABLE}",
      "location": "${GCP_BQ_LOCATION}"
    }
  },
  "projects": {
    "project-beta": {
      "type": "postgresql",
      "config": { ... }
    }
  }
}
```

## Usage

### Injecting MetricsDataSource

```typescript
import { METRICS_DATASOURCE } from '../datasource';
import type { MetricsDataSource } from '../datasource';

@Injectable()
class MyService {
  constructor(
    @Inject(METRICS_DATASOURCE) private dataSource: MetricsDataSource,
  ) {}

  async getData() {
    return this.dataSource.getRealtimeKPI();
  }
}
```

### Using DataSourceFactory (Multi-project)

```typescript
@Injectable()
class MultiProjectService {
  constructor(private factory: DataSourceFactory) {}

  async getKPIForProject(projectId: string) {
    const ds = await this.factory.getDataSource(projectId);
    return ds.getRealtimeKPI();
  }
}
```

## For AI Agents

### Adding New Data Source Types

1. `datasource-config.interface.ts`에 새 설정 타입 추가
2. `implementations/`에 새 구현체 생성 (`XxxMetricsDataSource`)
3. `datasource.factory.ts`의 `createDataSource()` switch문에 케이스 추가
4. `implementations/index.ts`에서 export

### Important Patterns

- **캐싱은 서비스 레이어**: `MetricsService`에서 `CacheService` 사용
- **데이터 소스는 순수 쿼리**: 캐싱 로직 없이 데이터만 반환
- **팩토리 패턴**: `DataSourceFactory`가 인스턴스 생성/관리

### Dependencies

- `@ola/shared-types`: 메트릭 타입 정의
- `../../metrics/queries/metrics.queries.ts`: BigQuery SQL 쿼리

## Related

- `../metrics/`: 메트릭 서비스 (이 모듈 사용)
- `../../config/datasources.config.json`: 설정 파일
- `@ola/shared-types`: 공유 타입
