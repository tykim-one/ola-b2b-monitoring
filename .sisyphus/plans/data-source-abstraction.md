# Data Source Abstraction Implementation Plan

## Context

**Original Request**: Abstract the BigQuery-specific data access layer to support multiple data sources (BigQuery, PostgreSQL, MySQL) through a common interface.

**Interview Summary**:
- Migration Strategy: Incremental (method-by-method alongside existing code)
- Data Source Selection: Configuration file mapping projects to data sources
- Interface Granularity: Fine-grained (individual methods mirroring current structure)
- Query Logic Location: Inside each data source implementation
- Project Strategy: Applied at service layer (data source is pure data access)
- Method Parameters: Keep current method-specific signatures

---

## Work Objectives

### Core Objective
Create a data source abstraction layer that allows the backend to use BigQuery or traditional databases interchangeably, selected per-project via configuration.

### Deliverables
1. `MetricsDataSource` interface defining all metric methods
2. `BigQueryMetricsDataSource` implementation (extracted from current service)
3. `DataSourceModule` with factory provider for dynamic injection
4. Configuration file format and loader
5. Refactored `BigQueryService` using the abstraction
6. Updated AGENTS.md documentation

### Definition of Done
- All 11 existing metric methods work through the abstraction
- Existing API responses unchanged (backward compatible)
- Configuration file determines data source per project
- Unit tests pass for the abstraction layer
- No breaking changes to frontend

---

## Guardrails

### MUST Have
- Backward compatibility with existing API responses
- Type safety using `@ola/shared-types` interfaces
- Cache layer remains at service level (not in data source)
- NestJS dependency injection patterns
- Each data source implementation is independently testable

### MUST NOT Have
- Breaking changes to existing endpoints
- Data source implementations knowing about caching
- Hard-coded data source selection logic
- Circular dependencies between modules

---

## File Structure

```
apps/backend/src/
├── datasource/                          # NEW: Data source abstraction module
│   ├── datasource.module.ts             # NestJS module with factory provider
│   ├── datasource.config.ts             # Configuration loader
│   ├── interfaces/
│   │   ├── index.ts
│   │   ├── metrics-datasource.interface.ts    # Core interface
│   │   └── datasource-config.interface.ts     # Config types
│   ├── implementations/
│   │   ├── index.ts
│   │   ├── bigquery-metrics.datasource.ts     # BigQuery implementation
│   │   └── postgres-metrics.datasource.ts     # Future: PostgreSQL (stub)
│   ├── factory/
│   │   └── datasource.factory.ts        # Factory for creating data sources
│   └── AGENTS.md                        # Documentation
├── bigquery/
│   ├── bigquery.service.ts              # MODIFY: Use MetricsDataSource
│   ├── bigquery.controller.ts           # UNCHANGED
│   └── queries/
│       └── metrics.queries.ts           # UNCHANGED (used by BigQuery impl)
└── config/
    └── datasources.config.json          # NEW: Project-to-datasource mapping
```

---

## Interface Definition

### MetricsDataSource Interface

