# DataSource 추상화 및 Repository Layer 아키텍처

> Backend의 데이터 접근 계층 아키텍처를 설명합니다.

## 목차

- [개요](#개요)
- [아키텍처 다이어그램](#아키텍처-다이어그램)
- [핵심 컴포넌트](#핵심-컴포넌트)
  - [MetricsDataSource 인터페이스](#1-metricsdatasource-인터페이스)
  - [DataSource 설정 인터페이스](#2-datasource-설정-인터페이스)
  - [DataSourceFactory](#3-datasourcefactory)
  - [DataSourceConfigService](#4-datasourceconfigservice)
  - [DataSourceModule](#5-datasourcemodule)
- [Service Layer 연동](#service-layer-연동)
- [Repository Pattern vs DataSource Pattern](#repository-pattern-vs-datasource-pattern)
- [확장 가이드](#확장-가이드)
- [설계 패턴](#설계-패턴)

---

## 개요

이 프로젝트는 **전통적인 Repository 패턴 대신 DataSource 추상화 패턴**을 사용합니다.

```
┌─────────────────────────────────────────────────────────────────┐
│                      Service Layer                              │
│   (MetricsService, DomainMetricsService)                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │ @Inject(METRICS_DATASOURCE)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  MetricsDataSource Interface                    │
│   (24개 메서드: Lifecycle, Metrics, Quality, User Analytics)    │
└──────────────────────────┬──────────────────────────────────────┘
                           │ implements
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              Concrete Implementations                           │
│  ┌─────────────────────┐  ┌──────────────────┐  ┌────────────┐ │
│  │ BigQueryMetrics     │  │ PostgreSQLMetrics│  │ MySQLMetrics│ │
│  │ DataSource (구현됨) │  │ DataSource (TBD) │  │ DS (TBD)   │ │
│  └─────────────────────┘  └──────────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**핵심 특징:**
- **인터페이스 기반 추상화**: `MetricsDataSource` 인터페이스로 데이터소스 유형과 무관한 코드 작성
- **Factory 패턴**: `DataSourceFactory`가 인스턴스 생성/캐싱/라이프사이클 관리
- **도메인 기반 그룹핑**: `ServiceDomain`으로 프로젝트를 chatbot/report/analytics로 분류
- **Symbol 기반 DI**: `METRICS_DATASOURCE` 토큰으로 타입 안전한 주입

---

## 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           NestJS Application                            │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      DataSourceModule                            │  │
│  │                                                                  │  │
│  │  ┌─────────────────────┐   ┌──────────────────────────────────┐ │  │
│  │  │DataSourceConfigSvc  │   │      DataSourceFactory           │ │  │
│  │  │                     │   │                                  │ │  │
│  │  │ • JSON 설정 로드    │──▶│ • getDataSource(projectId?)     │ │  │
│  │  │ • 환경변수 치환     │   │ • getDataSourcesByDomain(domain)│ │  │
│  │  │ • 프로젝트별 설정   │   │ • 인스턴스 캐싱                 │ │  │
│  │  │ • 도메인 기반 조회  │   │ • 라이프사이클 관리             │ │  │
│  │  └─────────────────────┘   └───────────────┬──────────────────┘ │  │
│  │                                            │                     │  │
│  │  ┌─────────────────────────────────────────▼──────────────────┐ │  │
│  │  │              METRICS_DATASOURCE Provider                   │ │  │
│  │  │                                                            │ │  │
│  │  │  useFactory: (factory) => factory.getDefaultDataSource()   │ │  │
│  │  └────────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                    │                                    │
│                                    │ exports                            │
│                                    ▼                                    │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                       MetricsModule                              │  │
│  │                                                                  │  │
│  │  ┌─────────────────────┐     ┌─────────────────────────────┐   │  │
│  │  │   MetricsService    │     │   DomainMetricsService      │   │  │
│  │  │                     │     │                             │   │  │
│  │  │ @Inject(METRICS_DS) │     │ @Inject(DataSourceFactory)  │   │  │
│  │  │ + CacheService      │     │ + 도메인별 집계             │   │  │
│  │  └─────────────────────┘     └─────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 핵심 컴포넌트

### 1. MetricsDataSource 인터페이스

**파일**: `src/datasource/interfaces/metrics-datasource.interface.ts`

모든 데이터소스가 구현해야 하는 핵심 인터페이스입니다.

```typescript
export interface MetricsDataSource {
  // ==================== Lifecycle Methods (3) ====================
  initialize(): Promise<void>;    // 연결 초기화
  dispose(): Promise<void>;       // 리소스 정리
  isHealthy(): Promise<boolean>;  // 헬스체크

  // ==================== Metrics Methods (11) ====================
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

  // ==================== Quality Analysis Methods (3) ====================
  getTokenEfficiencyTrend(): Promise<TokenEfficiencyTrend[]>;
  getQueryResponseCorrelation(): Promise<QueryResponseCorrelation[]>;
  getRepeatedQueryPatterns(): Promise<RepeatedQueryPattern[]>;

  // ==================== User Analytics Methods (5) ====================
  getUserRequestCounts(days?, limit?): Promise<UserRequestCount[]>;
  getUserTokenUsage(days?, limit?): Promise<UserTokenUsage[]>;
  getUserQuestionPatterns(userId?, limit?): Promise<UserQuestionPattern[]>;
  getUserList(days?, limit?): Promise<UserListItem[]>;
  getUserActivityDetail(userId, days?, limit?, offset?): Promise<UserActivityDetail[]>;

  // ==================== Chatbot Quality Methods (6) ====================
  getEmergingQueryPatterns(recentDays?, historicalDays?): Promise<EmergingQueryPattern[]>;
  getSentimentAnalysis(days?): Promise<SentimentAnalysisResult[]>;
  getRephrasedQueryPatterns(days?): Promise<RephrasedQueryPattern[]>;
  getSessionAnalytics(days?): Promise<SessionAnalytics[]>;
  getTenantQualitySummary(days?): Promise<TenantQualitySummary[]>;
  getResponseQualityMetrics(days?): Promise<ResponseQualityMetrics[]>;
}

// DI 토큰
export const METRICS_DATASOURCE = Symbol('METRICS_DATASOURCE');
```

**총 28개 메서드** (Lifecycle 3 + Metrics 11 + Quality 3 + User 5 + Chatbot Quality 6)

### 2. DataSource 설정 인터페이스

**파일**: `src/datasource/interfaces/datasource-config.interface.ts`

```typescript
// 지원 데이터소스 유형
export type DataSourceType = 'bigquery' | 'postgresql' | 'mysql';

// 서비스 도메인 (프로젝트 그룹핑용)
export type ServiceDomain = 'chatbot' | 'report' | 'analytics';

// BigQuery 설정
export interface BigQueryDataSourceConfig {
  type: 'bigquery';
  domain?: ServiceDomain;
  config: {
    projectId?: string;
    datasetId: string;
    tableName: string;
    location?: string;
    keyFilename?: string;
  };
}

// PostgreSQL 설정 (미구현)
export interface PostgreSQLDataSourceConfig {
  type: 'postgresql';
  domain?: ServiceDomain;
  config: {
    host: string;
    port: number;
    database: string;
    username?: string;
    password?: string;
    ssl?: boolean;
  };
}

// MySQL 설정 (미구현)
export interface MySQLDataSourceConfig {
  type: 'mysql';
  domain?: ServiceDomain;
  config: {
    host: string;
    port: number;
    database: string;
    username?: string;
    password?: string;
  };
}

// 유니온 타입
export type DataSourceConfig =
  | BigQueryDataSourceConfig
  | PostgreSQLDataSourceConfig
  | MySQLDataSourceConfig;

// 루트 설정 구조
export interface DataSourcesConfig {
  default: DataSourceConfig;           // 기본 데이터소스
  projects?: Record<string, DataSourceConfig>;  // 프로젝트별 오버라이드
}
```

### 3. DataSourceFactory

**파일**: `src/datasource/factory/datasource.factory.ts`

인스턴스 생성, 캐싱, 라이프사이클을 관리하는 팩토리 클래스입니다.

```typescript
@Injectable()
export class DataSourceFactory {
  private readonly instances: Map<string, MetricsDataSource> = new Map();

  constructor(private readonly configService: DataSourceConfigService) {}

  // 프로젝트별 DataSource 조회 (캐싱 적용)
  async getDataSource(projectId?: string): Promise<MetricsDataSource> {
    const cacheKey = projectId ?? 'default';

    if (this.instances.has(cacheKey)) {
      return this.instances.get(cacheKey)!;
    }

    const config = this.configService.getConfigForProject(projectId);
    const instance = await this.createDataSource(config);
    await instance.initialize();
    this.instances.set(cacheKey, instance);

    return instance;
  }

  // 도메인 기반 DataSource 조회
  async getDataSourcesByDomain(domain: ServiceDomain): Promise<DataSourceWithProject[]> {
    const projectIds = this.configService.getProjectIdsByDomain(domain);
    return Promise.all(
      projectIds.map(async (projectId) => ({
        projectId,
        ds: await this.getDataSource(projectId),
      }))
    );
  }

  // 전체 DataSource 조회
  async getAllDataSources(): Promise<DataSourceWithDomain[]>;

  // 인스턴스 무효화 (재생성 트리거)
  async invalidate(projectId?: string): Promise<void>;

  // 전체 정리 (앱 종료 시)
  async disposeAll(): Promise<void>;
}
```

**핵심 기능:**
- **인스턴스 캐싱**: `Map<string, MetricsDataSource>`로 projectId별 캐싱
- **Lazy 초기화**: 첫 요청 시 생성 → initialize() → 캐시 저장
- **도메인 기반 조회**: `getDataSourcesByDomain()`으로 같은 도메인의 모든 프로젝트 DataSource 조회
- **캐시 무효화**: `invalidate()`로 특정 프로젝트 재생성 트리거

### 4. DataSourceConfigService

**파일**: `src/datasource/datasource.config.ts`

JSON 설정 파일을 로드하고 환경변수를 치환합니다.

```typescript
@Injectable()
export class DataSourceConfigService implements OnModuleInit {
  private config: DataSourcesConfig;

  async onModuleInit(): Promise<void> {
    // config/datasources.config.json 로드
    // 환경변수 치환 (${GCP_PROJECT_ID} → 실제 값)
  }

  // 프로젝트별 설정 조회
  getConfigForProject(projectId?: string): ResolvedDataSourceConfig {
    if (projectId && this.config.projects?.[projectId]) {
      return this.resolveConfig(this.config.projects[projectId]);
    }
    return this.resolveConfig(this.config.default);
  }

  // 도메인별 프로젝트 ID 조회
  getProjectIdsByDomain(domain: ServiceDomain): string[] {
    return Object.entries(this.config.projects ?? {})
      .filter(([_, cfg]) => cfg.domain === domain)
      .map(([id]) => id);
  }

  // 사용 가능한 도메인 목록
  getAvailableDomains(): ServiceDomain[];
}
```

**설정 파일 예시** (`config/datasources.config.json`):

```json
{
  "default": {
    "type": "bigquery",
    "domain": "chatbot",
    "config": {
      "projectId": "${GCP_PROJECT_ID}",
      "datasetId": "${BIGQUERY_DATASET}",
      "tableName": "${BIGQUERY_TABLE}",
      "location": "${GCP_BQ_LOCATION}"
    }
  },
  "projects": {
    "project-b": {
      "type": "bigquery",
      "domain": "report",
      "config": {
        "projectId": "other-gcp-project",
        "datasetId": "reports",
        "tableName": "logs"
      }
    }
  }
}
```

### 5. DataSourceModule

**파일**: `src/datasource/datasource.module.ts`

NestJS 모듈로 DI 컨테이너에 등록합니다.

```typescript
const metricsDataSourceProvider = {
  provide: METRICS_DATASOURCE,
  useFactory: async (factory: DataSourceFactory): Promise<MetricsDataSource> => {
    return factory.getDefaultDataSource();
  },
  inject: [DataSourceFactory],
};

@Module({
  providers: [
    DataSourceConfigService,
    DataSourceFactory,
    metricsDataSourceProvider,
  ],
  exports: [
    DataSourceConfigService,
    DataSourceFactory,
    METRICS_DATASOURCE,  // Symbol 토큰 export
  ],
})
export class DataSourceModule implements OnModuleDestroy {
  constructor(private readonly factory: DataSourceFactory) {}

  async onModuleDestroy(): Promise<void> {
    await this.factory.disposeAll();  // 앱 종료 시 정리
  }
}
```

---

## Service Layer 연동

### MetricsService (기본 사용법)

```typescript
@Injectable()
export class MetricsService {
  constructor(
    private cacheService: CacheService,
    @Inject(METRICS_DATASOURCE) private metricsDataSource: MetricsDataSource,
  ) {}

  async getRealtimeKPI(): Promise<RealtimeKPI> {
    const cacheKey = CacheService.generateKey('metrics', 'realtime', 'kpi');

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.metricsDataSource.getRealtimeKPI(),
      CacheTTL.SHORT,  // 5분
    );
  }
}
```

**패턴:**
- `@Inject(METRICS_DATASOURCE)`로 기본 DataSource 주입
- `CacheService`로 응답 캐싱 (SHORT: 5분, MEDIUM: 15분, LONG: 1시간)

### DomainMetricsService (다중 프로젝트 집계)

```typescript
@Injectable()
export class DomainMetricsService {
  constructor(
    private readonly factory: DataSourceFactory,
    private readonly cacheService: CacheService,
  ) {}

  async getDomainKPISummary(domain: ServiceDomain): Promise<DomainKPISummary> {
    const dataSources = await this.factory.getDataSourcesByDomain(domain);

    // 병렬로 각 프로젝트의 KPI 조회
    const kpis = await Promise.all(
      dataSources.map(async ({ projectId, ds }) => ({
        projectId,
        kpi: await ds.getRealtimeKPI(),
      }))
    );

    // 집계 로직
    return this.aggregateKPIs(kpis);
  }
}
```

**패턴:**
- `DataSourceFactory` 직접 주입
- `getDataSourcesByDomain()`으로 도메인별 DataSource 조회
- 병렬 처리로 성능 최적화

---

## Repository Pattern vs DataSource Pattern

이 프로젝트는 **전통적인 Repository 패턴을 사용하지 않습니다.**

| 항목 | Repository Pattern | DataSource Pattern (현재) |
|------|-------------------|---------------------------|
| **추상화 계층** | Entity별 Repository | 기능 도메인별 DataSource |
| **인터페이스** | `IUserRepository`, `IOrderRepository` | `MetricsDataSource` (통합) |
| **메서드 스타일** | CRUD 중심 (`find`, `save`, `delete`) | 비즈니스 메서드 (`getRealtimeKPI`) |
| **쿼리 위치** | Repository 내부 | 별도 Query Builder (`MetricsQueries`) |
| **적합한 경우** | 엔티티 CRUD 중심 앱 | 분석/조회 중심 앱 |

**DataSource 패턴을 선택한 이유:**
1. **읽기 전용 분석 앱**: CRUD보다 복잡한 집계 쿼리가 대부분
2. **다양한 데이터소스**: BigQuery, PostgreSQL 등 이기종 DB 통합 필요
3. **도메인 기반 집계**: 여러 프로젝트를 도메인별로 그룹핑하여 집계

---

## 확장 가이드

### 새 DataSource 구현체 추가 (예: PostgreSQL)

#### 1. 구현체 생성

```typescript
// src/datasource/implementations/postgresql-metrics.datasource.ts
export interface PostgreSQLMetricsConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export class PostgreSQLMetricsDataSource implements MetricsDataSource {
  private client: Pool;  // pg Pool

  constructor(private config: PostgreSQLMetricsConfig) {}

  async initialize(): Promise<void> {
    this.client = new Pool({
      host: this.config.host,
      port: this.config.port,
      // ...
    });
    await this.client.query('SELECT 1');  // 연결 테스트
  }

  async dispose(): Promise<void> {
    await this.client.end();
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.client.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async getRealtimeKPI(): Promise<RealtimeKPI> {
    const result = await this.client.query(`
      SELECT
        COUNT(*) as total_requests,
        SUM(total_tokens) as total_tokens
      FROM logs
      WHERE timestamp > NOW() - INTERVAL '24 hours'
    `);
    return this.mapToRealtimeKPI(result.rows[0]);
  }

  // ... 나머지 27개 메서드 구현
}
```

#### 2. Factory에 케이스 추가

```typescript
// src/datasource/factory/datasource.factory.ts
private async createDataSource(config: ResolvedDataSourceConfig): Promise<MetricsDataSource> {
  switch (config.type) {
    case 'bigquery':
      return this.createBigQueryDataSource(config);

    case 'postgresql':  // 추가
      return this.createPostgreSQLDataSource(config);

    case 'mysql':
      throw new Error('MySQL data source not yet implemented');

    default:
      throw new Error(`Unknown data source type: ${config.type}`);
  }
}

private createPostgreSQLDataSource(config: ResolvedDataSourceConfig): PostgreSQLMetricsDataSource {
  const pgConfig: PostgreSQLMetricsConfig = {
    host: config.config.host as string,
    port: config.config.port as number,
    database: config.config.database as string,
    username: config.config.username as string,
    password: config.config.password as string,
  };
  return new PostgreSQLMetricsDataSource(pgConfig);
}
```

#### 3. 설정 파일 업데이트

```json
{
  "default": { /* BigQuery */ },
  "projects": {
    "legacy-system": {
      "type": "postgresql",
      "domain": "analytics",
      "config": {
        "host": "localhost",
        "port": 5432,
        "database": "analytics_db",
        "username": "${PG_USER}",
        "password": "${PG_PASSWORD}"
      }
    }
  }
}
```

---

## 설계 패턴

이 아키텍처에서 사용된 패턴들:

| 패턴 | 적용 위치 | 목적 |
|------|-----------|------|
| **Interface Segregation** | `MetricsDataSource` | 구현체와 사용처 분리 |
| **Factory Method** | `DataSourceFactory` | 인스턴스 생성 캡슐화 |
| **Singleton (per project)** | `DataSourceFactory.instances` | 프로젝트별 단일 인스턴스 |
| **Decorator** | `CacheService` wrapper | 캐싱 로직 분리 |
| **Dependency Injection** | `@Inject(METRICS_DATASOURCE)` | 의존성 역전 |
| **Configuration** | `DataSourceConfigService` | 설정 외부화 |
| **Lifecycle Hooks** | `initialize()`, `dispose()` | 리소스 관리 |

---

## 파일 구조

```
apps/backend/src/datasource/
├── index.ts                          # 배럴 export
├── datasource.module.ts              # NestJS 모듈
├── datasource.config.ts              # 설정 서비스
├── interfaces/
│   ├── index.ts
│   ├── metrics-datasource.interface.ts    # 핵심 인터페이스
│   └── datasource-config.interface.ts     # 설정 타입
├── factory/
│   ├── index.ts
│   └── datasource.factory.ts              # 팩토리 클래스
└── implementations/
    ├── index.ts
    └── bigquery-metrics.datasource.ts     # BigQuery 구현체

apps/backend/src/metrics/
├── metrics.service.ts                # 캐싱 래퍼 서비스
├── domain-metrics.service.ts         # 도메인별 집계 서비스
└── queries/
    └── metrics.queries.ts            # SQL 쿼리 빌더 (BigQuery용)
```

---

## 관련 문서

- [BACKEND_IMPLEMENTATION.md](./BACKEND_IMPLEMENTATION.md) - 백엔드 전체 구현 가이드
- [CLAUDE.md](../CLAUDE.md) - 프로젝트 개요 및 컨텍스트
- [apps/backend/src/datasource/AGENTS.md](../apps/backend/src/datasource/AGENTS.md) - DataSource 디렉토리 AI 에이전트 가이드
