# NestJS Dependency Injection 핵심 개념

> **학습 목표**: NestJS의 DI 시스템이 어떻게 동작하는지 이해

---

## Dependency Injection이란?

**의존성 주입**: 객체가 필요한 의존성을 직접 생성하지 않고, 외부에서 주입받는 패턴

### 왜 필요한가?

```typescript
// ❌ DI 없이 (강한 결합)
class UserService {
  private database = new MySQLDatabase();  // 직접 생성

  getUser(id: string) {
    return this.database.query(`SELECT * FROM users WHERE id = ${id}`);
  }
}
// 문제: PostgreSQL로 바꾸려면 UserService 코드 수정 필요!

// ✅ DI 사용 (느슨한 결합)
class UserService {
  constructor(private database: Database) {}  // 외부에서 주입

  getUser(id: string) {
    return this.database.query(`SELECT * FROM users WHERE id = ${id}`);
  }
}
// 장점: Database 구현체만 바꾸면 됨, UserService는 그대로
```

---

## NestJS DI 핵심 구성요소

### 1. Module (모듈)

기능 단위의 캡슐화. 관련된 컴포넌트들을 그룹화합니다.

```typescript
@Module({
  imports: [],      // 다른 모듈 가져오기
  controllers: [],  // HTTP 요청 핸들러
  providers: [],    // 서비스, 팩토리 등 (주입 가능한 것들)
  exports: [],      // 다른 모듈에 노출할 것들
})
export class UserModule {}
```

### 2. Provider (프로바이더)

DI 컨테이너에 등록되어 주입될 수 있는 것들입니다.

```typescript
// 가장 기본적인 형태: 클래스 자체가 Provider
@Injectable()
export class UserService {
  // ...
}

@Module({
  providers: [UserService],  // UserService를 Provider로 등록
})
```

### 3. Injectable (주입 가능)

클래스에 `@Injectable()` 데코레이터를 붙이면 DI 컨테이너가 관리합니다.

```typescript
@Injectable()
export class CacheService {
  get(key: string) { ... }
  set(key: string, value: any) { ... }
}

@Injectable()
export class UserService {
  // CacheService가 자동으로 주입됨
  constructor(private cacheService: CacheService) {}
}
```

### 4. Injection Token (주입 토큰)

인터페이스는 런타임에 존재하지 않으므로, Symbol을 사용해 식별합니다.

```typescript
// ❌ 이렇게는 안 됨 (인터페이스는 컴파일 후 사라짐)
constructor(private datasource: MetricsDataSource) {}

// ✅ Symbol 토큰 사용
export const METRICS_DATASOURCE = Symbol('METRICS_DATASOURCE');

constructor(@Inject(METRICS_DATASOURCE) private datasource: MetricsDataSource) {}
```

---

## Provider 등록 방식 4가지

### 방식 1: 클래스 직접 등록 (가장 단순)

```typescript
@Module({
  providers: [UserService],
  // 이것은 아래와 같음:
  // providers: [{ provide: UserService, useClass: UserService }]
})
```

### 방식 2: useClass (다른 클래스로 대체)

```typescript
@Module({
  providers: [
    {
      provide: UserService,
      useClass: MockUserService,  // 테스트 환경에서 Mock 사용
    }
  ],
})
```

### 방식 3: useValue (값 직접 제공)

```typescript
@Module({
  providers: [
    {
      provide: 'CONFIG',
      useValue: { apiKey: 'abc123', timeout: 3000 },
    }
  ],
})

// 사용
constructor(@Inject('CONFIG') private config: any) {}
```

### 방식 4: useFactory (동적 생성) ⭐ 중요

팩토리 함수를 사용해 Provider를 동적으로 생성합니다.

```typescript
@Module({
  providers: [
    DataSourceFactory,  // 먼저 Factory를 등록
    {
      provide: METRICS_DATASOURCE,
      useFactory: async (factory: DataSourceFactory) => {
        // Factory를 사용해 인스턴스 생성
        return factory.getDefaultDataSource();
      },
      inject: [DataSourceFactory],  // Factory를 주입받음
    }
  ],
})
```

**useFactory를 사용하는 이유:**
1. **비동기 초기화**: DB 연결처럼 async 작업 필요
2. **동적 결정**: 환경변수나 설정에 따라 다른 인스턴스 생성
3. **복잡한 생성 로직**: 단순 new로 안 되는 경우

---

## 의존성 주입 흐름