```typescript
// apps/backend/src/datasource/interfaces/metrics-datasource.interface.ts

import {
  RealtimeKPI,
  HourlyTraffic,
  DailyTraffic,
  TenantUsage,
  UsageHeatmap,
  ErrorAnalysis,
  TokenEfficiency,
  AnomalyStats,
  CostTrend,
  QueryPattern,
  LogEntry,
} from '@ola/shared-types';

export interface MetricsDataSourceConfig {
  projectId: string;
  datasetId?: string;      // BigQuery specific
  tableName?: string;      // BigQuery specific
  connectionString?: string; // Database specific
}

export interface MetricsDataSource {
  /**
   * Initialize the data source connection
   * Called once when the data source is created
   */
  initialize(): Promise<void>;

  /**
   * Clean up resources when the data source is no longer needed
   */
  dispose(): Promise<void>;

  /**
   * Health check for the data source
   */
  isHealthy(): Promise<boolean>;

  // ============================================
  // Realtime & Traffic Metrics
  // ============================================

  /**
   * Get real-time KPI metrics (last 24 hours summary)
   */
  getRealtimeKPI(): Promise<RealtimeKPI>;

  /**
   * Get hourly traffic data for the specified date range
   * @param startDate - Start date in YYYY-MM-DD format
   * @param endDate - End date in YYYY-MM-DD format
   */
  getHourlyTraffic(startDate: string, endDate: string): Promise<HourlyTraffic[]>;

  /**
   * Get daily traffic aggregates
   * @param days - Number of days to look back (default: 30)
   */
  getDailyTraffic(days?: number): Promise<DailyTraffic[]>;

  // ============================================
  // Tenant & Usage Analytics
  // ============================================

  /**
   * Get usage breakdown by tenant
   * @param startDate - Start date in YYYY-MM-DD format
   * @param endDate - End date in YYYY-MM-DD format
   */
  getTenantUsage(startDate: string, endDate: string): Promise<TenantUsage[]>;

  /**
   * Get usage heatmap data (hour x day-of-week matrix)
   * @param days - Number of days to analyze (default: 30)
   */
  getUsageHeatmap(days?: number): Promise<UsageHeatmap[]>;

  // ============================================
  // Error & Performance Analytics
  // ============================================

  /**
   * Get error analysis breakdown
   * @param startDate - Start date in YYYY-MM-DD format
   * @param endDate - End date in YYYY-MM-DD format
   */
  getErrorAnalysis(startDate: string, endDate: string): Promise<ErrorAnalysis[]>;

  /**
   * Get token efficiency metrics by tenant
   * @param startDate - Start date in YYYY-MM-DD format
   * @param endDate - End date in YYYY-MM-DD format
   */
  getTokenEfficiency(startDate: string, endDate: string): Promise<TokenEfficiency[]>;

  // ============================================
  // AI & Anomaly Detection
  // ============================================

  /**
   * Get anomaly detection statistics
   * @param hours - Number of hours to analyze (default: 24)
   */
  getAnomalyStats(hours?: number): Promise<AnomalyStats>;

  // ============================================
  // Cost & Pattern Analysis
  // ============================================

  /**
   * Get cost trend data over time
   * @param days - Number of days to analyze (default: 30)
   */
  getCostTrend(days?: number): Promise<CostTrend[]>;

  /**
   * Get query pattern analysis
   * @param startDate - Start date in YYYY-MM-DD format
   * @param endDate - End date in YYYY-MM-DD format
   */
  getQueryPatterns(startDate: string, endDate: string): Promise<QueryPattern[]>;

  // ============================================
  // Raw Log Access
  // ============================================

  /**
   * Get sample log entries
   * @param limit - Maximum number of logs to return (default: 100)
   * @param offset - Offset for pagination (default: 0)
   */
  getSampleLogs(limit?: number, offset?: number): Promise<LogEntry[]>;
}

/**
 * Injection token for MetricsDataSource
 */
export const METRICS_DATASOURCE = Symbol('METRICS_DATASOURCE');
```

### DataSource Configuration Interface

```typescript
// apps/backend/src/datasource/interfaces/datasource-config.interface.ts

export type DataSourceType = 'bigquery' | 'postgresql' | 'mysql';

export interface DataSourceDefinition {
  type: DataSourceType;
  config: {
    // BigQuery specific
    datasetId?: string;
    tableName?: string;
    location?: string;

    // Database specific
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    ssl?: boolean;
  };
}

export interface DataSourcesConfig {
  /**
   * Default data source when project-specific mapping not found
   */
  default: DataSourceDefinition;

  /**
   * Project-specific data source mappings
   */
  projects: {
    [projectId: string]: DataSourceDefinition;
  };
}
```

---

## Configuration File Format

