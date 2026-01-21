# DataSource 확장 구현 계획

> **목표**: 프로젝트별, 도메인별, 전체 종합 데이터 조회가 가능한 DataSource 아키텍처 구현

---

## 현재 상태 요약

> **📅 최종 업데이트**: 2026-01-21
> **상태**: Phase 1-7 모두 구현 완료

### 이미 구현된 것 ✅

**Core Infrastructure (Phase 1-3)**
- `MetricsDataSource` 인터페이스 (30개 메서드: 3 lifecycle + 27 query)
- `BigQueryMetricsDataSource` 구현체 (515 lines)
- `DataSourceFactory` (프로젝트별/도메인별/전체 조회 지원)
- `DataSourceModule` (NestJS DI 설정)
- `MetricsService` (캐싱 래퍼)
- `ServiceDomain` 타입 (`'chatbot' | 'report' | 'analytics'`)
- `datasources.config.json` (도메인 메타데이터 포함)

**Aggregation Layer (Phase 4-7)**
- `DomainMetricsService` (173 lines) - 도메인별 KPI 집계
- `GlobalMetricsService` (170 lines) - 전체 KPI 집계
- `AggregationController` - 도메인/글로벌 엔드포인트
- `DomainSummaryKPI`, `GlobalSummaryKPI`, `ProjectKPI` 타입 (`@ola/shared-types`)

### 향후 확장 작업 🔧

**DataSource 구현체 추가**
- MySQLMetricsDataSource 구현 (현재 스텁만 존재)
- PostgreSQLMetricsDataSource 구현 (현재 스텁만 존재)

**집계 서비스 확장**
- HourlyTraffic 도메인별 집계
- CostTrend 도메인별 집계
- TenantUsage 도메인별 집계

**품질 개선**
- 부분 실패 시 `warnings` 필드 추가
- 도메인/글로벌 집계 로직 단위 테스트
- 환경별 설정 파일 분리 (`datasources.dev.json`, `datasources.prod.json`)

---

## 비즈니스 요구사항

### 프로젝트 구성
```
Project A: 챗봇     (BigQuery)    ─┐
Project C: 챗봇     (MySQL)       ─┴─► 챗봇 도메인 종합

Project B: 리포트   (PostgreSQL)  ───► 리포트 도메인 종합
```

### 필요한 조회 방식
| 페이지 | 조회 방식 | 데이터 범위 |
|--------|----------|------------|
| 프로젝트 대시보드 | 프로젝트별 | 단일 프로젝트 |
| 챗봇 종합 대시보드 | 도메인별 | A + C |
| 리포트 종합 대시보드 | 도메인별 | B |
| 글로벌 대시보드 | 전체 | A + B + C |

---

## 구현 단계

### Phase 1: 설정 및 타입 확장 ✅ 완료

#### 1.1 도메인 타입 정의
**파일**: `apps/backend/src/datasource/interfaces/datasource-config.interface.ts`

```typescript
// 추가할 내용
export type ServiceDomain = 'chatbot' | 'report' | 'analytics';

// DataSourceConfig에 domain 필드 추가
export interface BigQueryDataSourceConfig {
  type: 'bigquery';
  domain: ServiceDomain;  // 추가
  config: { ... };
}

// PostgreSQL, MySQL도 동일하게 추가
```

#### 1.2 설정 파일 업데이트
**파일**: `apps/backend/config/datasources.config.json`

```json
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

---

### Phase 2: ConfigService 확장 ✅ 완료

**파일**: `apps/backend/src/datasource/datasource.config.ts`

```typescript
// 추가할 메서드들

// 도메인별 프로젝트 ID 목록 조회
getProjectIdsByDomain(domain: ServiceDomain): string[] {
  const projects = this.config.projects || {};
  return Object.entries(projects)
    .filter(([_, config]) => config.domain === domain)
    .map(([projectId]) => projectId);
}

