# 시스템 아키텍처

개발자를 위한 기술 구조 상세 문서입니다.

---

## 1. 모노레포 구조

pnpm workspaces를 사용하는 모노레포 구조입니다.

```
ola-b2b-monitoring/
├── apps/
│   ├── backend/              # NestJS API 서버
│   │   ├── src/
│   │   │   ├── admin/        # 관리자 모듈 (인증, 사용자, 역할)
│   │   │   ├── batch-analysis/  # 배치 분석 모듈
│   │   │   ├── cache/        # 캐싱 서비스
│   │   │   ├── chatbot/      # AI 챗봇 모듈
│   │   │   ├── common/       # 공통 유틸리티
│   │   │   ├── datasource/   # 데이터소스 추상화
│   │   │   ├── metrics/      # 메트릭 API
│   │   │   ├── ml/anomaly/   # 이상 탐지
│   │   │   ├── notifications/  # 알림 서비스
│   │   │   └── quality/      # 품질 분석
│   │   └── prisma/           # Prisma 스키마 및 마이그레이션
│   │
│   └── frontend-next/        # Next.js 프론트엔드
│       └── src/
│           ├── app/          # App Router 페이지
│           ├── components/   # React 컴포넌트
│           ├── contexts/     # React Context
│           ├── lib/          # 유틸리티
│           └── services/     # API 클라이언트
│
├── packages/
│   └── shared-types/         # 공유 TypeScript 타입
│       └── src/
│           └── index.ts
│
├── package.json              # 루트 패키지 설정
├── pnpm-workspace.yaml       # 워크스페이스 설정
└── turbo.json                # Turborepo 설정 (선택)
```

### 워크스페이스 의존성

```
┌────────────────┐     ┌────────────────┐
│   frontend     │────>│ shared-types   │
└────────────────┘     └────────────────┘
        │                      ▲
        │                      │
        └──────┐    ┌──────────┘
               ▼    │
        ┌────────────────┐
        │    backend     │
        └────────────────┘
```

---

## 2. 백엔드 아키텍처 (NestJS)

### 2.1 Three-Layer DataSource 패턴

데이터소스에 독립적인 확장 가능한 구조입니다.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Controller Layer                         │
│  metrics.controller.ts - HTTP 요청/응답 처리                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Service Layer                            │
│  metrics.service.ts - 비즈니스 로직 + 캐싱                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DataSource Interface                         │
│  MetricsDataSource - 추상화된 인터페이스 (27+ 메서드)             │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌───────────────────┐ ┌───────────────┐ ┌───────────────┐
│ BigQueryDataSource│ │ MySQLDataSource │ │ MongoDataSource │
│   (현재 사용)     │ │   (확장 가능)   │ │   (확장 가능)   │
└───────────────────┘ └───────────────┘ └───────────────┘
```

### 새 데이터소스 추가 방법

1. `MetricsDataSource` 인터페이스 구현
2. Factory에 케이스 추가
3. 설정 파일에 데이터소스 지정

```typescript
// 1. 인터페이스 구현
export class MySQLMetricsDataSource implements MetricsDataSource {
  async getRealtimeKPI(): Promise<RealtimeKPI> { /* ... */ }
  async getTenantUsage(days?: number): Promise<TenantUsage[]> { /* ... */ }
  // ... 27개 메서드 구현
}

// 2. Factory에 추가
case 'mysql':
  return this.createMySQLDataSource(config);
```

### 2.2 모듈 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                          AppModule                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ MetricsModule│  │ AdminModule │  │ChatbotModule│              │
│  │             │  │             │  │             │              │
│  │ • Controller│  │ • Auth      │  │ • Controller│              │
│  │ • Service   │  │ • Users     │  │ • Service   │              │
│  │ • DataSource│  │ • Roles     │  │ • LLM       │              │
│  └─────────────┘  │ • Filters   │  └─────────────┘              │
│                   │ • Analysis  │                                │
│  ┌─────────────┐  └─────────────┘  ┌─────────────┐              │
│  │BatchAnalysis│                    │AnomalyModule│              │
│  │Module       │  ┌─────────────┐  │             │              │
│  │             │  │ CacheModule │  │ • Service   │              │
│  │ • Controller│  │             │  │ • Z-Score   │              │
│  │ • Service   │  │ • NodeCache │  └─────────────┘              │
│  │ • Scheduler │  └─────────────┘                                │
│  └─────────────┘                    ┌─────────────┐              │
│                   ┌─────────────┐  │Notification │              │
│                   │ QualityModule│  │Module       │              │
│                   │             │  │             │              │
│                   │ • Sentiment │  │ • Slack     │              │
│                   └─────────────┘  └─────────────┘              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 인증/인가 구조 (JWT + RBAC)

```
┌─────────────────────────────────────────────────────────────────┐
│                         요청 처리 흐름                            │
└─────────────────────────────────────────────────────────────────┘