```json
// apps/backend/config/datasources.config.json

{
  "default": {
    "type": "bigquery",
    "config": {
      "datasetId": "${BIGQUERY_DATASET}",
      "tableName": "${BIGQUERY_TABLE}",
      "location": "${GCP_BQ_LOCATION}"
    }
  },
  "projects": {
    "project-alpha": {
      "type": "bigquery",
      "config": {
        "datasetId": "alpha_logs",
        "tableName": "llm_logs",
        "location": "asia-northeast3"
      }
    },
    "project-beta": {
      "type": "postgresql",
      "config": {
        "host": "db.example.com",
        "port": 5432,
        "database": "beta_metrics",
        "username": "${PG_USERNAME}",
        "password": "${PG_PASSWORD}",
        "ssl": true
      }
    }
  }
}
```

---

## NestJS Module Setup

### DataSource Module

```typescript
// apps/backend/src/datasource/datasource.module.ts

import { Module, DynamicModule, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { DataSourceFactory } from './factory/datasource.factory';
import { DataSourceConfigService } from './datasource.config';
import { METRICS_DATASOURCE } from './interfaces';
import { BigQueryMetricsDataSource } from './implementations/bigquery-metrics.datasource';

@Module({})
export class DataSourceModule {
  static forRoot(): DynamicModule {
    return {
      module: DataSourceModule,
      global: true,
      providers: [
        DataSourceConfigService,
        DataSourceFactory,
        BigQueryMetricsDataSource,
        {
          provide: METRICS_DATASOURCE,
          scope: Scope.REQUEST,
          inject: [REQUEST, DataSourceFactory],
          useFactory: async (request: Request, factory: DataSourceFactory) => {
            // Extract projectId from request params
            const projectId = request.params.projectId || 'default';
            return factory.createForProject(projectId);
          },
        },
      ],
      exports: [METRICS_DATASOURCE, DataSourceFactory],
    };
  }
}
```

### DataSource Factory

```typescript
// apps/backend/src/datasource/factory/datasource.factory.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetricsDataSource, MetricsDataSourceConfig } from '../interfaces';
import { DataSourceConfigService } from '../datasource.config';
import { BigQueryMetricsDataSource } from '../implementations/bigquery-metrics.datasource';
// Future: import { PostgresMetricsDataSource } from '../implementations/postgres-metrics.datasource';

@Injectable()
export class DataSourceFactory {
  private readonly logger = new Logger(DataSourceFactory.name);
  private readonly cache = new Map<string, MetricsDataSource>();

  constructor(
    private readonly configService: ConfigService,
    private readonly dsConfigService: DataSourceConfigService,
  ) {}

  async createForProject(projectId: string): Promise<MetricsDataSource> {
    // Check cache first
    const cacheKey = `${projectId}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const dsConfig = this.dsConfigService.getConfigForProject(projectId);
    let dataSource: MetricsDataSource;

    switch (dsConfig.type) {
      case 'bigquery':
        dataSource = new BigQueryMetricsDataSource({
          projectId: this.configService.get('GCP_PROJECT_ID'),
          datasetId: dsConfig.config.datasetId,
          tableName: dsConfig.config.tableName,
        });
        break;

      case 'postgresql':
        // Future implementation
        throw new Error('PostgreSQL data source not yet implemented');

      case 'mysql':
        // Future implementation
        throw new Error('MySQL data source not yet implemented');

      default:
        throw new Error(`Unknown data source type: ${dsConfig.type}`);
    }

    await dataSource.initialize();
    this.cache.set(cacheKey, dataSource);

    this.logger.log(`Created ${dsConfig.type} data source for project: ${projectId}`);
    return dataSource;
  }

  async disposeAll(): Promise<void> {
    for (const [key, ds] of this.cache) {
      await ds.dispose();
      this.logger.log(`Disposed data source: ${key}`);
    }
    this.cache.clear();
  }
}
```

### Configuration Service

```typescript
// apps/backend/src/datasource/datasource.config.ts

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { DataSourcesConfig, DataSourceDefinition } from './interfaces';

