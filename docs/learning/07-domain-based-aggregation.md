# 도메인별 데이터 집계 설계

> **학습 목표**: 프로젝트를 도메인(서비스 타입)별로 그룹화하여 종합 데이터를 제공하는 구조 이해

---

## 요구사항

| 페이지 유형 | 데이터 범위 | 예시 |
|------------|------------|------|
| **프로젝트별** | 단일 프로젝트 | Project A 대시보드 |
| **도메인별** | 같은 서비스 타입의 프로젝트들 | 챗봇 종합 (A + C) |
| **전체 종합** | 모든 프로젝트 | 글로벌 대시보드 |

---

## 프로젝트 구성 예시

```
Project A: 챗봇     (BigQuery)    ─┐
Project C: 챗봇     (MySQL)       ─┴─► 챗봇 도메인 대시보드

Project B: 리포트   (PostgreSQL)  ───► 리포트 도메인 대시보드
```

---

## 설계 구조

### 1. 설정 파일에 도메인 메타데이터 추가

```json
// config/datasources.config.json
{
  "default": {
    "type": "bigquery",
    "domain": "chatbot",
    "config": { ... }
  },
  "projects": {
    "project-a": {
      "type": "bigquery",
      "domain": "chatbot",
      "config": { ... }
    },
    "project-b": {
      "type": "postgresql",
      "domain": "report",
      "config": { ... }
    },
    "project-c": {
      "type": "mysql",
      "domain": "chatbot",
      "config": { ... }
    }
  }
}
```

### 2. 설정 타입 확장

```typescript
// datasource-config.interface.ts

// 도메인 타입 정의
export type ServiceDomain = 'chatbot' | 'report' | 'analytics';

// 설정에 도메인 추가
export interface DataSourceConfig {
  type: DataSourceType;
  domain: ServiceDomain;  // 추가
  config: Record<string, unknown>;
}
```

### 3. ConfigService 확장

```typescript
// datasource.config.ts

// 도메인별 프로젝트 ID 조회
getProjectIdsByDomain(domain: ServiceDomain): string[] {
  const projects = this.config.projects || {};

  return Object.entries(projects)
    .filter(([_, config]) => config.domain === domain)
    .map(([projectId]) => projectId);
}

// 모든 프로젝트 ID 조회
getAllProjectIds(): string[] {
  return Object.keys(this.config.projects || {});
}
```

### 4. Factory 확장

```typescript
// datasource.factory.ts

// 도메인별 DataSource 조회
async getDataSourcesByDomain(domain: ServiceDomain): Promise<Array<{
  projectId: string;
  ds: MetricsDataSource;
}>> {
  const projectIds = this.configService.getProjectIdsByDomain(domain);

  return Promise.all(
    projectIds.map(async (projectId) => ({
      projectId,
      ds: await this.getDataSource(projectId),
    }))
  );
}

// 모든 DataSource 조회
async getAllDataSources(): Promise<Array<{
  projectId: string;
  ds: MetricsDataSource;
}>> {
  const projectIds = this.configService.getAllProjectIds();

  return Promise.all(
    projectIds.map(async (projectId) => ({
      projectId,
      ds: await this.getDataSource(projectId),
    }))
  );
}
```

---

## 서비스 계층 구조

### 기존: 프로젝트별 서비스

```typescript
@Injectable()
class MetricsService {
  constructor(
    @Inject(METRICS_DATASOURCE) private metricsDataSource: MetricsDataSource
  ) {}

  async getRealtimeKPI(): Promise<RealtimeKPI> {
    return this.metricsDataSource.getRealtimeKPI();
  }
}
```

### 추가: 도메인별 집계 서비스

```typescript
@Injectable()
class DomainMetricsService {
  constructor(private factory: DataSourceFactory) {}

  // 챗봇 도메인 종합
  async getChatbotSummary(): Promise<DomainSummaryKPI> {
    return this.getDomainSummary('chatbot');
  }

  // 리포트 도메인 종합
  async getReportSummary(): Promise<DomainSummaryKPI> {
    return this.getDomainSummary('report');
  }

  // 공통 집계 로직
  private async getDomainSummary(domain: ServiceDomain): Promise<DomainSummaryKPI> {
    const dataSources = await this.factory.getDataSourcesByDomain(domain);

    const results = await Promise.all(
      dataSources.map(async ({ projectId, ds }) => ({
        projectId,
        kpi: await ds.getRealtimeKPI(),
      }))
    );

    return {
      domain,
      totalRequests: results.reduce((sum, r) => sum + r.kpi.totalRequests, 0),
      totalTokens: results.reduce((sum, r) => sum + r.kpi.totalTokens, 0),
      projectCount: results.length,
      byProject: results,
    };
  }
}
```

