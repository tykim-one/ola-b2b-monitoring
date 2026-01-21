# 코드베이스 분석: Interface 정의

> **학습 목표**: 실제 코드에서 Interface가 어떻게 정의되어 있는지 분석

---

## 분석 대상 파일

```
apps/backend/src/datasource/interfaces/
├── metrics-datasource.interface.ts  ← 핵심 인터페이스
└── datasource-config.interface.ts   ← 설정 타입 정의
```

---

## 1. MetricsDataSource Interface 분석

**파일**: `apps/backend/src/datasource/interfaces/metrics-datasource.interface.ts`

### 1.1 구조 개요

```typescript
export interface MetricsDataSource {
  // ==================== Lifecycle Methods (3개) ====================
  initialize(): Promise<void>;
  dispose(): Promise<void>;
  isHealthy(): Promise<boolean>;

  // ==================== Metrics Methods (11개) ====================
  getRealtimeKPI(): Promise<RealtimeKPI>;
  getHourlyTraffic(): Promise<HourlyTraffic[]>;
  // ... 등등

  // ==================== Quality Analysis Methods (3개) ====================
  getTokenEfficiencyTrend(): Promise<TokenEfficiencyTrend[]>;
  // ... 등등

  // ==================== User Analytics Methods (5개) ====================
  getUserRequestCounts(...): Promise<UserRequestCount[]>;
  // ... 등등

  // ==================== Chatbot Quality Methods (6개) ====================
  getEmergingQueryPatterns(...): Promise<EmergingQueryPattern[]>;
  // ... 등등
}
```

### 1.2 메서드 분류

| 카테고리 | 메서드 수 | 용도 |
|----------|----------|------|
| **Lifecycle** | 3 | 연결 관리, 헬스체크 |
| **Metrics** | 11 | 기본 메트릭 (KPI, 트래픽, 사용량) |
| **Quality Analysis** | 3 | 품질 분석 (효율성, 상관관계) |
| **User Analytics** | 5 | 사용자별 분석 |
| **Chatbot Quality** | 6 | 챗봇 품질 (감정 분석, 재질문) |
| **총계** | **28개** | |

### 1.3 Lifecycle 메서드 (중요!)

```typescript
// 1. 초기화 - 모듈 시작 시 호출
initialize(): Promise<void>;

// 2. 정리 - 앱 종료 시 호출
dispose(): Promise<void>;

// 3. 헬스체크 - 모니터링용
isHealthy(): Promise<boolean>;
```

**왜 중요한가?**
- DB 연결 풀 생성/해제
- 리소스 누수 방지
- 서비스 상태 모니터링

### 1.4 반환 타입의 출처

```typescript
import {
  RealtimeKPI,
  HourlyTraffic,
  // ... 26개 타입
} from '@ola/shared-types';
```

**핵심 포인트:**
- 모든 반환 타입은 `@ola/shared-types` 패키지에서 import
- 프론트엔드/백엔드가 **동일한 타입** 공유
- 타입 불일치 방지

### 1.5 Injection Token

```typescript
// 파일 하단
export const METRICS_DATASOURCE = Symbol('METRICS_DATASOURCE');
```

**Symbol을 사용하는 이유:**
1. TypeScript interface는 컴파일 후 사라짐
2. NestJS는 런타임에 의존성 주입 필요
3. Symbol은 런타임에 존재하는 **유니크한 식별자**

**사용 예시:**
```typescript
// ❌ interface로는 주입 불가
constructor(private ds: MetricsDataSource) {}

// ✅ Symbol로 주입
constructor(@Inject(METRICS_DATASOURCE) private ds: MetricsDataSource) {}
```

---

## 2. DataSource Config Interface 분석

**파일**: `apps/backend/src/datasource/interfaces/datasource-config.interface.ts`

### 2.1 지원 데이터소스 타입

```typescript
export type DataSourceType = 'bigquery' | 'postgresql' | 'mysql';
```

3가지 타입만 Union으로 제한 → 타입 안전성 확보

### 2.2 각 데이터소스별 설정 타입