```
┌─────────────────────────────────────────────────────────────┐
│                        NestJS 시작                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  1. 모든 Module 스캔                                        │
│     - @Module() 데코레이터 분석                             │
│     - providers, imports, exports 수집                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Provider 등록                                           │
│     - 각 provider의 토큰(클래스/Symbol)과 생성 방법 저장    │
│     - useClass, useValue, useFactory 등 처리               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  3. 의존성 그래프 구성                                      │
│     - 각 클래스의 constructor 파라미터 분석                 │
│     - 누가 누구에게 의존하는지 파악                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  4. 인스턴스 생성 (의존성 순서대로)                         │
│     - 의존성 없는 것부터 생성                               │
│     - 생성된 인스턴스를 필요한 곳에 주입                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  5. 애플리케이션 준비 완료                                  │
│     - 모든 의존성이 주입된 상태로 서비스 시작               │
└─────────────────────────────────────────────────────────────┘
```

---

## 실제 예시: DataSource 주입 흐름

```typescript
// 1. Interface & Token 정의
export const METRICS_DATASOURCE = Symbol('METRICS_DATASOURCE');
export interface MetricsDataSource {
  getRealtimeKPI(): Promise<RealtimeKPI>;
}

// 2. 구현체
@Injectable()
export class BigQueryMetricsDataSource implements MetricsDataSource {
  async getRealtimeKPI() { /* BigQuery 쿼리 */ }
}

// 3. Factory
@Injectable()
export class DataSourceFactory {
  async getDefaultDataSource(): Promise<MetricsDataSource> {
    const instance = new BigQueryMetricsDataSource(config);
    await instance.initialize();
    return instance;
  }
}

// 4. Module에서 연결
@Module({
  providers: [
    DataSourceFactory,
    {
      provide: METRICS_DATASOURCE,
      useFactory: (factory) => factory.getDefaultDataSource(),
      inject: [DataSourceFactory],
    }
  ],
  exports: [METRICS_DATASOURCE],
})
export class DataSourceModule {}

// 5. Service에서 사용
@Injectable()
export class MetricsService {
  constructor(
    @Inject(METRICS_DATASOURCE)
    private metricsDataSource: MetricsDataSource
  ) {}

  async getKPI() {
    return this.metricsDataSource.getRealtimeKPI();
  }
}
```

---

## 핵심 개념 정리

| 개념 | 설명 | 예시 |
|------|------|------|
| **Module** | 기능 단위 캡슐화 | `DataSourceModule`, `UserModule` |
| **Provider** | 주입될 수 있는 것 | 서비스, 팩토리, 값 |
| **@Injectable()** | DI 컨테이너가 관리 | `@Injectable() class UserService` |
| **Injection Token** | Provider 식별자 | 클래스명 또는 Symbol |
| **@Inject()** | 토큰으로 주입 | `@Inject(METRICS_DATASOURCE)` |
| **useFactory** | 동적 Provider 생성 | 비동기 초기화, 조건부 생성 |

---

## 왜 Symbol을 Token으로 사용하는가?

```typescript
// TypeScript의 interface는 컴파일 후 사라짐
interface MetricsDataSource { ... }  // JavaScript에서는 존재하지 않음!

// Symbol은 런타임에 유니크한 식별자로 존재
const METRICS_DATASOURCE = Symbol('METRICS_DATASOURCE');  // 항상 존재

// NestJS는 런타임에 의존성을 주입해야 하므로
// 컴파일 후에도 존재하는 Symbol을 식별자로 사용
```

---

## Scope (스코프)

Provider의 생명주기를 정의합니다.

| Scope | 설명 | 사용 시점 |
|-------|------|----------|
| **DEFAULT** (Singleton) | 앱 전체에서 하나의 인스턴스 | 대부분의 경우 |
| **REQUEST** | HTTP 요청마다 새 인스턴스 | 요청별 상태 필요 |
| **TRANSIENT** | 주입할 때마다 새 인스턴스 | 상태 공유 방지 |

```typescript
@Injectable({ scope: Scope.REQUEST })
export class RequestScopedService { ... }
```

---

## 다음 단계

이제 실제 코드베이스에서 이 개념들이 어떻게 적용되어 있는지 확인합니다:
1. `metrics-datasource.interface.ts` - Interface & Token 정의
2. `datasource.factory.ts` - Factory Pattern
3. `datasource.module.ts` - Module 연결
4. `metrics.service.ts` - Service에서 사용