@Injectable()
export class DataSourceConfigService implements OnModuleInit {
  private readonly logger = new Logger(DataSourceConfigService.name);
  private config: DataSourcesConfig;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.loadConfig();
  }

  private loadConfig(): void {
    const configPath = path.join(process.cwd(), 'config', 'datasources.config.json');

    if (!fs.existsSync(configPath)) {
      this.logger.warn(`Config file not found at ${configPath}, using defaults`);
      this.config = this.getDefaultConfig();
      return;
    }

    try {
      const rawConfig = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(rawConfig);
      this.config = this.resolveEnvVariables(parsed);
      this.logger.log(`Loaded data source config with ${Object.keys(this.config.projects).length} project mappings`);
    } catch (error) {
      this.logger.error(`Failed to load config: ${error.message}`);
      this.config = this.getDefaultConfig();
    }
  }

  private resolveEnvVariables(config: any): DataSourcesConfig {
    const resolve = (obj: any): any => {
      if (typeof obj === 'string') {
        // Replace ${VAR_NAME} with environment variable value
        return obj.replace(/\$\{(\w+)\}/g, (_, varName) => {
          return this.configService.get(varName) || '';
        });
      }
      if (Array.isArray(obj)) {
        return obj.map(resolve);
      }
      if (obj && typeof obj === 'object') {
        const resolved: any = {};
        for (const [key, value] of Object.entries(obj)) {
          resolved[key] = resolve(value);
        }
        return resolved;
      }
      return obj;
    };
    return resolve(config);
  }

  private getDefaultConfig(): DataSourcesConfig {
    return {
      default: {
        type: 'bigquery',
        config: {
          datasetId: this.configService.get('BIGQUERY_DATASET'),
          tableName: this.configService.get('BIGQUERY_TABLE'),
          location: this.configService.get('GCP_BQ_LOCATION'),
        },
      },
      projects: {},
    };
  }

  getConfigForProject(projectId: string): DataSourceDefinition {
    return this.config.projects[projectId] || this.config.default;
  }

  getAllProjectIds(): string[] {
    return Object.keys(this.config.projects);
  }
}
```

---

## BigQuery Implementation

```typescript
// apps/backend/src/datasource/implementations/bigquery-metrics.datasource.ts

import { Logger } from '@nestjs/common';
import { BigQuery } from '@google-cloud/bigquery';
import {
  MetricsDataSource,
  MetricsDataSourceConfig,
} from '../interfaces';
import {
  RealtimeKPI,
  HourlyTraffic,
  DailyTraffic,
  TenantUsage,
  UsageHeatmap,
  ErrorAnalysis,
  TokenEfficiency,
  AnomalyStats,
  CostTrend,
  QueryPattern,
  LogEntry,
} from '@ola/shared-types';
import { MetricsQueries } from '../../bigquery/queries/metrics.queries';

export class BigQueryMetricsDataSource implements MetricsDataSource {
  private readonly logger = new Logger(BigQueryMetricsDataSource.name);
  private bigQueryClient: BigQuery;

  private readonly projectId: string;
  private readonly datasetId: string;
  private readonly tableName: string;

  constructor(config: MetricsDataSourceConfig) {
    this.projectId = config.projectId;
    this.datasetId = config.datasetId || 'default_dataset';
    this.tableName = config.tableName || 'logs';
  }

  async initialize(): Promise<void> {
    this.bigQueryClient = new BigQuery({
      projectId: this.projectId,
    });
    this.logger.log(`BigQuery data source initialized for ${this.projectId}.${this.datasetId}.${this.tableName}`);
  }

