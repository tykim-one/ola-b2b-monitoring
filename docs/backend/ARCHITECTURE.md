# Backend Architecture

OLA B2B Monitoring 백엔드는 NestJS 기반의 엔터프라이즈급 모니터링 시스템으로, 모듈화된 Three-Layer DataSource Pattern과 JWT 인증/RBAC 권한 시스템을 갖춘 확장 가능한 아키텍처를 제공합니다.

## 목차

- [전체 모듈 구조](#전체-모듈-구조)
- [Three-Layer DataSource Pattern](#three-layer-datasource-pattern)
- [인증 & 권한 시스템](#인증--권한-시스템)
- [캐싱 전략](#캐싱-전략)
- [모듈 의존성 다이어그램](#모듈-의존성-다이어그램)
- [LLM 통합](#llm-통합)

---

## 전체 모듈 구조

백엔드는 18개의 기능 모듈로 구성되며, 각 모듈은 단일 책임 원칙(Single Responsibility Principle)을 따릅니다.

### Core Layer

데이터 수집 및 메트릭 제공의 핵심 계층입니다.

```
Core Layer
├── MetricsModule          - 메트릭 API (Controller + Service + DataSource 추상화)
├── DataSourceModule       - DataSource Factory & 구현체 (BigQuery, PostgreSQL, MySQL)
├── CacheModule            - node-cache 기반 캐싱 (SHORT/MEDIUM/LONG TTL)
├── MlModule               - Z-Score 기반 이상 탐지 (AnomalyService)
└── QualityModule          - 품질 분석 서비스 (토큰 효율성, 상관관계)
```

### Analytics Layer

고급 분석 및 AI 기반 인사이트를 제공하는 계층입니다.

```
Analytics Layer
├── BatchAnalysisModule    - 일일 자동 채팅 품질 분석 (스케줄러 + LLM)
├── FAQAnalysisModule      - FAQ 클러스터링 및 LLM 사유 분석
├── SessionAnalysisModule  - 세션 해결률, 효율성, 이탈률 분석 (휴리스틱+LLM)
├── UserProfilingModule    - 유저 행동 프로파일링 (카테고리, 감정 분석)
└── ChatbotModule          - 글로벌 플로팅 AI 챗봇 (페이지 컨텍스트 기반 LLM 응답)
```

### Admin Layer

관리자 기능 및 보안을 담당하는 계층입니다.

```
Admin Layer
├── AdminModule            - 어드민 루트 모듈 (글로벌 가드 적용)
│   ├── AuthModule         - JWT 인증 (JwtAuthGuard, @Public, @Permissions)
│   ├── UsersModule        - 사용자 CRUD
│   ├── RolesModule        - 역할/권한 CRUD
│   ├── FiltersModule      - 저장된 필터 관리
│   └── AnalysisModule     - LLM 분석 세션 (Gemini 연동)
└── DatabaseModule         - PrismaService (SQLite + libSQL adapter)
```

### ETL Layer

외부 데이터 소스 모니터링 계층입니다.

```
ETL Layer
├── WindETLModule          - Wind 파일 처리 ETL 모니터링 (PostgreSQL)
└── MinkabuETLModule       - Minkabu 뉴스 크롤링 ETL 모니터링 (PostgreSQL)
```

### LLM Layer

다양한 LLM 프로바이더 통합을 제공하는 계층입니다.

```
LLM Layer
└── LLMModule              - LLM 프로바이더 추상화
    ├── GeminiProvider     - Google Gemini API
    ├── OpenAIProvider     - OpenAI API
    └── AnthropicProvider  - Claude API
```

### Utility Layer

공통 유틸리티 및 알림 기능을 제공하는 계층입니다.

```
Utility Layer
└── NotificationsModule    - Slack 웹훅 알림 서비스
```

---

## Three-Layer DataSource Pattern

새로운 데이터베이스(MongoDB, ClickHouse 등)를 추가할 때 **기존 비즈니스 로직을 수정하지 않고** 확장할 수 있도록 설계된 패턴입니다.

### 계층 구조

```
┌─────────────────────────────────────────────────────────┐
│                  Controller Layer                       │
│  (metrics.controller.ts)                               │
│  - HTTP 요청 처리                                        │
│  - DTO 검증                                             │
└────────────────────┬────────────────────────────────────┘
                     │ calls
┌────────────────────▼────────────────────────────────────┐
│                  Service Layer                          │
│  (metrics.service.ts)                                  │
│  - 캐싱 래퍼 (CacheService 통합)                        │
│  - TTL 전략 (SHORT/MEDIUM/LONG)                        │
└────────────────────┬────────────────────────────────────┘
                     │ delegates to
┌────────────────────▼────────────────────────────────────┐
│           DataSource Abstraction Layer                  │
│  (MetricsDataSource 인터페이스)                         │
│  - 27개 표준 메서드 정의                                │
│  - 데이터베이스 중립적 계약                              │
└────────────────────┬────────────────────────────────────┘
                     │ implemented by
┌────────────────────▼────────────────────────────────────┐
│              Implementation Layer                       │
│  ├── BigQueryMetricsDataSource   (기본)                │
│  ├── PostgreSQLMetricsDataSource (확장 가능)           │
│  └── MySQLMetricsDataSource      (확장 가능)           │
└─────────────────────────────────────────────────────────┘
```

### MetricsDataSource 인터페이스 (27 methods)

모든 DataSource 구현체는 이 인터페이스를 따라야 합니다.

**1. 기본 메트릭 (6개)**
```typescript
getRealtimeKPI(): Promise<RealtimeKPI>
getHourlyTraffic(): Promise<HourlyTraffic[]>
getDailyTraffic(): Promise<DailyTraffic[]>
getTenantUsage(days: number): Promise<TenantUsage[]>
getUsageHeatmap(): Promise<HeatmapData[]>
getCostTrend(): Promise<CostTrend[]>
```

**2. 에러 & 분석 (2개)**
```typescript
getErrorAnalysis(): Promise<ErrorAnalysis[]>
getTokenEfficiency(days: number): Promise<TokenEfficiency[]>
```

**3. AI/ML (3개)**
```typescript
getAnomalyStats(days: number): Promise<AnomalyStats[]>
getQueryPatterns(): Promise<QueryPattern[]>
getTokenEfficiencyTrend(): Promise<TokenEfficiencyTrend[]>
```

**4. 품질 분석 (10개)**
```typescript
getQueryResponseCorrelation(): Promise<QueryResponseCorrelation[]>
getRepeatedQueryPatterns(): Promise<RepeatedQueryPattern[]>
getEmergingQueryPatterns(recent: number, historical: number): Promise<EmergingPattern[]>
getSentimentAnalysis(days: number): Promise<SentimentData[]>
getRephrasedQueryPatterns(days: number): Promise<RephrasedPattern[]>
getSessionAnalytics(days: number): Promise<SessionData[]>
getTenantQualitySummary(days: number): Promise<TenantQualitySummary[]>
getResponseQualityMetrics(days: number): Promise<ResponseQualityMetrics[]>
getUserRequestCounts(days: number, limit: number): Promise<UserRequestCount[]>
getUserTokenUsage(days: number, limit: number): Promise<UserTokenUsage[]>
```

**5. 유저 분석 (3개)**
```typescript
getUserQuestionPatterns(userId: string | undefined, days: number, limit: number): Promise<UserQuestionPattern[]>
getUserList(days: number, limit: number): Promise<UserListItem[]>
getUserActivityDetail(userId: string, days: number, limit: number, offset: number): Promise<UserActivityDetail[]>
```

**6. Lifecycle 메서드 (3개)**
```typescript
onModuleInit(): Promise<void>
onModuleDestroy(): Promise<void>
isHealthy(): Promise<boolean>
```

### DataSource Factory

프로젝트별로 다른 데이터베이스를 사용할 수 있도록 설정 파일 기반 Factory를 제공합니다.

**설정 예시** (`config/datasources.config.json`)
```json
{
  "default": {
    "type": "bigquery",
    "config": {
      "projectId": "my-gcp-project",
      "datasetId": "logs",
      "tableId": "llm_logs"
    }
  },
  "projects": {
    "project-wind": {
      "type": "postgresql",
      "config": {
        "host": "localhost",
        "port": 5432,
        "database": "wind_db",
        "table": "ops.cn_wind_etl_runs"
      }
    },
    "project-minkabu": {
      "type": "mysql",
      "config": {
        "host": "localhost",
        "database": "minkabu_db",
        "table": "jp_minkabu_etl_runs"
      }
    }
  }
}
```

**Factory 로직** (의사 코드)
```typescript
createDataSource(projectId: string): MetricsDataSource {
  const config = getProjectConfig(projectId) || getDefaultConfig();

  switch (config.type) {
    case 'bigquery':
      return new BigQueryMetricsDataSource(config);
    case 'postgresql':
      return new PostgreSQLMetricsDataSource(config);
    case 'mysql':
      return new MySQLMetricsDataSource(config);
    default:
      throw new Error(`Unsupported datasource type: ${config.type}`);
  }
}
```

### 새 DataSource 추가 가이드

**1단계: 구현체 작성**
```typescript
// src/datasource/implementations/mongodb-metrics.datasource.ts
import { MetricsDataSource } from '../interfaces';

export class MongoDBMetricsDataSource implements MetricsDataSource {
  async getRealtimeKPI(): Promise<RealtimeKPI> {
    // MongoDB 쿼리 구현
  }

  // ... 27개 메서드 모두 구현
}
```

**2단계: Factory에 케이스 추가**
```typescript
// src/datasource/factory/datasource.factory.ts
case 'mongodb':
  return this.createMongoDBDataSource(config);
```

**3단계: 설정 파일 업데이트**
```json
{
  "projects": {
    "project-new": {
      "type": "mongodb",
      "config": {
        "connectionString": "mongodb://localhost:27017",
        "database": "logs",
        "collection": "llm_logs"
      }
    }
  }
}
```

---

## 인증 & 권한 시스템

JWT 기반 인증과 RBAC(Role-Based Access Control) 권한 시스템을 제공합니다.

### Global Guards Pipeline

**AdminModule**에서 전역 가드를 순서대로 적용합니다.

```
HTTP Request
     │
     ▼
┌─────────────────┐
│ JwtAuthGuard    │  ← 1순위: JWT 토큰 검증
└────────┬────────┘
         │ @Public() 데코레이터가 있으면 스킵
         ▼
┌──────────────────┐
│ PermissionsGuard │  ← 2순위: @Permissions() 데코레이터 검증
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ ThrottlerGuard   │  ← 3순위: Rate Limiting (10 req/min)
└────────┬─────────┘
         │
         ▼
   Controller Handler
```

### Token Lifecycle

```
┌──────────────┐
│ POST /login  │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ AuthService.login()                    │
│ - bcrypt 비밀번호 검증                  │
│ - 실패 시도 카운트 (계정 잠금 방지)      │
│ - Access Token 생성 (15분 TTL)         │
│ - Refresh Token 생성 (7일 TTL)         │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ Response                               │
│ - Access Token → Authorization 헤더    │
│ - Refresh Token → httpOnly 쿠키        │
└─────────────────────────────────────────┘

... (15분 후 Access Token 만료) ...

┌──────────────────┐
│ POST /refresh    │ ← httpOnly 쿠키의 Refresh Token 자동 전송
└──────┬───────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ AuthService.refreshTokens()            │
│ - Refresh Token 검증 (DB에서 조회)      │
│ - 새 Access Token 생성 (15분)          │
│ - 새 Refresh Token 발급 (Rotation)     │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ Response                               │
│ - 새 Access Token → Authorization 헤더 │
│ - 새 Refresh Token → httpOnly 쿠키     │
└─────────────────────────────────────────┘
```

### 권한 시스템 (`resource:action` 형식)

**권한 정의 예시**
```
admin:read        - 사용자/역할 조회
admin:write       - 사용자/역할 생성/수정/삭제
analysis:read     - 분석 세션 조회
analysis:write    - 분석 세션 생성/메시지 전송
filters:read      - 저장된 필터 조회
filters:write     - 필터 생성/수정/삭제
```

**사용 예시**
```typescript
@Controller('api/admin/users')
export class UsersController {
  @Get()
  @Permissions('admin:read')  // ← 이 권한 없으면 403 Forbidden
  async findAll() { ... }

  @Post()
  @Permissions('admin:write')
  async create(@Body() dto: CreateUserDto) { ... }
}
```

**데코레이터 목록**
- `@Public()`: JWT 인증 우회 (로그인, 회원가입 등)
- `@Permissions(...permissions: string[])`: 필수 권한 지정
- `@CurrentUser()`: 현재 인증된 사용자 정보 주입

### 계정 보안

- **실패 시도 제한**: 5회 실패 시 계정 15분 잠금
- **토큰 갱신 (Refresh Token Rotation)**: 토큰 재발급 시 기존 Refresh Token 폐기
- **httpOnly 쿠키**: XSS 공격 방지
- **SameSite 정책**: CSRF 공격 방지 (Production: `strict`, Dev: `lax`)

---

## 캐싱 전략

`node-cache` 기반 인메모리 캐싱으로 BigQuery 비용 절감 및 응답 속도 개선을 제공합니다.

### TTL 전략

```typescript
enum CacheTTL {
  SHORT  = 300,   // 5분  - 실시간성 중요
  MEDIUM = 900,   // 15분 - 준실시간
  LONG   = 3600,  // 1시간 - 정적 데이터
}
```

### 캐싱 적용 대상

| API 엔드포인트 | TTL | 캐시 키 | 사유 |
|---------------|-----|---------|------|
| `GET /metrics/realtime` | SHORT (5분) | `realtime_kpi` | 최신 KPI 필요 |
| `GET /metrics/hourly` | MEDIUM (15분) | `hourly_traffic` | 시간별 트렌드 |
| `GET /metrics/daily` | MEDIUM (15분) | `daily_traffic` | 일별 트렌드 |
| `GET /analytics/tenant-usage?days=7` | MEDIUM (15분) | `tenant_usage_7` | 파라미터별 캐시 |
| `GET /analytics/heatmap` | MEDIUM (15분) | `heatmap` | 히트맵 데이터 |
| `GET /analytics/cost-trend` | MEDIUM (15분) | `cost_trend` | 비용 트렌드 |
| `GET /analytics/errors` | SHORT (5분) | `error_analysis` | 실시간 에러 모니터링 |
| `GET /ai/anomaly-stats` | SHORT (5분) | `anomaly_stats_30` | 이상 탐지 |
| `GET /quality/*` | MEDIUM (15분) | `quality_{method}_{params}` | 품질 지표 |

### 캐싱 플로우

```
┌──────────────────┐
│ HTTP Request     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Controller       │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ MetricsService                      │
│                                     │
│  1. cacheKey = 'realtime_kpi'       │
│  2. cached = cacheService.get(key)  │
│  3. if cached → return cached       │
│  4. else:                           │
│     - result = datasource.getXXX()  │
│     - cacheService.set(key, result) │
│     - return result                 │
└────────┬─────────────────────────────┘
         │
         ▼
   JSON Response
```

### 캐시 관리 API

```
GET  /projects/:projectId/api/cache/stats  - 캐시 통계 (hits, misses, keys)
DELETE /projects/:projectId/api/cache      - 전체 캐시 초기화
```

---

## 모듈 의존성 다이어그램

```
                          ┌───────────────┐
                          │   AppModule   │
                          └───────┬───────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐         ┌───────────────┐        ┌──────────────┐
│ ConfigModule  │         │ ScheduleModule│        │ AdminModule  │
│   (Global)    │         │               │        └──────┬───────┘
└───────────────┘         └───────────────┘               │
                                                           │
                                  ┌────────────────────────┼────────────┐
                                  ▼                        ▼            ▼
                          ┌──────────────┐        ┌────────────┐  ┌─────────┐
                          │ AuthModule   │        │UsersModule │  │RolesModule
                          │ - Guards     │        └────────────┘  └─────────┘
                          │ - JWT        │
                          └──────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                         Core Data Layer                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐      ┌────────────────────┐      ┌───────────────┐   │
│  │ MetricsModule│ ───▶ │ DataSourceModule   │ ◀─── │ CacheModule   │   │
│  │              │      │ - Factory          │      │               │   │
│  │              │      │ - BigQuery         │      │               │   │
│  └──────────────┘      │ - PostgreSQL       │      └───────────────┘   │
│         │              │ - MySQL            │                           │
│         │              └────────────────────┘                           │
│         │                                                               │
│         ▼                                                               │
│  ┌──────────────┐      ┌────────────────────┐                          │
│  │   MlModule   │      │  QualityModule     │                          │
│  │ - Anomaly    │      │ - Sentiment        │                          │
│  └──────────────┘      └────────────────────┘                          │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                         Analytics Layer                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────┐   ┌────────────────────┐   ┌─────────────────┐ │
│  │BatchAnalysisModule │   │ FAQAnalysisModule  │   │SessionAnalysis  │ │
│  │ - Scheduler        │   │ - Clustering       │   │Module           │ │
│  │ - LLM Quality      │   │ - LLM Reasoning    │   │ - Heuristic     │ │
│  └────────────────────┘   └────────────────────┘   └─────────────────┘ │
│                                                                          │
│  ┌────────────────────┐   ┌────────────────────┐                        │
│  │UserProfilingModule │   │   ChatbotModule    │                        │
│  │ - Category         │   │ - Context-aware    │                        │
│  │ - Sentiment        │   │ - Floating UI      │                        │
│  └────────────────────┘   └────────────────────┘                        │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                         ETL Layer                                        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────┐   ┌────────────────────┐                        │
│  │  WindETLModule     │   │ MinkabuETLModule   │                        │
│  │  - PostgreSQL      │   │ - PostgreSQL       │                        │
│  │  - File Processing │   │ - News Crawling    │                        │
│  └────────────────────┘   └────────────────────┘                        │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                         LLM & Utilities                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────┐   ┌────────────────────┐                        │
│  │     LLMModule      │   │ NotificationsModule│                        │
│  │ - Gemini           │   │ - Slack Webhooks   │                        │
│  │ - OpenAI           │   │                    │                        │
│  │ - Anthropic        │   │                    │                        │
│  └────────────────────┘   └────────────────────┘                        │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## LLM 통합

다양한 LLM 프로바이더를 추상화하여 통합한 계층입니다.

### 지원 프로바이더

```typescript
export enum LLMProvider {
  GEMINI = 'gemini',
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
}
```

### LLMService 인터페이스

```typescript
export interface LLMService {
  chat(messages: ChatMessage[], options?: LLMOptions): Promise<LLMResponse>;
  streamChat(messages: ChatMessage[], options?: LLMOptions): AsyncIterable<string>;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}
```

### 사용 예시

```typescript
// BatchAnalysisService에서 Gemini 사용
const prompt = `다음 대화의 품질을 평가하세요:
사용자: ${userInput}
AI: ${llmResponse}`;

const response = await this.llmService.chat([
  { role: 'user', content: prompt }
], {
  model: 'gemini-2.0-flash',
  temperature: 0.7,
});

console.log(response.content); // JSON 형식 품질 평가 결과
console.log(response.inputTokens, response.outputTokens);
```

### 환경 변수 설정

```env
LLM_PROVIDER=gemini
GEMINI_MODEL=gemini-2.0-flash
GOOGLE_GEMINI_API_KEY=your-api-key
```

---

## 마무리

이 아키텍처는 다음 원칙을 따릅니다:

1. **확장 가능성**: 새 데이터베이스 추가 시 기존 코드 수정 최소화
2. **단일 책임**: 각 모듈은 하나의 책임만 가짐
3. **의존성 역전**: Controller → Service → DataSource 추상화
4. **재사용성**: 공통 기능(캐싱, 인증, LLM)을 모듈화
5. **보안**: JWT + RBAC + httpOnly 쿠키 + Rate Limiting

더 자세한 내용은 다음 문서를 참고하세요:
- [API_REFERENCE.md](./API_REFERENCE.md) - 전체 API 엔드포인트 목록
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Prisma 및 BigQuery 스키마