// 모든 프로젝트 ID 목록 조회
getAllProjectIds(): string[] {
  return Object.keys(this.config.projects || {});
}

// 사용 가능한 도메인 목록 조회
getAvailableDomains(): ServiceDomain[] {
  const projects = this.config.projects || {};
  const domains = new Set(
    Object.values(projects).map(config => config.domain)
  );
  return Array.from(domains) as ServiceDomain[];
}
```

---

### Phase 3: Factory 확장 ✅ 완료

**파일**: `apps/backend/src/datasource/factory/datasource.factory.ts`

```typescript
// 추가할 메서드들

// 도메인별 DataSource 목록 조회
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

// 모든 DataSource 목록 조회
async getAllDataSources(): Promise<Array<{
  projectId: string;
  domain: ServiceDomain;
  ds: MetricsDataSource;
}>> {
  const projectIds = this.configService.getAllProjectIds();

  return Promise.all(
    projectIds.map(async (projectId) => {
      const config = this.configService.getConfigForProject(projectId);
      return {
        projectId,
        domain: config.domain,
        ds: await this.getDataSource(projectId),
      };
    })
  );
}
```

---

### Phase 4: 집계 타입 정의 ✅ 완료

**파일**: `packages/shared-types/src/metrics.ts` (또는 새 파일)

```typescript
import { RealtimeKPI } from './realtime-kpi';

// 프로젝트별 KPI
export interface ProjectKPI {
  projectId: string;
  kpi: RealtimeKPI;
}

// 도메인별 종합 KPI
export interface DomainSummaryKPI {
  domain: string;
  totalRequests: number;
  successRate: number;
  totalTokens: number;
  projectCount: number;
  byProject: ProjectKPI[];
}

// 글로벌 종합 KPI
export interface GlobalSummaryKPI {
  totalRequests: number;
  successRate: number;
  totalTokens: number;
  projectCount: number;
  byProject: ProjectKPI[];
  byDomain: Record<string, DomainSummaryKPI>;
}
```

---

### Phase 5: 집계 서비스 생성 ✅ 완료

#### 5.1 도메인별 집계 서비스
**파일**: `apps/backend/src/metrics/domain-metrics.service.ts` (신규)

```typescript
@Injectable()
export class DomainMetricsService {
  constructor(
    private factory: DataSourceFactory,
    private cacheService: CacheService,
  ) {}

  async getDomainSummary(domain: ServiceDomain): Promise<DomainSummaryKPI> {
    const cacheKey = CacheService.generateKey('metrics', 'domain', domain, 'summary');

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.fetchDomainSummary(domain),
      CacheTTL.MEDIUM,
    );
  }

  private async fetchDomainSummary(domain: ServiceDomain): Promise<DomainSummaryKPI> {
    const dataSources = await this.factory.getDataSourcesByDomain(domain);

    const results = await Promise.all(
      dataSources.map(async ({ projectId, ds }) => ({
        projectId,
        kpi: await ds.getRealtimeKPI(),
      }))
    );

    return this.aggregateResults(domain, results);
  }

  private aggregateResults(domain: string, results: ProjectKPI[]): DomainSummaryKPI {
    const totalRequests = results.reduce((sum, r) => sum + r.kpi.totalRequests, 0);
    const totalTokens = results.reduce((sum, r) => sum + r.kpi.totalTokens, 0);
    const weightedSuccessRate = results.reduce(
      (sum, r) => sum + r.kpi.successRate * r.kpi.totalRequests, 0
    ) / (totalRequests || 1);

    return {
      domain,
      totalRequests,
      successRate: weightedSuccessRate,
      totalTokens,
      projectCount: results.length,
      byProject: results,
    };
  }
}
```

#### 5.2 글로벌 집계 서비스
**파일**: `apps/backend/src/metrics/global-metrics.service.ts` (신규)

```typescript
@Injectable()
export class GlobalMetricsService {
  constructor(
    private factory: DataSourceFactory,
    private domainService: DomainMetricsService,
    private cacheService: CacheService,
  ) {}