  async dispose(): Promise<void> {
    // BigQuery client doesn't need explicit cleanup
    this.logger.log('BigQuery data source disposed');
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.bigQueryClient.query({ query: 'SELECT 1', maxResults: 1 });
      return true;
    } catch {
      return false;
    }
  }

  // ============================================
  // Private helper for query execution
  // ============================================

  private async executeQuery<T>(query: string, maxResults?: number): Promise<T[]> {
    const options = { query, maxResults };
    const [rows] = await this.bigQueryClient.query(options);
    return rows as T[];
  }

  // ============================================
  // Interface Implementation
  // ============================================

  async getRealtimeKPI(): Promise<RealtimeKPI> {
    const query = MetricsQueries.realtimeKPI(this.projectId, this.datasetId, this.tableName);
    const rows = await this.executeQuery<RealtimeKPI>(query, 1);
    return rows[0] || this.getEmptyRealtimeKPI();
  }

  async getHourlyTraffic(startDate: string, endDate: string): Promise<HourlyTraffic[]> {
    const query = MetricsQueries.hourlyTraffic(
      this.projectId, this.datasetId, this.tableName, startDate, endDate
    );
    return this.executeQuery<HourlyTraffic>(query);
  }

  async getDailyTraffic(days: number = 30): Promise<DailyTraffic[]> {
    const query = MetricsQueries.dailyTraffic(
      this.projectId, this.datasetId, this.tableName, days
    );
    return this.executeQuery<DailyTraffic>(query);
  }

  async getTenantUsage(startDate: string, endDate: string): Promise<TenantUsage[]> {
    const query = MetricsQueries.tenantUsage(
      this.projectId, this.datasetId, this.tableName, startDate, endDate
    );
    return this.executeQuery<TenantUsage>(query);
  }

  async getUsageHeatmap(days: number = 30): Promise<UsageHeatmap[]> {
    const query = MetricsQueries.usageHeatmap(
      this.projectId, this.datasetId, this.tableName, days
    );
    return this.executeQuery<UsageHeatmap>(query);
  }

  async getErrorAnalysis(startDate: string, endDate: string): Promise<ErrorAnalysis[]> {
    const query = MetricsQueries.errorAnalysis(
      this.projectId, this.datasetId, this.tableName, startDate, endDate
    );
    return this.executeQuery<ErrorAnalysis>(query);
  }

  async getTokenEfficiency(startDate: string, endDate: string): Promise<TokenEfficiency[]> {
    const query = MetricsQueries.tokenEfficiency(
      this.projectId, this.datasetId, this.tableName, startDate, endDate
    );
    return this.executeQuery<TokenEfficiency>(query);
  }

  async getAnomalyStats(hours: number = 24): Promise<AnomalyStats> {
    const query = MetricsQueries.anomalyStats(
      this.projectId, this.datasetId, this.tableName, hours
    );
    const rows = await this.executeQuery<AnomalyStats>(query, 1);
    return rows[0] || this.getEmptyAnomalyStats();
  }

  async getCostTrend(days: number = 30): Promise<CostTrend[]> {
    const query = MetricsQueries.costTrend(
      this.projectId, this.datasetId, this.tableName, days
    );
    return this.executeQuery<CostTrend>(query);
  }

  async getQueryPatterns(startDate: string, endDate: string): Promise<QueryPattern[]> {
    const query = MetricsQueries.queryPatterns(
      this.projectId, this.datasetId, this.tableName, startDate, endDate
    );
    return this.executeQuery<QueryPattern>(query);
  }

  async getSampleLogs(limit: number = 100, offset: number = 0): Promise<LogEntry[]> {
    const query = MetricsQueries.sampleLogs(
      this.projectId, this.datasetId, this.tableName, limit, offset
    );
    return this.executeQuery<LogEntry>(query);
  }

  // ============================================
  // Empty result helpers
  // ============================================

  private getEmptyRealtimeKPI(): RealtimeKPI {
    return {
      totalRequests: 0,
      successRate: 0,
      avgResponseTime: 0,
      totalTokens: 0,
      activeUsers: 0,
      errorCount: 0,
    };
  }

  private getEmptyAnomalyStats(): AnomalyStats {
    return {
      totalAnomalies: 0,
      anomalyRate: 0,
      topAnomalyTypes: [],
    };
  }
}
```

---

## Refactored BigQueryService

```typescript
// apps/backend/src/bigquery/bigquery.service.ts (MODIFIED)

import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MetricsDataSource,
  METRICS_DATASOURCE,
} from '../datasource/interfaces';
import { CacheService, CacheTTL } from '../cache/cache.service';
import { ProjectStrategyInterface } from '../common/strategies/project.strategy.interface';
import {
  RealtimeKPI,
  HourlyTraffic,
  DailyTraffic,
  TenantUsage,
  UsageHeatmap,
  ErrorAnalysis,
  TokenEfficiency,
  AnomalyStats,
  CostTrend,
  QueryPattern,
  LogEntry,
} from '@ola/shared-types';

