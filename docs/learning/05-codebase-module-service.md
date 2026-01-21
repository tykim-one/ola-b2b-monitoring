# 코드베이스 분석: Module & Service 연결

> **학습 목표**: NestJS Module이 어떻게 DI를 설정하고, Service가 DataSource를 사용하는지 이해

---

## 분석 대상 파일

```
apps/backend/src/datasource/datasource.module.ts  ← DI 설정
apps/backend/src/metrics/metrics.service.ts       ← DataSource 사용
```

---

## 1. DataSourceModule 분석

**파일**: `apps/backend/src/datasource/datasource.module.ts`

### 1.1 전체 코드

```typescript
import { Module, OnModuleDestroy, Logger } from '@nestjs/common';
import { DataSourceConfigService } from './datasource.config';
import { DataSourceFactory } from './factory';
import { METRICS_DATASOURCE, MetricsDataSource } from './interfaces';

// Provider 정의: METRICS_DATASOURCE 토큰에 Factory로 생성한 인스턴스 연결
const metricsDataSourceProvider = {
  provide: METRICS_DATASOURCE,           // 토큰 (Symbol)
  useFactory: async (factory: DataSourceFactory): Promise<MetricsDataSource> => {
    return factory.getDefaultDataSource(); // Factory가 인스턴스 생성
  },
  inject: [DataSourceFactory],            // Factory를 주입받음
};

@Module({
  providers: [
    DataSourceConfigService,    // 설정 서비스
    DataSourceFactory,          // 팩토리
    metricsDataSourceProvider,  // DataSource 인스턴스
  ],
  exports: [
    DataSourceConfigService,
    DataSourceFactory,
    METRICS_DATASOURCE,  // 다른 모듈에서 사용 가능하게 export
  ],
})
export class DataSourceModule implements OnModuleDestroy {
  constructor(private readonly factory: DataSourceFactory) {}

  // 앱 종료 시 리소스 정리
  async onModuleDestroy(): Promise<void> {
    await this.factory.disposeAll();
  }
}
```

### 1.2 핵심 구조: useFactory Provider

```typescript
const metricsDataSourceProvider = {
  provide: METRICS_DATASOURCE,  // 1. 토큰
  useFactory: async (factory) => factory.getDefaultDataSource(),  // 2. 생성 로직
  inject: [DataSourceFactory],  // 3. 의존성
};
```

**단계별 설명:**

| 단계 | 역할 | 코드 |
|------|------|------|
| 1 | **토큰 지정** | `provide: METRICS_DATASOURCE` |
| 2 | **생성 로직** | `useFactory: (factory) => ...` |
| 3 | **의존성 주입** | `inject: [DataSourceFactory]` |

**왜 useFactory를 사용하나?**
- `getDefaultDataSource()`는 **비동기** (async)
- 단순 `useClass`로는 비동기 초기화 불가
- Factory를 통해 복잡한 생성 로직 처리

### 1.3 Module 데코레이터 분석

```typescript
@Module({
  providers: [
    DataSourceConfigService,    // 1) 설정 로드
    DataSourceFactory,          // 2) 인스턴스 생성
    metricsDataSourceProvider,  // 3) 토큰 ↔ 인스턴스 연결
  ],
  exports: [
    METRICS_DATASOURCE,  // ⭐ 다른 모듈에서 주입 가능
  ],
})
```

**exports가 중요한 이유:**
- `exports`에 있어야 다른 모듈에서 import 후 사용 가능
- 없으면 이 모듈 내부에서만 사용

### 1.4 라이프사이클: OnModuleDestroy

```typescript
export class DataSourceModule implements OnModuleDestroy {
  constructor(private readonly factory: DataSourceFactory) {}

  async onModuleDestroy(): Promise<void> {
    await this.factory.disposeAll();  // 모든 DataSource 정리
  }
}
```

**NestJS 라이프사이클 훅:**
| 훅 | 호출 시점 |
|----|---------|
| `OnModuleInit` | 모듈 초기화 완료 후 |
| `OnModuleDestroy` | 앱 종료 전 |
| `OnApplicationShutdown` | 시그널 수신 시 (SIGTERM 등) |

---

## 2. MetricsService 분석

**파일**: `apps/backend/src/metrics/metrics.service.ts`

### 2.1 의존성 주입

```typescript
@Injectable()
export class MetricsService implements OnModuleInit {
  constructor(
    private configService: ConfigService,
    private projectStrategy: DefaultProjectStrategy,
    private cacheService: CacheService,
    @Inject(METRICS_DATASOURCE) private metricsDataSource: MetricsDataSource,
    //      ↑ Symbol 토큰         ↑ Interface 타입
  ) {}
}
```

**주입 방식 비교:**
```typescript
// 클래스 직접 주입 (토큰 = 클래스)
constructor(private cacheService: CacheService) {}

// 토큰으로 주입 (인터페이스 사용 시)
constructor(@Inject(METRICS_DATASOURCE) private ds: MetricsDataSource) {}
```

### 2.2 캐싱 래퍼 패턴

