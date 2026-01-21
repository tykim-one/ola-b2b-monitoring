# 확장 가이드: 새 DataSource 추가하기

> **학습 목표**: 새로운 데이터소스(PostgreSQL, MySQL 등)를 추가하는 방법 이해

---

## 현재 아키텍처 요약

```
                    ┌─────────────────────────┐
                    │    MetricsService       │
                    │   (캐싱, 비즈니스 로직)  │
                    └───────────┬─────────────┘
                                │ @Inject(METRICS_DATASOURCE)
                                ▼
                    ┌─────────────────────────┐
                    │  MetricsDataSource      │  ← Interface (계약)
                    │    (28개 메서드)         │
                    └───────────┬─────────────┘
                                │ implements
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   BigQuery    │    │  PostgreSQL   │    │    MySQL      │
│  (구현 완료)   │    │  (미구현)      │    │   (미구현)    │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## Step 1: 구현체 파일 생성

**위치**: `apps/backend/src/datasource/implementations/postgresql-metrics.datasource.ts`

```typescript
import { Logger } from '@nestjs/common';
import { Pool, PoolConfig } from 'pg';  // PostgreSQL 클라이언트
import { MetricsDataSource } from '../interfaces';
import {
  RealtimeKPI,
  HourlyTraffic,
  // ... 기타 타입
} from '@ola/shared-types';

export interface PostgreSQLMetricsConfig {
  host: string;
  port: number;
  database: string;
  username?: string;
  password?: string;
  ssl?: boolean;
}

export class PostgreSQLMetricsDataSource implements MetricsDataSource {
  private readonly logger = new Logger(PostgreSQLMetricsDataSource.name);
  private pool: Pool | null = null;

  constructor(private readonly config: PostgreSQLMetricsConfig) {}

  // ==================== Lifecycle Methods ====================

  async initialize(): Promise<void> {
    const poolConfig: PoolConfig = {
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.username,
      password: this.config.password,
      ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
      max: 10,  // 최대 연결 수
    };

    this.pool = new Pool(poolConfig);

    // 연결 테스트
    const client = await this.pool.connect();
    await client.query('SELECT 1');
    client.release();

    this.logger.log(`PostgreSQL connected to ${this.config.host}:${this.config.port}`);
  }

  async dispose(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.logger.log('PostgreSQL connection pool closed');
    }
  }

  async isHealthy(): Promise<boolean> {
    if (!this.pool) return false;
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch {
      return false;
    }
  }

  // ==================== Metrics Methods ====================

  async getRealtimeKPI(): Promise<RealtimeKPI> {
    const query = `
      SELECT
        COUNT(*) as total_requests,
        COUNT(CASE WHEN success = true THEN 1 END) as success_count,
        SUM(CAST(total_tokens AS NUMERIC)) as total_tokens,
        COUNT(DISTINCT tenant_id) as active_tenants
      FROM logs
      WHERE timestamp >= NOW() - INTERVAL '24 hours'
    `;

    const result = await this.executeQuery<any>(query);
    const row = result[0] || {};

    return {
      totalRequests: Number(row.total_requests) || 0,
      successRate: row.total_requests > 0
        ? (Number(row.success_count) / Number(row.total_requests)) * 100
        : 0,
      totalTokens: Number(row.total_tokens) || 0,
      activeTenants: Number(row.active_tenants) || 0,
    };
  }

  async getHourlyTraffic(): Promise<HourlyTraffic[]> {
    const query = `
      SELECT
        DATE_TRUNC('hour', timestamp) as hour,
        COUNT(*) as request_count,
        SUM(CAST(total_tokens AS NUMERIC)) as total_tokens
      FROM logs
      WHERE timestamp >= NOW() - INTERVAL '24 hours'
      GROUP BY DATE_TRUNC('hour', timestamp)
      ORDER BY hour DESC
    `;

    const result = await this.executeQuery<any>(query);

    return result.map(row => ({
      hour: row.hour.toISOString(),
      requestCount: Number(row.request_count),
      totalTokens: Number(row.total_tokens),
    }));
  }

  // ... 나머지 26개 메서드 구현 ...

  async getDailyTraffic(days = 30): Promise<DailyTraffic[]> {
    // TODO: 구현
    return [];
  }

  // (생략: 나머지 메서드들도 같은 패턴으로 구현)

  // ==================== Helper Methods ====================

  private async executeQuery<T>(query: string): Promise<T[]> {
    if (!this.pool) {
      throw new Error('PostgreSQL pool not initialized');
    }

    const client = await this.pool.connect();
    try {
      const result = await client.query(query);
      return result.rows as T[];
    } finally {
      client.release();
    }
  }
}
```

---

## Step 2: Factory에 case 추가

**파일**: `apps/backend/src/datasource/factory/datasource.factory.ts`

```typescript
import { PostgreSQLMetricsDataSource, PostgreSQLMetricsConfig } from '../implementations';

// createDataSource 메서드 수정
private async createDataSource(config: ResolvedDataSourceConfig): Promise<MetricsDataSource> {
  switch (config.type) {
    case 'bigquery':
      return this.createBigQueryDataSource(config);

    case 'postgresql':  // 추가!
      return this.createPostgreSQLDataSource(config);

    case 'mysql':
      throw new Error('MySQL data source not yet implemented');

    default:
      throw new Error(`Unknown data source type: ${config.type}`);
  }
}