@Injectable()
export class BigQueryService {
  private readonly logger = new Logger(BigQueryService.name);

  constructor(
    @Inject(METRICS_DATASOURCE)
    private readonly dataSource: MetricsDataSource,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {}

  // ============================================
  // Public API (with caching)
  // ============================================

  async getRealtimeKPI(): Promise<RealtimeKPI> {
    const cacheKey = CacheService.generateKey('metrics', 'realtime', 'kpi');
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.dataSource.getRealtimeKPI(),
      CacheTTL.SHORT,
    );
  }

  async getHourlyTraffic(startDate: string, endDate: string): Promise<HourlyTraffic[]> {
    const cacheKey = CacheService.generateKey('metrics', 'hourly', startDate, endDate);
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.dataSource.getHourlyTraffic(startDate, endDate),
      CacheTTL.MEDIUM,
    );
  }

  async getDailyTraffic(days: number = 30): Promise<DailyTraffic[]> {
    const cacheKey = CacheService.generateKey('metrics', 'daily', String(days));
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.dataSource.getDailyTraffic(days),
      CacheTTL.MEDIUM,
    );
  }

  async getTenantUsage(startDate: string, endDate: string): Promise<TenantUsage[]> {
    const cacheKey = CacheService.generateKey('analytics', 'tenant', startDate, endDate);
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.dataSource.getTenantUsage(startDate, endDate),
      CacheTTL.MEDIUM,
    );
  }

  async getUsageHeatmap(days: number = 30): Promise<UsageHeatmap[]> {
    const cacheKey = CacheService.generateKey('analytics', 'heatmap', String(days));
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.dataSource.getUsageHeatmap(days),
      CacheTTL.MEDIUM,
    );
  }

  async getErrorAnalysis(startDate: string, endDate: string): Promise<ErrorAnalysis[]> {
    const cacheKey = CacheService.generateKey('analytics', 'errors', startDate, endDate);
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.dataSource.getErrorAnalysis(startDate, endDate),
      CacheTTL.SHORT,
    );
  }

  async getTokenEfficiency(startDate: string, endDate: string): Promise<TokenEfficiency[]> {
    const cacheKey = CacheService.generateKey('analytics', 'tokens', startDate, endDate);
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.dataSource.getTokenEfficiency(startDate, endDate),
      CacheTTL.MEDIUM,
    );
  }

  async getAnomalyStats(hours: number = 24): Promise<AnomalyStats> {
    const cacheKey = CacheService.generateKey('ai', 'anomaly', String(hours));
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.dataSource.getAnomalyStats(hours),
      CacheTTL.SHORT,
    );
  }

  async getCostTrend(days: number = 30): Promise<CostTrend[]> {
    const cacheKey = CacheService.generateKey('analytics', 'cost', String(days));
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.dataSource.getCostTrend(days),
      CacheTTL.MEDIUM,
    );
  }

  async getQueryPatterns(startDate: string, endDate: string): Promise<QueryPattern[]> {
    const cacheKey = CacheService.generateKey('analytics', 'patterns', startDate, endDate);
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.dataSource.getQueryPatterns(startDate, endDate),
      CacheTTL.MEDIUM,
    );
  }

  async getSampleLogs(limit: number = 100, offset: number = 0): Promise<LogEntry[]> {
    const cacheKey = CacheService.generateKey('logs', 'sample', String(limit), String(offset));
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.dataSource.getSampleLogs(limit, offset),
      CacheTTL.SHORT,
    );
  }
}
```

---

## Task Flow and Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│ Phase 1: Foundation (No Breaking Changes)                       │
├─────────────────────────────────────────────────────────────────┤
│ 1.1 Create shared-types additions                               │
│ 1.2 Create datasource module structure                          │
│ 1.3 Create interfaces                                           │
│ 1.4 Create config service                                       │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ Phase 2: BigQuery Implementation                                │
├─────────────────────────────────────────────────────────────────┤
│ 2.1 Extract BigQueryMetricsDataSource from BigQueryService      │
│ 2.2 Create DataSourceFactory                                    │
│ 2.3 Wire up DataSourceModule                                    │
│ 2.4 Create config file                                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ Phase 3: Integration                                            │
├─────────────────────────────────────────────────────────────────┤
│ 3.1 Refactor BigQueryService to use METRICS_DATASOURCE          │
│ 3.2 Update BigQueryModule to import DataSourceModule            │
│ 3.3 Integration testing                                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ Phase 4: Cleanup & Documentation                                │
├─────────────────────────────────────────────────────────────────┤
│ 4.1 Add unit tests for data source                              │
│ 4.2 Update AGENTS.md files                                      │
│ 4.3 Remove deprecated code (if any)                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Detailed TODOs

### Phase 1: Foundation

#### 1.1 Add Missing Types to shared-types
- [ ] Add `AnomalyStats`, `QueryPattern`, `LogEntry` interfaces if missing
- [ ] Export all required interfaces from index.ts
- **Acceptance**: `pnpm build` succeeds in shared-types package

#### 1.2 Create DataSource Module Structure
- [ ] Create directory: `apps/backend/src/datasource/`
- [ ] Create subdirectories: `interfaces/`, `implementations/`, `factory/`
- [ ] Create index.ts files for barrel exports
- **Acceptance**: Directory structure matches specification

#### 1.3 Create Interfaces
- [ ] Create `metrics-datasource.interface.ts` with full interface definition
- [ ] Create `datasource-config.interface.ts` with config types
- [ ] Create `interfaces/index.ts` barrel export
- **Acceptance**: TypeScript compiles without errors

#### 1.4 Create Configuration Service
- [ ] Create `datasource.config.ts` with env variable resolution
- [ ] Create `config/datasources.config.json` with default config
- **Acceptance**: ConfigService loads and parses config file

### Phase 2: BigQuery Implementation

#### 2.1 Create BigQueryMetricsDataSource
- [ ] Create `bigquery-metrics.datasource.ts`
- [ ] Implement all 11 metric methods
- [ ] Extract query execution from current BigQueryService
- [ ] Add lifecycle methods (initialize, dispose, isHealthy)
- **Acceptance**: All methods return correct types

#### 2.2 Create DataSourceFactory
- [ ] Create `datasource.factory.ts`
- [ ] Implement `createForProject()` method
- [ ] Add caching of created data sources
- [ ] Add `disposeAll()` for cleanup
- **Acceptance**: Factory creates BigQuery data source correctly

#### 2.3 Create DataSourceModule
- [ ] Create `datasource.module.ts`
- [ ] Configure request-scoped provider for METRICS_DATASOURCE
- [ ] Export factory and token
- **Acceptance**: Module compiles and can be imported

#### 2.4 Create Configuration File
- [ ] Create `apps/backend/config/datasources.config.json`
- [ ] Add default BigQuery configuration
- [ ] Document environment variable placeholders
- **Acceptance**: Config loads with proper env var substitution

### Phase 3: Integration

#### 3.1 Refactor BigQueryService
- [ ] Add `@Inject(METRICS_DATASOURCE)` dependency
- [ ] Replace direct BigQuery calls with dataSource method calls
- [ ] Keep caching logic in service layer
- [ ] Remove redundant BigQuery client initialization
- **Acceptance**: Service works identically to before

#### 3.2 Update BigQueryModule
- [ ] Import DataSourceModule.forRoot()
- [ ] Update provider configuration if needed
- **Acceptance**: Application starts without errors

#### 3.3 Integration Testing
- [ ] Test all 11 endpoints return expected data
- [ ] Verify caching still works
- [ ] Test with different project IDs
- **Acceptance**: All existing API tests pass

### Phase 4: Cleanup & Documentation

#### 4.1 Add Unit Tests
- [ ] Create `bigquery-metrics.datasource.spec.ts`
- [ ] Mock BigQuery client
- [ ] Test each method returns correct type
- [ ] Test error handling
- **Acceptance**: `pnpm test` passes with >80% coverage on new code

#### 4.2 Update Documentation
- [ ] Create `apps/backend/src/datasource/AGENTS.md`
- [ ] Update `apps/backend/src/bigquery/AGENTS.md`
- [ ] Update root `AGENTS.md` with new module info
- [ ] Run `/deepinit --update`
- **Acceptance**: Documentation reflects new architecture

#### 4.3 Optional Cleanup
- [ ] Remove any deprecated BigQuery-specific code from service
- [ ] Consolidate error handling
- **Acceptance**: No dead code remains

---

## Commit Strategy

| Commit | Scope | Message |
|--------|-------|---------|
| 1 | shared-types | `feat(shared-types): add missing metric type interfaces` |
| 2 | datasource | `feat(backend): add MetricsDataSource interface and config types` |
| 3 | datasource | `feat(backend): add DataSourceConfigService with env resolution` |
| 4 | datasource | `feat(backend): implement BigQueryMetricsDataSource` |
| 5 | datasource | `feat(backend): add DataSourceFactory and module setup` |
| 6 | bigquery | `refactor(backend): BigQueryService uses MetricsDataSource abstraction` |
| 7 | tests | `test(backend): add unit tests for data source layer` |
| 8 | docs | `docs(backend): update AGENTS.md for datasource module` |

---

## Success Criteria

### Functional Requirements
- [ ] All 11 metric endpoints return identical responses to current implementation
- [ ] Cache behavior unchanged (same TTLs, same keys)
- [ ] Configuration file successfully selects data source per project
- [ ] Health check endpoint works for data source

### Non-Functional Requirements
- [ ] No performance regression (query times within 10% of current)
- [ ] TypeScript strict mode passes
- [ ] ESLint passes with no errors
- [ ] All existing tests pass

### Architecture Requirements
- [ ] Data source implementations have no knowledge of caching
- [ ] Factory creates and caches data source instances correctly
- [ ] Interface can be implemented by future PostgreSQL/MySQL sources
- [ ] Clean separation between data access and business logic

---

## Verification Steps

After implementation, verify with these commands:

```bash
# 1. Build all packages
pnpm build

