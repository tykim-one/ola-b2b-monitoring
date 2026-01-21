# 코드베이스 분석: Factory Pattern

> **학습 목표**: Factory 패턴이 어떻게 DataSource 인스턴스를 생성하고 관리하는지 이해

---

## 분석 대상 파일

```
apps/backend/src/datasource/factory/datasource.factory.ts
```

---

## 1. Factory Pattern이란?

객체 생성 로직을 **별도의 클래스(Factory)에 위임**하는 패턴입니다.

### 왜 필요한가?

```typescript
// ❌ Factory 없이 - Service가 직접 생성
class MetricsService {
  constructor() {
    // 어떤 DataSource를 만들지 Service가 결정해야 함
    if (config.type === 'bigquery') {
      this.datasource = new BigQueryDataSource(config);
    } else if (config.type === 'postgresql') {
      this.datasource = new PostgreSQLDataSource(config);
    }
    // 문제: Service가 모든 DataSource 타입을 알아야 함!
  }
}

// ✅ Factory 사용 - 생성 로직 분리
class MetricsService {
  constructor(
    @Inject(METRICS_DATASOURCE) private datasource: MetricsDataSource
  ) {}
  // Service는 DataSource가 어떻게 만들어지는지 몰라도 됨
}
```

---

## 2. DataSourceFactory 구조 분석

### 2.1 클래스 선언

```typescript
@Injectable()  // NestJS DI에 등록
export class DataSourceFactory {
  private readonly logger = new Logger(DataSourceFactory.name);
  private readonly instances: Map<string, MetricsDataSource> = new Map();

  constructor(private readonly configService: DataSourceConfigService) {}
}
```

| 요소 | 설명 |
|------|------|
| `@Injectable()` | NestJS가 이 클래스를 DI로 관리 |
| `instances: Map` | **캐싱**: 이미 만든 인스턴스 저장 |
| `configService` | 설정 파일에서 config 읽어오는 서비스 |

### 2.2 핵심 메서드: getDataSource()

```typescript
async getDataSource(projectId?: string): Promise<MetricsDataSource> {
  const cacheKey = projectId ?? 'default';

  // 1. 캐시에 있으면 재사용
  if (this.instances.has(cacheKey)) {
    return this.instances.get(cacheKey)!;
  }

  // 2. 설정 가져오기
  const config = this.configService.getConfigForProject(projectId);

  // 3. 타입에 맞는 인스턴스 생성
  const instance = await this.createDataSource(config);

  // 4. 초기화 (DB 연결 등)
  await instance.initialize();

  // 5. 캐시에 저장
  this.instances.set(cacheKey, instance);

  return instance;
}
```

**흐름도:**
```
getDataSource('project-a')
        │
        ▼
┌───────────────────┐
│ 캐시에 있나?      │
└───────────────────┘
    │ No      │ Yes
    ▼         └──────► 캐시된 인스턴스 반환
┌───────────────────┐
│ config 조회       │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ createDataSource  │ ← switch(type)으로 분기
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ initialize()      │ ← DB 연결 수립
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ 캐시에 저장       │
└───────────────────┘
        │
        ▼
    인스턴스 반환
```

### 2.3 타입별 분기: createDataSource()

```typescript
private async createDataSource(config: ResolvedDataSourceConfig): Promise<MetricsDataSource> {
  switch (config.type) {
    case 'bigquery':
      return this.createBigQueryDataSource(config);

    case 'postgresql':
      throw new Error('PostgreSQL data source not yet implemented');

    case 'mysql':
      throw new Error('MySQL data source not yet implemented');

    default:
      throw new Error(`Unknown data source type: ${config.type}`);
  }
}
```

**핵심 포인트:**
- `switch` 문으로 타입별 분기
- 새 DataSource 추가 시 **이 switch에 case만 추가**
- 아직 구현 안 된 타입은 명확한 에러 메시지

### 2.4 BigQuery 인스턴스 생성

```typescript
private createBigQueryDataSource(config: ResolvedDataSourceConfig): BigQueryMetricsDataSource {
  // 설정 객체를 BigQuery 전용 형태로 변환
  const bqConfig: BigQueryMetricsConfig = {
    projectId: config.config.projectId as string,
    datasetId: config.config.datasetId as string,
    tableName: config.config.tableName as string,
    location: (config.config.location as string) || 'asia-northeast3',
    keyFilename: config.config.keyFilename as string | undefined,
  };

  return new BigQueryMetricsDataSource(bqConfig);
}
```

**패턴:**
1. 범용 config → 특화된 config로 변환
2. 기본값 설정 (location: 'asia-northeast3')
3. 구현체 인스턴스 생성

---

## 3. 라이프사이클 관리