```typescript
async getRealtimeKPI(): Promise<RealtimeKPI> {
  const cacheKey = CacheService.generateKey('metrics', 'realtime', 'kpi');

  return this.cacheService.getOrSet(
    cacheKey,                                      // 캐시 키
    async () => this.metricsDataSource.getRealtimeKPI(),  // 캐시 미스 시 호출
    CacheTTL.SHORT,                                // TTL: 5분
  );
}
```

**getOrSet 동작:**
```
getOrSet(key, getter, ttl)
        │
        ▼
┌──────────────────┐
│ 캐시에 key 있음? │
└──────────────────┘
    │ No       │ Yes
    ▼          └──────► 캐시된 값 반환
┌──────────────────┐
│ getter() 호출    │ ← DataSource.getRealtimeKPI()
└──────────────────┘
        │
        ▼
┌──────────────────┐
│ 결과를 캐시 저장 │
└──────────────────┘
        │
        ▼
    결과 반환
```

### 2.3 Service의 역할

```typescript
// Service는 "무엇을" 하는지만 정의
async getRealtimeKPI() {
  return this.cacheService.getOrSet(
    key,
    () => this.metricsDataSource.getRealtimeKPI(),  // DataSource에게 위임
    ttl,
  );
}
```

**Service의 책임:**
1. **캐싱**: 반복 요청 최적화
2. **위임**: 실제 쿼리는 DataSource가 실행
3. **비즈니스 로직**: (필요시) 데이터 가공

**Service가 하지 않는 것:**
- SQL 쿼리 작성 ❌
- DB 연결 관리 ❌
- 데이터소스 타입 알기 ❌

---

## 3. 전체 흐름 정리

```
┌─────────────────────────────────────────────────────────────────────┐
│                        앱 시작                                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 1. DataSourceModule 로드                                            │
│    - DataSourceConfigService 생성                                   │
│    - DataSourceFactory 생성                                         │
│    - metricsDataSourceProvider 실행                                 │
│      → factory.getDefaultDataSource()                               │
│      → BigQueryMetricsDataSource 생성 & 초기화                      │
│    - METRICS_DATASOURCE 토큰에 인스턴스 등록                        │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. MetricsModule 로드                                               │
│    - imports: [DataSourceModule]                                    │
│    - MetricsService 생성                                            │
│      → @Inject(METRICS_DATASOURCE)로 DataSource 주입                │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. HTTP 요청: GET /api/metrics/realtime                             │
│    - MetricsController.getRealtimeKPI()                             │
│    - MetricsService.getRealtimeKPI()                                │
│      → CacheService.getOrSet()                                      │
│        → (캐시 미스) metricsDataSource.getRealtimeKPI()             │
│          → BigQueryMetricsDataSource.getRealtimeKPI()               │
│            → BigQuery SQL 실행                                      │
│    - 결과 반환                                                       │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. 앱 종료                                                          │
│    - DataSourceModule.onModuleDestroy()                             │
│      → factory.disposeAll()                                         │
│        → 모든 DataSource.dispose()                                  │
│    - DB 연결 종료                                                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. 계층 구조 시각화

```
┌─────────────────────────────────────────────────────────────┐
│                     Controller Layer                        │
│  MetricsController                                          │
│  - HTTP 요청 처리                                           │
│  - DTO 검증                                                 │
└─────────────────────────────────────────────────────────────┘
                              │ 호출
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Service Layer                           │
│  MetricsService                                             │
│  - 캐싱 적용                                                │
│  - 비즈니스 로직                                            │
│  - DataSource에게 위임                                      │
└─────────────────────────────────────────────────────────────┘
                              │ 위임
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   DataSource Layer (추상화)                  │
│  interface MetricsDataSource                                │
│  - 계약 정의                                                │
│  - 구현체와 독립                                            │
└─────────────────────────────────────────────────────────────┘
                              │ 구현
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Implementation Layer (구현체)                │
│  BigQueryMetricsDataSource                                  │
│  - 실제 SQL 쿼리 실행                                       │
│  - BigQuery API 사용                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Database                                │
│  BigQuery / PostgreSQL / MySQL / ...                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. 핵심 개념 정리

| 개념 | 설명 | 코드 위치 |
|------|------|----------|
| **useFactory** | 비동기 Provider 생성 | `datasource.module.ts:10-18` |
| **exports** | 다른 모듈에 노출 | `datasource.module.ts:45` |
| **@Inject(TOKEN)** | 토큰으로 주입 | `metrics.service.ts:50` |
| **OnModuleDestroy** | 종료 시 정리 | `datasource.module.ts:52-55` |
| **getOrSet** | 캐시 래퍼 패턴 | `metrics.service.ts:166-170` |

---

## 6. 이 설계의 장점

1. **관심사 분리**: Controller/Service/DataSource 각각 명확한 역할
2. **테스트 용이**: Service 테스트 시 Mock DataSource 주입 가능
3. **확장 용이**: 새 DataSource 추가 시 Service 코드 변경 불필요
4. **캐싱 일관성**: 모든 메트릭에 동일한 캐싱 패턴 적용
5. **리소스 관리**: 라이프사이클 훅으로 안전한 정리