  async getGlobalSummary(): Promise<GlobalSummaryKPI> {
    const cacheKey = CacheService.generateKey('metrics', 'global', 'summary');

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.fetchGlobalSummary(),
      CacheTTL.MEDIUM,
    );
  }

  private async fetchGlobalSummary(): Promise<GlobalSummaryKPI> {
    const domains = this.factory.configService.getAvailableDomains();

    // 도메인별 종합 병렬 조회
    const domainResults = await Promise.all(
      domains.map(domain => this.domainService.getDomainSummary(domain))
    );

    // 전체 집계
    const byDomain: Record<string, DomainSummaryKPI> = {};
    const allProjects: ProjectKPI[] = [];

    for (const domainSummary of domainResults) {
      byDomain[domainSummary.domain] = domainSummary;
      allProjects.push(...domainSummary.byProject);
    }

    const totalRequests = domainResults.reduce((sum, d) => sum + d.totalRequests, 0);
    const totalTokens = domainResults.reduce((sum, d) => sum + d.totalTokens, 0);
    const weightedSuccessRate = domainResults.reduce(
      (sum, d) => sum + d.successRate * d.totalRequests, 0
    ) / (totalRequests || 1);

    return {
      totalRequests,
      successRate: weightedSuccessRate,
      totalTokens,
      projectCount: allProjects.length,
      byProject: allProjects,
      byDomain,
    };
  }
}
```

---

### Phase 6: Controller 확장 ✅ 완료

**파일**: `apps/backend/src/metrics/metrics.controller.ts`

```typescript
// 기존 프로젝트별 엔드포인트 유지
@Get('realtime')
async getRealtimeKPI(@Query('projectId') projectId?: string) { ... }

// 도메인별 엔드포인트 추가
@Get('domain/:domain/summary')
async getDomainSummary(@Param('domain') domain: ServiceDomain) {
  return this.domainMetricsService.getDomainSummary(domain);
}

// 글로벌 엔드포인트 추가
@Get('global/summary')
async getGlobalSummary() {
  return this.globalMetricsService.getGlobalSummary();
}

// 사용 가능한 도메인 목록
@Get('domains')
async getAvailableDomains() {
  return this.factory.configService.getAvailableDomains();
}
```

---

### Phase 7: Module 업데이트 ✅ 완료

**파일**: `apps/backend/src/metrics/metrics.module.ts`

```typescript
@Module({
  imports: [DataSourceModule, CacheModule],
  controllers: [MetricsController],
  providers: [
    MetricsService,
    DomainMetricsService,   // 추가
    GlobalMetricsService,   // 추가
  ],
  exports: [MetricsService, DomainMetricsService, GlobalMetricsService],
})
export class MetricsModule {}
```

---

## 파일 변경 목록

### 수정된 파일 ✅
| 파일 | 변경 내용 | 상태 |
|------|----------|------|
| `datasource/interfaces/datasource-config.interface.ts` | ServiceDomain 타입, domain 필드 추가 | ✅ 완료 |
| `datasource/datasource.config.ts` | 도메인별/전체 조회 메서드 추가 | ✅ 완료 |
| `datasource/factory/datasource.factory.ts` | getDataSourcesByDomain, getAllDataSources 추가 | ✅ 완료 |
| `metrics/metrics.module.ts` | 새 서비스 등록 | ✅ 완료 |
| `config/datasources.config.json` | domain 필드 추가 | ✅ 완료 |

### 생성된 파일 ✅
| 파일 | 내용 | 상태 |
|------|------|------|
| `metrics/domain-metrics.service.ts` | 도메인별 집계 서비스 (173 lines) | ✅ 완료 |
| `metrics/global-metrics.service.ts` | 글로벌 집계 서비스 (170 lines) | ✅ 완료 |
| `metrics/aggregation.controller.ts` | 도메인/글로벌 엔드포인트 | ✅ 완료 |
| `shared-types/src/index.ts` | DomainSummaryKPI, GlobalSummaryKPI, ProjectKPI 타입 | ✅ 완료 |

---

## API 엔드포인트 최종 구조 ✅ 구현 완료

```
기존 (유지)
GET /api/metrics/realtime?projectId=xxx     → 프로젝트별 KPI