```typescript
// BigQuery 설정
interface BigQueryDataSourceConfig {
  type: 'bigquery';
  config: {
    projectId?: string;
    datasetId: string;
    tableName: string;
    location?: string;
    keyFilename?: string;
  };
}

// PostgreSQL 설정 (미래 확장용)
interface PostgreSQLDataSourceConfig {
  type: 'postgresql';
  config: {
    host: string;
    port: number;
    database: string;
    username?: string;
    password?: string;
    ssl?: boolean;
  };
}

// MySQL 설정 (미래 확장용)
interface MySQLDataSourceConfig {
  type: 'mysql';
  config: {
    host: string;
    port: number;
    database: string;
    username?: string;
    password?: string;
  };
}
```

### 2.3 Discriminated Union 패턴

```typescript
export type DataSourceConfig =
  | BigQueryDataSourceConfig
  | PostgreSQLDataSourceConfig
  | MySQLDataSourceConfig;
```

**Discriminated Union이란?**
- `type` 필드로 어떤 설정인지 구분
- TypeScript가 자동으로 타입 좁히기(narrowing)

```typescript
function handleConfig(config: DataSourceConfig) {
  if (config.type === 'bigquery') {
    // TypeScript가 config.config를 BigQuery 설정으로 인식
    console.log(config.config.datasetId);  // ✅ 타입 안전
  } else if (config.type === 'postgresql') {
    console.log(config.config.host);  // ✅ 타입 안전
  }
}
```

### 2.4 프로젝트별 설정 구조

```typescript
interface DataSourcesConfig {
  default: DataSourceConfig;  // 기본 데이터소스
  projects?: Record<string, DataSourceConfig>;  // 프로젝트별 오버라이드
}
```

**JSON 설정 예시:**
```json
{
  "default": {
    "type": "bigquery",
    "config": { "datasetId": "main", "tableName": "logs" }
  },
  "projects": {
    "project-a": {
      "type": "postgresql",
      "config": { "host": "db.project-a.com", "database": "logs" }
    }
  }
}
```

---

## 3. 설계 패턴 분석

### 3.1 Interface Segregation (인터페이스 분리)

현재 `MetricsDataSource`는 28개 메서드를 가진 큰 인터페이스입니다.

| 장점 | 단점 |
|------|------|
| 한 곳에서 모든 메서드 확인 가능 | 새 데이터소스 구현 시 28개 메서드 전부 구현 필요 |
| 일관된 API | 일부 기능만 필요해도 전체 구현 |

**개선 가능 방향** (참고용):
```typescript
// 작은 인터페이스로 분리
interface MetricsReader {
  getRealtimeKPI(): Promise<RealtimeKPI>;
  getHourlyTraffic(): Promise<HourlyTraffic[]>;
}

interface UserAnalyticsReader {
  getUserRequestCounts(): Promise<UserRequestCount[]>;
}

// 조합
interface MetricsDataSource extends MetricsReader, UserAnalyticsReader { ... }
```

### 3.2 Promise 기반 비동기

모든 메서드가 `Promise<T>` 반환:
```typescript
getRealtimeKPI(): Promise<RealtimeKPI>;  // not RealtimeKPI
```

**이유:**
- DB 쿼리는 I/O 작업 → 비동기
- async/await 패턴과 호환
- 에러 핸들링 일관성 (Promise rejection)

### 3.3 Optional Parameters

```typescript
getDailyTraffic(days?: number): Promise<DailyTraffic[]>;
//              ^ optional
```

기본값은 **구현체에서** 처리:
```typescript
// BigQuery 구현체에서
async getDailyTraffic(days = 30) {
  // days가 없으면 30 사용
}
```

---

## 4. 핵심 개념 정리

| 개념 | 설명 | 코드 예시 |
|------|------|----------|
| **Interface** | 구현체가 지켜야 할 계약 | `interface MetricsDataSource { ... }` |
| **Injection Token** | 런타임 식별자 | `Symbol('METRICS_DATASOURCE')` |
| **Discriminated Union** | type 필드로 타입 구분 | `type: 'bigquery' \| 'postgresql'` |
| **Shared Types** | FE/BE 공유 타입 | `@ola/shared-types` |

---

## 5. 요약: 이 설계의 장점

1. **타입 안전성**: TypeScript로 컴파일 시점에 에러 감지
2. **확장 용이**: 새 DataSource 추가 시 Interface만 구현
3. **FE/BE 일관성**: shared-types로 타입 불일치 방지
4. **프로젝트별 설정**: 멀티테넌트 지원 준비 완료