HTTP 요청
    │
    ▼
┌─────────────────┐
│ JwtAuthGuard    │ ─── @Public() 데코레이터 있으면 건너뜀
│ (토큰 검증)      │
└────────┬────────┘
         │ userId, roles, permissions 추출
         ▼
┌─────────────────┐
│PermissionsGuard │ ─── @Permissions('resource:action') 검사
│ (권한 검증)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ThrottlerGuard  │ ─── 100 req/min, 1000 req/hour
│ (속도 제한)      │
└────────┬────────┘
         │
         ▼
    Controller
```

### RBAC 데이터 모델

```
┌──────────┐       ┌──────────┐       ┌──────────┐
│   User   │──────>│ UserRole │<──────│   Role   │
└──────────┘       └──────────┘       └──────────┘
                                            │
                                            ▼
                                   ┌────────────────┐
                                   │ RolePermission │
                                   └────────────────┘
                                            │
                                            ▼
                                   ┌────────────────┐
                                   │  Permission    │
                                   └────────────────┘
```

### 권한 형식

`resource:action` 형태로 구성:

| 권한 | 설명 |
|------|------|
| `admin:read` | 관리자 메뉴 읽기 |
| `admin:write` | 관리자 메뉴 수정 |
| `analysis:read` | 분석 결과 조회 |
| `analysis:write` | 분석 실행 |
| `filters:read` | 필터 조회 |
| `filters:write` | 필터 수정 |

### 2.4 캐싱 전략

```typescript
// cache.service.ts
export enum CacheTTL {
  SHORT = 5 * 60 * 1000,   // 5분 - 실시간 KPI
  MEDIUM = 15 * 60 * 1000, // 15분 - 시간별 트래픽
  LONG = 60 * 60 * 1000,   // 1시간 - 정적 데이터
}
```

| 데이터 | TTL | 이유 |
|--------|-----|------|
| 실시간 KPI | 5분 | 빠른 업데이트 필요 |
| 이상 탐지 | 5분 | 실시간성 중요 |
| 시간별 트래픽 | 15분 | 중간 수준 |
| 일별 통계 | 1시간 | 변화 느림 |

---

## 3. 프론트엔드 아키텍처 (Next.js)

### 3.1 App Router 구조

```
src/app/
├── (auth)/                    # 인증 라우트 그룹
│   └── login/
│       └── page.tsx
│
├── dashboard/                 # 대시보드 라우트
│   ├── page.tsx              # 메인 대시보드
│   ├── business/
│   ├── operations/
│   ├── quality/
│   ├── chatbot-quality/
│   ├── ai-performance/
│   ├── user-analytics/
│   │
│   └── admin/                # 관리자 라우트
│       ├── users/
│       ├── roles/
│       ├── filters/
│       ├── analysis/
│       │   └── [id]/         # 동적 라우트
│       └── batch-analysis/
│           ├── [id]/
│           ├── prompts/
│           ├── schedules/
│           └── issue-frequency/
│
├── [projectId]/              # 프로젝트별 라우트 (선택)
│   └── logs/
│
├── layout.tsx                # 루트 레이아웃
└── page.tsx                  # 홈페이지
```

### 라우트 그룹 설명

| 그룹 | 용도 |
|------|------|
| `(auth)` | 로그인 등 인증 관련 페이지 (별도 레이아웃) |
| `dashboard` | 메인 대시보드 영역 |
| `admin` | 관리자 전용 기능 |
| `[projectId]` | 프로젝트별 동적 라우트 |
| `[id]` | 상세 페이지 동적 라우트 |

### 3.2 컴포넌트 계층 구조

```
components/
├── ui/                       # 기본 UI 컴포넌트
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Modal.tsx
│   ├── ConfirmDialog.tsx
│   └── SearchInput.tsx
│
├── kpi/                      # KPI 관련 컴포넌트
│   └── KPICard.tsx
│
├── charts/                   # 차트 컴포넌트 (Recharts)
│   ├── TenantPieChart.tsx
│   ├── CostTrendChart.tsx
│   ├── UsageHeatmap.tsx
│   ├── TokenEfficiencyTrendChart.tsx
│   ├── QueryResponseScatterPlot.tsx
│   └── RepeatedQueriesTable.tsx
│
├── compound/                 # 복합 컴포넌트
│   ├── Dashboard/
│   │   ├── index.tsx
│   │   ├── DashboardHeader.tsx
│   │   ├── DashboardSection.tsx
│   │   └── DashboardGrid.tsx
│   ├── DataTable/
│   │   └── index.tsx
│   └── Chart/
│       └── index.tsx
│
├── chatbot/                  # 챗봇 컴포넌트
│   ├── FloatingChatbot.tsx   # 플로팅 버튼
│   └── ChatWindow.tsx        # 채팅 창
│
└── markdown/                 # 마크다운 렌더링
    └── MarkdownViewer.tsx