# 2. Run backend tests
cd apps/backend && pnpm test

# 3. Start backend and test endpoints
pnpm dev:backend

# 4. Test a sample endpoint
curl http://localhost:3000/projects/test-project/bigquery/metrics/realtime

# 5. Verify caching (second call should be faster)
curl http://localhost:3000/projects/test-project/bigquery/metrics/realtime

# 6. Check health
curl http://localhost:3000/health
```

---

## Future: PostgreSQL Implementation Stub

When ready to add PostgreSQL support, create:

```typescript
// apps/backend/src/datasource/implementations/postgres-metrics.datasource.ts

import { Pool } from 'pg';
import { MetricsDataSource, MetricsDataSourceConfig } from '../interfaces';

export class PostgresMetricsDataSource implements MetricsDataSource {
  private pool: Pool;

  constructor(config: MetricsDataSourceConfig) {
    // Store connection config
  }

  async initialize(): Promise<void> {
    this.pool = new Pool({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.username,
      password: this.config.password,
      ssl: this.config.ssl,
    });
  }

  async dispose(): Promise<void> {
    await this.pool.end();
  }

  async isHealthy(): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query('SELECT 1');
      return true;
    } finally {
      client.release();
    }
  }

  // Implement all metric methods with PostgreSQL-specific queries...
}
```

---

## Notes

1. **Request Scope**: The `METRICS_DATASOURCE` is request-scoped to extract `projectId` from the URL. This means a new data source lookup happens per request, but the factory caches instances.

2. **Connection Management**: The factory caches data source instances to avoid creating new connections for every request. Consider adding TTL or LRU eviction for long-running servers with many projects.

3. **Error Normalization**: Consider creating common error types (`DataSourceConnectionError`, `DataSourceQueryError`) for consistent API responses across data sources.

4. **Metrics Queries**: The existing `MetricsQueries` class remains unchanged and is used only by `BigQueryMetricsDataSource`. Future PostgreSQL implementation will have its own query builder.