### 추가: 글로벌 집계 서비스

```typescript
@Injectable()
class GlobalMetricsService {
  constructor(private factory: DataSourceFactory) {}

  async getGlobalSummary(): Promise<GlobalSummaryKPI> {
    const dataSources = await this.factory.getAllDataSources();

    const results = await Promise.all(
      dataSources.map(async ({ projectId, ds }) => ({
        projectId,
        kpi: await ds.getRealtimeKPI(),
      }))
    );

    return {
      totalRequests: results.reduce((sum, r) => sum + r.kpi.totalRequests, 0),
      totalTokens: results.reduce((sum, r) => sum + r.kpi.totalTokens, 0),
      projectCount: results.length,
      byProject: results,
    };
  }
}
```

---

## API 엔드포인트 구조

```
프로젝트별 조회
GET /api/metrics/realtime?projectId=project-a
    → MetricsService.getRealtimeKPI()
    → 단일 DataSource

도메인별 조회
GET /api/metrics/domain/chatbot/summary
    → DomainMetricsService.getChatbotSummary()
    → 챗봇 도메인 DataSources (A + C)

GET /api/metrics/domain/report/summary
    → DomainMetricsService.getReportSummary()
    → 리포트 도메인 DataSources (B)

전체 조회
GET /api/metrics/global/summary
    → GlobalMetricsService.getGlobalSummary()
    → 모든 DataSources (A + B + C)
```

---

## 전체 흐름도

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Controller Layer                            │
├─────────────────┬─────────────────────┬─────────────────────────────┤
│ /project/:id    │ /domain/:domain     │ /global                     │
└────────┬────────┴──────────┬──────────┴──────────────┬──────────────┘
         │                   │                         │
         ▼                   ▼                         ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────────┐
│ MetricsService  │ │DomainMetrics    │ │ GlobalMetricsService        │
│ (프로젝트별)     │ │Service          │ │ (전체 종합)                  │
└────────┬────────┘ └────────┬────────┘ └──────────────┬──────────────┘
         │                   │                         │
         ▼                   ▼                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       DataSourceFactory                             │
├─────────────────┬─────────────────────┬─────────────────────────────┤
│ getDataSource() │getDataSourcesByDomain│ getAllDataSources()        │
│ (단일)          │ (도메인별)           │ (전체)                      │
└────────┬────────┴──────────┬──────────┴──────────────┬──────────────┘
         │                   │                         │
         ▼                   ▼                         ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────────┐
│ Project A       │ │ A + C           │ │ A + B + C                   │
│ DataSource      │ │ DataSources     │ │ DataSources                 │
└─────────────────┘ └─────────────────┘ └─────────────────────────────┘
```

---

## 반환 타입 정의

```typescript
// shared-types에 추가

// 도메인별 종합 KPI
interface DomainSummaryKPI {
  domain: ServiceDomain;
  totalRequests: number;
  totalTokens: number;
  projectCount: number;
  byProject: Array<{
    projectId: string;
    kpi: RealtimeKPI;
  }>;
}

// 글로벌 종합 KPI
interface GlobalSummaryKPI {
  totalRequests: number;
  totalTokens: number;
  projectCount: number;
  byProject: Array<{
    projectId: string;
    kpi: RealtimeKPI;
  }>;
  byDomain?: Record<ServiceDomain, DomainSummaryKPI>;  // 선택적
}
```

---

## 핵심 포인트

| 포인트 | 설명 |
|--------|------|
| **Interface 통일** | 모든 구현체가 동일 타입(RealtimeKPI) 반환 |
| **매핑 책임** | 각 구현체가 자신의 DB → 공통 타입 변환 |
| **집계 단순화** | 상위 서비스는 합산만 (매핑 몰라도 됨) |
| **도메인 메타데이터** | 설정 파일에서 그룹 정보 관리 |

---

## 확장: 태그 기반 시스템

더 유연한 그룹화가 필요하면:

```json
{
  "project-a": {
    "type": "bigquery",
    "tags": ["chatbot", "b2b", "korea"],
    "config": { ... }
  }
}
```

```typescript
// 여러 조건으로 필터링
await factory.getDataSourcesByTags(['chatbot', 'korea']);
```

---

## 구현 우선순위

1. **설정 파일에 domain 필드 추가** (datasources.config.json)
2. **ConfigService에 도메인별 조회 메서드 추가**
3. **Factory에 getDataSourcesByDomain, getAllDataSources 추가**
4. **DomainMetricsService, GlobalMetricsService 생성**
5. **Controller 엔드포인트 추가**
6. **shared-types에 Summary 타입 추가**