// 새 메서드 추가
private createPostgreSQLDataSource(config: ResolvedDataSourceConfig): PostgreSQLMetricsDataSource {
  const pgConfig: PostgreSQLMetricsConfig = {
    host: config.config.host as string,
    port: config.config.port as number,
    database: config.config.database as string,
    username: config.config.username as string | undefined,
    password: config.config.password as string | undefined,
    ssl: config.config.ssl as boolean | undefined,
  };

  return new PostgreSQLMetricsDataSource(pgConfig);
}
```

---

## Step 3: 설정 파일에 프로젝트 추가

**파일**: `apps/backend/config/datasources.config.json`

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
    "legacy-project": {
      "type": "postgresql",
      "config": {
        "host": "${LEGACY_DB_HOST}",
        "port": 5432,
        "database": "${LEGACY_DB_NAME}",
        "username": "${LEGACY_DB_USER}",
        "password": "${LEGACY_DB_PASSWORD}",
        "ssl": true
      }
    }
  }
}
```

---

## Step 4: 환경변수 추가

**파일**: `apps/backend/.env`

```env
# 기존 BigQuery 설정
GCP_PROJECT_ID=my-project
BIGQUERY_DATASET=main
BIGQUERY_TABLE=logs
GCP_BQ_LOCATION=asia-northeast3

# PostgreSQL 추가 (legacy-project용)
LEGACY_DB_HOST=db.legacy.example.com
LEGACY_DB_NAME=logs
LEGACY_DB_USER=readonly
LEGACY_DB_PASSWORD=secret123
```

---

## Step 5: Export 추가 (선택)

**파일**: `apps/backend/src/datasource/implementations/index.ts`

```typescript
export * from './bigquery-metrics.datasource';
export * from './postgresql-metrics.datasource';  // 추가
```

---

## 변경 없이 유지되는 파일들

✅ **변경 불필요:**
- `metrics.service.ts` - DataSource 인터페이스만 사용
- `metrics.controller.ts` - Service만 호출
- `datasource.module.ts` - Factory가 알아서 처리
- `datasource-config.interface.ts` - 이미 PostgreSQL 타입 정의됨

---

## OCP (Open-Closed Principle) 확인

```
확장에 열려있음 (Open for Extension):
├── 새 구현체 파일 추가 ✅
├── Factory에 case 추가 ✅
└── 설정 파일에 프로젝트 추가 ✅

수정에 닫혀있음 (Closed for Modification):
├── MetricsService 수정 ❌ 불필요
├── MetricsController 수정 ❌ 불필요
├── MetricsDataSource interface 수정 ❌ 불필요
└── 기존 BigQuery 구현체 수정 ❌ 불필요
```

---

## 테스트 방법

### 1. 유닛 테스트

```typescript
// postgresql-metrics.datasource.spec.ts
describe('PostgreSQLMetricsDataSource', () => {
  let dataSource: PostgreSQLMetricsDataSource;

  beforeEach(() => {
    dataSource = new PostgreSQLMetricsDataSource({
      host: 'localhost',
      port: 5432,
      database: 'test',
    });
  });

  it('should return realtime KPI', async () => {
    await dataSource.initialize();
    const kpi = await dataSource.getRealtimeKPI();
    expect(kpi).toHaveProperty('totalRequests');
    await dataSource.dispose();
  });
});
```

### 2. 통합 테스트

```bash
# 환경변수로 프로젝트 지정
curl http://localhost:3000/api/metrics/realtime?projectId=legacy-project
```

---

## 확장 체크리스트

새 DataSource 추가 시 확인할 항목:

- [ ] 구현체 파일 생성 (`implementations/xxx-metrics.datasource.ts`)
- [ ] `MetricsDataSource` 인터페이스의 28개 메서드 구현
- [ ] Lifecycle 메서드 구현 (initialize, dispose, isHealthy)
- [ ] Factory에 switch case 추가
- [ ] 설정 파일에 프로젝트 추가
- [ ] 환경변수 추가
- [ ] Export 추가 (선택)
- [ ] 유닛 테스트 작성

---

## 다이어그램: 요청 흐름 (프로젝트별 DataSource)

```
GET /api/metrics/realtime?projectId=legacy-project
                    │
                    ▼
            ┌───────────────┐
            │  Controller   │
            └───────┬───────┘
                    │
                    ▼
            ┌───────────────┐
            │   Service     │
            │  (캐싱 적용)   │
            └───────┬───────┘
                    │ @Inject(METRICS_DATASOURCE)
                    ▼
            ┌───────────────┐
            │   Factory     │
            │ getDataSource │
            │ ('legacy-..') │
            └───────┬───────┘
                    │ config.type === 'postgresql'
                    ▼
         ┌──────────────────────┐
         │ PostgreSQLDataSource │
         │   getRealtimeKPI()   │
         └──────────┬───────────┘
                    │ SQL 쿼리
                    ▼
            ┌───────────────┐
            │  PostgreSQL   │
            │   Database    │
            └───────────────┘
```

---

## 핵심 요약

| 단계 | 파일 | 작업 |
|------|------|------|
| 1 | `implementations/postgresql-*.ts` | **28개 메서드 구현** |
| 2 | `factory/datasource.factory.ts` | switch case 추가 |
| 3 | `config/datasources.config.json` | 프로젝트별 설정 |
| 4 | `.env` | 환경변수 |

**Service, Controller, Interface 변경 없음!** → 확장에 열려있고, 수정에 닫혀있음