### 3.1 정리: disposeAll()

```typescript
async disposeAll(): Promise<void> {
  // 모든 인스턴스를 병렬로 dispose
  const disposePromises = Array.from(this.instances.values()).map((ds) =>
    ds.dispose().catch((err) => {
      this.logger.warn(`Error disposing data source: ${err.message}`);
    }),
  );

  await Promise.all(disposePromises);
  this.instances.clear();  // 캐시 비우기
}
```

**사용 시점:**
- 앱 종료 시 (Module의 onModuleDestroy에서 호출)
- 리소스 누수 방지 (DB 연결 정리)

### 3.2 무효화: invalidate()

```typescript
async invalidate(projectId?: string): Promise<void> {
  const cacheKey = projectId ?? 'default';
  const instance = this.instances.get(cacheKey);

  if (instance) {
    await instance.dispose();      // 기존 인스턴스 정리
    this.instances.delete(cacheKey); // 캐시에서 제거
  }
}
```

**사용 시점:**
- 설정 변경 시
- 연결 문제 발생 시 재연결

---

## 4. 캐싱 전략 분석

### 4.1 왜 캐싱이 필요한가?

```typescript
private readonly instances: Map<string, MetricsDataSource> = new Map();
```

| 캐싱 없이 | 캐싱 있으면 |
|----------|------------|
| 요청마다 새 인스턴스 생성 | 인스턴스 재사용 |
| 요청마다 DB 연결 수립 | 연결 풀 재사용 |
| 느림, 리소스 낭비 | 빠름, 효율적 |

### 4.2 프로젝트별 캐싱

```typescript
const cacheKey = projectId ?? 'default';
```

```
instances Map:
┌────────────────┬──────────────────────────────┐
│ 'default'      │ BigQueryDataSource (main)    │
├────────────────┼──────────────────────────────┤
│ 'project-a'    │ PostgreSQLDataSource         │
├────────────────┼──────────────────────────────┤
│ 'project-b'    │ BigQueryDataSource (other)   │
└────────────────┴──────────────────────────────┘
```

**멀티테넌트 지원:**
- 각 프로젝트가 다른 DB 사용 가능
- 프로젝트별로 별도 인스턴스 캐싱

---

## 5. 새 DataSource 추가 방법

PostgreSQL을 예로 들면:

### Step 1: 구현체 생성
```typescript
// postgresql-metrics.datasource.ts
export class PostgreSQLMetricsDataSource implements MetricsDataSource {
  constructor(private config: PostgreSQLConfig) {}

  async initialize() { /* 연결 풀 생성 */ }
  async dispose() { /* 연결 종료 */ }
  async getRealtimeKPI() { /* SQL 쿼리 */ }
  // ... 28개 메서드 구현
}
```

### Step 2: Factory에 case 추가
```typescript
// datasource.factory.ts
switch (config.type) {
  case 'bigquery':
    return this.createBigQueryDataSource(config);

  case 'postgresql':           // 추가!
    return this.createPostgreSQLDataSource(config);

  // ...
}

private createPostgreSQLDataSource(config): PostgreSQLMetricsDataSource {
  // PostgreSQL 전용 설정 변환 및 인스턴스 생성
}
```

### Step 3: 설정 파일에 프로젝트 추가
```json
{
  "projects": {
    "legacy-project": {
      "type": "postgresql",
      "config": { "host": "db.example.com", ... }
    }
  }
}
```

**Service 코드 변경 없음!** → OCP (Open-Closed Principle)

---

## 6. 설계 패턴 정리

| 패턴 | 역할 | 코드 위치 |
|------|------|----------|
| **Factory** | 객체 생성 로직 캡슐화 | `createDataSource()` |
| **Singleton (per project)** | 프로젝트별 단일 인스턴스 | `instances Map` |
| **Lazy Initialization** | 필요할 때 생성 | `getDataSource()` |
| **Strategy** | 타입별 다른 생성 로직 | `switch (config.type)` |

---

## 7. 핵심 개념 정리

```
┌─────────────────────────────────────────────────────────────┐
│                    DataSourceFactory                        │
│                                                             │
│  책임:                                                      │
│  1. 설정에 따라 올바른 DataSource 타입 선택                 │
│  2. 인스턴스 생성 및 초기화                                 │
│  3. 인스턴스 캐싱 (재사용)                                  │
│  4. 라이프사이클 관리 (dispose)                             │
│                                                             │
│  장점:                                                      │
│  - Service는 DataSource 생성 방법을 몰라도 됨              │
│  - 새 DataSource 추가 시 Factory만 수정                    │
│  - 테스트 시 Mock Factory 주입 가능                        │
└─────────────────────────────────────────────────────────────┘
```