```

### 3.3 Context 기반 상태 관리

```
┌─────────────────────────────────────────────────────────────────┐
│                         Providers 구조                           │
└─────────────────────────────────────────────────────────────────┘

<AuthProvider>              ─── 인증 상태, 토큰, 권한
  <ChatbotProvider>         ─── 챗봇 상태, 메시지 이력
    <ThemeProvider>         ─── 다크 모드 (선택)
      {children}
    </ThemeProvider>
  </ChatbotProvider>
</AuthProvider>
```

### AuthContext

```typescript
interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}
```

### ChatbotContext

```typescript
interface ChatbotContextValue {
  isOpen: boolean;
  messages: ChatbotMessage[];
  sessionId: string | null;
  isLoading: boolean;
  toggleChatbot: () => void;
  sendMessage: (message: string) => Promise<void>;
  clearChat: () => void;
}
```

### 3.4 API 클라이언트 구조

```typescript
// lib/api-client.ts
const apiClient = {
  async get<T>(url: string): Promise<T>,
  async post<T>(url: string, data?: any): Promise<T>,
  async put<T>(url: string, data?: any): Promise<T>,
  async delete<T>(url: string): Promise<T>,
}

// 자동 기능:
// - Authorization 헤더 자동 추가
// - 401 응답 시 토큰 갱신 후 재시도
// - 에러 응답 파싱
```

### 서비스 레이어

```
services/
├── analysisService.ts        # AI 분석 세션 API
├── batchAnalysisService.ts   # 배치 분석 API
├── chatbotQualityService.ts  # 챗봇 품질 API
├── userAnalyticsService.ts   # 사용자 분석 API
└── geminiService.ts          # Gemini LLM API
```

---

## 4. 외부 연동

### 4.1 BigQuery

```typescript
// 설정
{
  projectId: process.env.GCP_PROJECT_ID,
  dataset: process.env.BIGQUERY_DATASET,
  table: process.env.BIGQUERY_TABLE,
  location: process.env.GCP_BQ_LOCATION,
}
```

### 주의사항

| 항목 | 설명 |
|------|------|
| success 비교 | `success = TRUE` (BOOL, 문자열 아님) |
| 토큰 캐스팅 | `CAST(total_tokens AS FLOAT64)` |
| DATE 정규화 | BigQuery DATE → `{ value: 'YYYY-MM-DD' }` |
| STRUCT 접근 | `request_metadata.session_id` (JSON_VALUE 아님) |

### 4.2 Gemini LLM

```typescript
// 설정
{
  provider: 'gemini',
  model: 'gemini-2.0-flash',
  apiKey: process.env.GOOGLE_GEMINI_API_KEY,
}

// 용도
- 배치 분석: 대화 품질 평가
- 챗봇: 사용자 질문 응답
- 분석 세션: 데이터 기반 인사이트
```

### 4.3 Slack

```typescript
// Webhook 방식
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

// 알림 유형
- 이상 탐지 알림
- 배치 분석 완료
- 부정 감정 감지
```

---

## 5. 배포 구성

### 환경 변수

```bash
# Backend (.env)
PORT=3000
GCP_PROJECT_ID=your-project
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
BIGQUERY_DATASET=your_dataset
BIGQUERY_TABLE=logs
GCP_BQ_LOCATION=asia-northeast3
CORS_ORIGIN=http://localhost:3001
JWT_SECRET=your-secret-key-min-32-chars
LLM_PROVIDER=gemini
GEMINI_MODEL=gemini-2.0-flash
GOOGLE_GEMINI_API_KEY=your-api-key
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
DATABASE_URL=file:./prisma/admin.db

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 로컬 개발

```bash
# 전체 스택 실행
pnpm dev:all

# 개별 실행
pnpm dev:backend        # 포트 3000
pnpm dev:frontend-next  # 포트 3001
```

### 빌드

```bash
# 전체 빌드
pnpm build

# 개별 빌드
pnpm build:backend
pnpm build:frontend-next
```

---

## 6. 테스트

### 백엔드 테스트

```bash
cd apps/backend

# 전체 테스트
pnpm test

# 워치 모드
pnpm test:watch

# 특정 테스트
pnpm test -- --testPathPattern="bigquery"

# E2E 테스트
pnpm test:e2e

# 커버리지
pnpm test:cov
```

### 테스트 구조

```
apps/backend/
├── src/
│   └── metrics/
│       ├── metrics.service.ts
│       └── metrics.service.spec.ts  # 유닛 테스트
└── test/
    └── app.e2e-spec.ts              # E2E 테스트
```

---

## 관련 문서

- [API 명세서](./04-api-reference.md) - 엔드포인트 상세
- [데이터베이스 스키마](./05-database-schema.md) - DB 구조
- [데이터 흐름도](./06-data-flow.md) - 시스템 동작