신규 (구현 완료 ✅)
GET /api/metrics/domain/:domain/summary     → 도메인별 종합 KPI
GET /api/metrics/global/summary             → 전체 종합 KPI
GET /api/metrics/domains                    → 사용 가능한 도메인 목록
```

> **구현 파일**: `apps/backend/src/metrics/aggregation.controller.ts`

---

## 검증 방법

### 1. 유닛 테스트
```bash
cd apps/backend
pnpm test -- --testPathPattern="domain-metrics"
pnpm test -- --testPathPattern="global-metrics"
```

### 2. API 테스트
```bash
# 프로젝트별 (기존)
curl http://localhost:3000/api/metrics/realtime?projectId=project-a

# 도메인별 (신규)
curl http://localhost:3000/api/metrics/domain/chatbot/summary
curl http://localhost:3000/api/metrics/domain/report/summary

# 글로벌 (신규)
curl http://localhost:3000/api/metrics/global/summary

# 도메인 목록
curl http://localhost:3000/api/metrics/domains
```

### 3. 캐싱 확인
- 동일 요청 2회 시 두 번째가 빠른지 확인
- 로그에서 캐시 히트 확인

---

## 구현 순서 (완료됨 ✅)

| 순서 | Phase | 상태 |
|------|-------|------|
| 1 | Phase 1: 타입/설정 확장 | ✅ 완료 |
| 2 | Phase 4: shared-types에 Summary 타입 추가 | ✅ 완료 |
| 3 | Phase 2: ConfigService 메서드 추가 | ✅ 완료 |
| 4 | Phase 3: Factory 메서드 추가 | ✅ 완료 |
| 5 | Phase 5: 집계 서비스 생성 | ✅ 완료 |
| 6 | Phase 6-7: Controller/Module 연결 | ✅ 완료 |
| 7 | 테스트 및 검증 | 🔧 추가 테스트 필요 |

---

## 관련 학습 문서

- [01-data-access-patterns.md](./learning/01-data-access-patterns.md) - 패턴 비교
- [02-nestjs-di-concepts.md](./learning/02-nestjs-di-concepts.md) - NestJS DI
- [03-codebase-interface-analysis.md](./learning/03-codebase-interface-analysis.md) - Interface 분석
- [04-codebase-factory-analysis.md](./learning/04-codebase-factory-analysis.md) - Factory 분석
- [05-codebase-module-service.md](./learning/05-codebase-module-service.md) - Module/Service 연결
- [06-extension-guide.md](./learning/06-extension-guide.md) - 확장 가이드
- [07-domain-based-aggregation.md](./learning/07-domain-based-aggregation.md) - 도메인별 집계 설계

---

## 향후 확장 가이드

### 새 DataSource 구현체 추가 (MySQL/PostgreSQL)

```
MySQL 또는 PostgreSQL DataSource를 구현해줘.
BigQueryMetricsDataSource를 참고하여 30개 메서드를 모두 구현해.
```

### 집계 서비스 메서드 확장

```
DomainMetricsService에 getHourlyTraffic, getCostTrend 집계 메서드를 추가해줘.
현재 RealtimeKPI만 집계하고 있는데, 다른 메트릭도 도메인별로 집계할 수 있게 해줘.
```

### 에러 처리 개선

```
집계 서비스에서 일부 프로젝트 실패 시 warnings 필드를 응답에 포함해줘.
사용자가 부분 데이터임을 알 수 있게 해줘.
```
