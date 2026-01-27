# Frontend Architecture

## 개요

OLA B2B Monitoring의 프론트엔드는 Next.js 16 App Router 기반의 현대적인 React 애플리케이션입니다. BigQuery 기반 모니터링 대시보드를 제공하며, 실시간 메트릭 시각화와 AI 기반 분석 기능을 포함합니다.

**경로**: `apps/frontend-next/`

## 기술 스택

### 핵심 프레임워크
- **Next.js 16.1.1**: App Router 기반 SSR/CSR 하이브리드 렌더링
- **React 19.2.3**: 최신 React 기능 (Server Components, Concurrent Rendering)
- **TypeScript 5**: 타입 안전성 보장

### UI/스타일링
- **Tailwind CSS 3**: 유틸리티 기반 스타일링
- **Lucide React**: 아이콘 라이브러리
- **다크 테마**: 기본 색상 팔레트
  - 배경: `bg-slate-950`, `bg-slate-800`
  - 차트 색상: `#3b82f6` (blue), `#8b5cf6` (purple), `#10b981` (emerald)

### 데이터 시각화
- **Recharts 3.6.0**: 차트 라이브러리
  - Line Chart, Bar Chart, Pie Chart, Scatter Plot
  - 히트맵, 게이지 차트

### 상태 관리 및 데이터 페칭
- **React Context API**: 전역 상태 관리 (AuthContext, ChatbotContext)
- **@tanstack/react-query 5**: 서버 상태 관리 및 캐싱
- **Zustand 5**: 클라이언트 UI 상태 관리
- **Axios 1.13**: HTTP 클라이언트, 인터셉터 기반 토큰 갱신

### 폼 및 유효성 검사
- **React Hook Form 7.71**: 폼 상태 관리
- **Zod 4.3**: 스키마 기반 유효성 검사
- **@hookform/resolvers 5**: React Hook Form + Zod 통합

### AI 통합
- **@google/genai 1.35**: Google Gemini API 클라이언트
- **react-markdown 10**: Markdown 렌더링 (LLM 응답용)
- **remark-gfm 4**: GitHub Flavored Markdown
- **rehype-highlight 7**: 코드 하이라이팅

### 공유 타입
- **@ola/shared-types**: Workspace 공유 패키지
  - 프론트엔드/백엔드 타입 동기화
  - DTO, 엔티티, 요청/응답 인터페이스

## 디렉토리 구조

```
apps/frontend-next/src/
├── app/                    # Next.js App Router 페이지
│   ├── (auth)/            # 인증 라우트 그룹
│   │   └── login/         # 로그인 페이지
│   ├── dashboard/         # 대시보드 페이지들
│   │   ├── admin/         # 관리자 기능
│   │   ├── business/      # 비즈니스 메트릭
│   │   ├── operations/    # 운영 메트릭
│   │   ├── quality/       # 품질 분석
│   │   ├── chatbot-quality/  # 챗봇 품질 분석
│   │   ├── user-analytics/   # 유저 분석
│   │   ├── ai-performance/   # AI 성능 분석
│   │   └── etl/          # ETL 모니터링 (Wind, Minkabu)
│   ├── layout.tsx         # 루트 레이아웃
│   ├── providers.tsx      # Context Providers 래퍼
│   └── globals.css        # 전역 스타일
│
├── components/            # UI 컴포넌트
│   ├── ui/               # 기본 UI 컴포넌트
│   │   ├── Modal.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── DateRangeFilter.tsx
│   │   └── SearchInput.tsx
│   ├── charts/           # Recharts 기반 차트
│   │   ├── TenantPieChart.tsx
│   │   ├── CostTrendChart.tsx
│   │   ├── UsageHeatmap.tsx
│   │   ├── TokenScatterPlot.tsx
│   │   └── RealtimeTrafficChart.tsx
│   ├── compound/         # 복합 컴포넌트 (재사용 가능한 패턴)
│   │   ├── Dashboard/    # 대시보드 레이아웃 컴포넌트
│   │   ├── DataTable/    # 데이터 테이블 컴포넌트
│   │   └── Chart/        # 차트 래퍼 컴포넌트
│   ├── kpi/              # KPI 카드
│   │   └── KPICard.tsx
│   ├── analysis/         # 분석 관련 컴포넌트
│   │   ├── ChatInterface.tsx
│   │   ├── SessionList.tsx
│   │   └── MetricsContext.tsx
│   ├── chatbot/          # 글로벌 플로팅 챗봇
│   │   ├── FloatingChatbot.tsx
│   │   ├── ChatWindow.tsx
│   │   ├── ChatMessage.tsx
│   │   └── ChatInput.tsx
│   ├── markdown/         # Markdown 렌더링
│   │   └── MarkdownViewer.tsx
│   ├── faq-analysis/     # FAQ 클러스터링
│   ├── session-analysis/ # 세션 분석
│   ├── user-profiling/   # 유저 프로파일링
│   ├── Dashboard.tsx     # 메인 대시보드
│   ├── Sidebar.tsx       # 사이드바 네비게이션
│   └── LayoutContent.tsx # 레이아웃 래퍼
│
├── contexts/             # React Context
│   ├── AuthContext.tsx   # JWT 인증 상태 관리
│   └── ChatbotContext.tsx # 플로팅 챗봇 상태
│
├── lib/                  # 유틸리티 및 설정
│   ├── api-client.ts     # Axios 인스턴스, 인터셉터
│   └── utils.ts          # 공통 유틸리티 함수
│
├── services/             # 도메인별 서비스 클라이언트
│   ├── analysisService.ts
│   ├── batchAnalysisService.ts
│   ├── chatbotQualityService.ts
│   ├── faqAnalysisService.ts
│   ├── sessionAnalysisService.ts
│   ├── userAnalyticsService.ts
│   ├── userProfilingService.ts
│   ├── geminiService.ts
│   ├── windEtlService.ts
│   └── minkabuEtlService.ts
│
├── hooks/                # 커스텀 React Hooks
│   └── queries/          # React Query 훅
│       └── use-dashboard.ts
│
├── stores/               # Zustand 스토어
│   └── ui-store.ts       # UI 상태 (사이드바, 모달 등)
│
├── types.ts              # 로컬 타입 정의
└── middleware.ts         # Next.js 미들웨어
```

## 컴포넌트 구조

### 1. UI 컴포넌트 (`components/ui/`)

재사용 가능한 기본 UI 빌딩 블록:

- **Modal**: 범용 모달 다이얼로그
- **ConfirmDialog**: 확인/취소 다이얼로그
- **DateRangeFilter**: 날짜 범위 선택기 (프리셋: 7일, 30일, 90일)
- **SearchInput**: 검색 입력 필드

### 2. 차트 컴포넌트 (`components/charts/`)

Recharts 기반 시각화:

- **TenantPieChart**: 테넌트별 토큰 사용량 파이 차트
- **CostTrendChart**: 일별 비용 트렌드 라인 차트
- **UsageHeatmap**: 시간대별 사용량 히트맵
- **TokenScatterPlot**: 토큰 효율성 산점도
- **RealtimeTrafficChart**: 실시간 트래픽 차트
- **ErrorGauge**: 에러율 게이지 차트

모든 차트는 다크 테마 색상 팔레트를 따릅니다:
```typescript
const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
```

### 3. 복합 컴포넌트 (`components/compound/`)

Compound Component 패턴을 사용한 재사용 가능한 복합 컴포넌트:

#### Dashboard Component
대시보드 페이지의 공통 레이아웃:

```tsx
<Dashboard isLoading={isLoading} error={error}>
  <Dashboard.Header title="페이지 제목" rightContent={<DateRangeFilter />} />
  <Dashboard.Skeleton />
  <Dashboard.Error />
  <Dashboard.Content>
    <Dashboard.KPISection columns={4}>
      <KPICard ... />
    </Dashboard.KPISection>
    <Dashboard.ChartsSection columns={2}>
      <Chart ... />
    </Dashboard.ChartsSection>
    <Dashboard.TableSection title="테이블 제목">
      <DataTable ... />
    </Dashboard.TableSection>
  </Dashboard.Content>
</Dashboard>
```

#### DataTable Component
정렬, 검색, 페이지네이션 기능을 갖춘 데이터 테이블:

```tsx
<DataTable data={data} columns={columns} searchFields={['name']}>
  <DataTable.Toolbar>
    <DataTable.Search placeholder="검색..." />
  </DataTable.Toolbar>
  <DataTable.Content>
    <DataTable.Header />
    <DataTable.Body emptyMessage="데이터 없음" />
  </DataTable.Content>
  <DataTable.Footer />
</DataTable>
```

### 4. KPI 컴포넌트 (`components/kpi/`)

**KPICard**: 핵심 지표 카드

```tsx
<KPICard
  title="총 토큰 사용량"
  value={totalTokens}
  format="tokens" // 'number' | 'currency' | 'percentage' | 'tokens'
  icon={<BarChart3 />}
  status="neutral" // 'positive' | 'negative' | 'neutral'
  trend={5.2} // 선택적 증감률
/>
```

### 5. 분석 컴포넌트 (`components/analysis/`)

- **ChatInterface**: LLM 분석 대화 인터페이스
- **SessionList**: 분석 세션 목록
- **MetricsContext**: 메트릭 데이터를 차트에 주입하는 Context

### 6. 챗봇 컴포넌트 (`components/chatbot/`)

**FloatingChatbot**: 전역 플로팅 AI 챗봇

- 우하단 고정 위치
- Ctrl+K 단축키로 토글
- 페이지 컨텍스트 기반 LLM 응답
- 세션 기반 대화 히스토리 유지

```tsx
// ChatbotContext로 전역 제어
const { toggleChatbot, sendMessage, messages } = useChatbot();
```

## 상태 관리

### 1. AuthContext (`contexts/AuthContext.tsx`)

JWT 기반 인증 상태 관리:

```typescript
interface AuthContextType {
  user: UserInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}
```

**주요 기능:**
- Access Token: 메모리 저장 (15분 TTL)
- Refresh Token: httpOnly 쿠키 (7일 TTL)
- 자동 토큰 갱신 (axios 인터셉터)
- 권한 기반 접근 제어 (RBAC)

**사용 예시:**
```tsx
const { user, isAuthenticated, hasPermission } = useAuth();

if (hasPermission('admin:users:write')) {
  // 사용자 관리 UI 표시
}
```

### 2. ChatbotContext (`contexts/ChatbotContext.tsx`)

플로팅 챗봇 상태 관리:

```typescript
interface ChatbotContextType {
  isOpen: boolean;
  messages: ChatbotMessage[];
  sessionId: string | null;
  isLoading: boolean;
  error: string | null;
  currentPage: string | null;
  toggleChatbot: () => void;
  openChatbot: () => void;
  closeChatbot: () => void;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
}
```

**페이지 컨텍스트 전달:**
```tsx
// 챗봇은 현재 페이지 경로를 LLM에 자동 전달
const pathname = usePathname(); // '/dashboard/business'
await sendMessage('이 페이지는 무엇인가요?');
// → LLM이 비즈니스 메트릭 페이지에 대한 설명 제공
```

### 3. Zustand UI Store (`stores/ui-store.ts`)

클라이언트 UI 상태 (사이드바 열림/닫힘, 모달 상태 등):

```typescript
interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}
```

### 4. React Query

서버 상태 관리 및 캐싱:

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['metrics', projectId, dateRange],
  queryFn: () => fetchMetrics(projectId, dateRange),
  staleTime: 5 * 60 * 1000, // 5분
});
```

## API 클라이언트 (`lib/api-client.ts`)

### Axios 인스턴스 설정

```typescript
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  withCredentials: true, // httpOnly 쿠키 전송
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### 토큰 자동 갱신 로직

**Request Interceptor**: Access Token 자동 첨부
```typescript
apiClient.interceptors.request.use((config) => {
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});
```

**Response Interceptor**: 401 에러 시 자동 토큰 갱신
```typescript
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !originalRequest._retry) {
      try {
        // Refresh 엔드포인트 호출 (httpOnly 쿠키 사용)
        const response = await axios.post('/api/admin/auth/refresh');
        setAccessToken(response.data.accessToken);

        // 실패한 요청 재시도
        return apiClient(originalRequest);
      } catch (refreshError) {
        // 갱신 실패 시 로그인 페이지로 리다이렉트
        window.location.href = `/login?redirect=${encodeURIComponent(fullPath)}`;
      }
    }
    return Promise.reject(error);
  }
);
```

**큐 기반 동시성 제어**: 토큰 갱신 중 여러 요청이 대기열에 추가되어 갱신 후 일괄 재시도

### API 엔드포인트 그룹

`lib/api-client.ts`에서 도메인별 API 함수 그룹 제공:

- **authApi**: 로그인, 로그아웃, 토큰 갱신
- **usersApi**: 사용자 CRUD
- **rolesApi**: 역할 CRUD
- **filtersApi**: 저장된 필터 CRUD
- **analysisApi**: LLM 분석 세션
- **chatbotApi**: 글로벌 챗봇 대화

```typescript
// 사용 예시
import { authApi, usersApi } from '@/lib/api-client';

await authApi.login({ email, password });
const users = await usersApi.getAll();
```

## 도메인별 서비스 (`services/`)

각 도메인별 API 호출 로직 캡슐화:

- **analysisService.ts**: LLM 분석 세션
- **batchAnalysisService.ts**: 배치 분석 작업
- **chatbotQualityService.ts**: 챗봇 품질 메트릭
- **faqAnalysisService.ts**: FAQ 클러스터링
- **sessionAnalysisService.ts**: 세션 해결률/효율성 분석
- **userAnalyticsService.ts**: 유저 활동 분석
- **userProfilingService.ts**: 유저 프로파일링
- **geminiService.ts**: Google Gemini API 직접 호출
- **windEtlService.ts**: Wind ETL 모니터링
- **minkabuEtlService.ts**: Minkabu ETL 모니터링

**서비스 레이어 패턴**:
```typescript
// services/batchAnalysisService.ts
export const batchAnalysisService = {
  async getJobs(): Promise<BatchAnalysisJob[]> {
    const response = await apiClient.get('/api/admin/batch-analysis/jobs');
    return response.data;
  },

  async runJob(jobId: string): Promise<BatchAnalysisRun> {
    const response = await apiClient.post(`/api/admin/batch-analysis/jobs/${jobId}/run`);
    return response.data;
  },
};
```

## 테마 및 스타일링

### 다크 모드 색상 팔레트

```css
/* 배경 */
bg-slate-950  /* 메인 배경 */
bg-slate-900  /* 카드 배경 */
bg-slate-800  /* 하이라이트 배경 */

/* 텍스트 */
text-slate-100  /* 기본 텍스트 */
text-slate-300  /* 보조 텍스트 */
text-slate-500  /* 비활성 텍스트 */

/* 상태 색상 */
text-emerald-400  /* 긍정 (성공) */
text-rose-400     /* 부정 (에러) */
text-amber-400    /* 경고 */
text-blue-400     /* 정보 */
```

### Recharts 차트 색상

```typescript
const COLORS = [
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
];
```

### 타이포그래피

- **기본 폰트**: Geist Sans
- **모노스페이스 폰트**: Geist Mono (코드, 로그)

## 라우팅 및 네비게이션

### App Router 구조

Next.js 16 App Router를 사용하며, 파일 시스템 기반 라우팅을 따릅니다.

**라우트 그룹**:
- `(auth)`: 인증 레이아웃 그룹 (사이드바 없음)
- `dashboard`: 대시보드 레이아웃 그룹 (사이드바 포함)

### 레이아웃 계층

```
RootLayout (app/layout.tsx)
  └─ Providers (AuthContext, ChatbotContext, QueryClient)
     └─ LayoutContent (Sidebar + FloatingChatbot)
        ├─ LoginPage (사이드바 없음)
        └─ DashboardPages (사이드바 포함)
```

**LayoutContent.tsx**:
```tsx
// 로그인 페이지는 사이드바 제외
if (!isLoginPage) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main>{children}</main>
      <FloatingChatbot />
    </div>
  );
}
return <>{children}</>;
```

### 사이드바 네비게이션

**Sidebar.tsx**는 다음 섹션으로 구성:

1. **비즈니스**: Business, Operations
2. **품질**: Quality, Chatbot Quality
3. **분석**: Analysis, User Analytics, AI Performance
4. **ETL**: Wind, Minkabu
5. **관리자**: Users, Roles, Filters, Batch Analysis

## 데이터 페칭 전략

### React Query 패턴

```typescript
// hooks/queries/use-dashboard.ts
export function useBusinessDashboard(projectId: string, days: number) {
  const { data: tenantUsage, isLoading: loadingTenant } = useQuery({
    queryKey: ['tenant-usage', projectId, days],
    queryFn: () => apiClient.get(`/api/analytics/tenant-usage?days=${days}`),
    staleTime: 15 * 60 * 1000, // 15분
  });

  return {
    tenantUsage: tenantUsage?.data || [],
    isLoading: loadingTenant,
  };
}
```

### 캐싱 전략

- **SHORT (5분)**: 실시간 KPI, 에러 통계
- **MEDIUM (15분)**: 시간별/일별 트렌드
- **LONG (1시간)**: 정적 데이터 (테넌트 목록)

## 타입 안전성

### 공유 타입 시스템

`@ola/shared-types` 패키지에서 백엔드와 동일한 타입 import:

```typescript
import {
  RealtimeKPI,
  HourlyTraffic,
  TenantUsage,
  AnomalyStat,
} from '@ola/shared-types';
```

### Zod 스키마 유효성 검사

폼 입력 및 API 응답 검증:

```typescript
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('유효한 이메일을 입력하세요'),
  password: z.string().min(6, '비밀번호는 최소 6자입니다'),
});

type LoginFormData = z.infer<typeof loginSchema>;
```

## 성능 최적화

### 1. Server Components vs Client Components

- **Server Components**: 정적 콘텐츠, SEO 중요 페이지
- **Client Components** (`'use client'`): 상호작용, 상태 관리 필요 시

```tsx
// app/dashboard/business/page.tsx
'use client'; // React Query, Context 사용으로 클라이언트 컴포넌트

export default function BusinessPage() {
  const { data, isLoading } = useBusinessDashboard();
  // ...
}
```

### 2. Code Splitting

Next.js 자동 코드 스플리팅:
- 각 라우트는 독립적인 청크로 분할
- 동적 import로 추가 최적화 가능

```tsx
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('@/components/charts/HeavyChart'), {
  loading: () => <p>Loading chart...</p>,
  ssr: false, // 클라이언트에서만 렌더링
});
```

### 3. React Query Prefetching

```tsx
// 라우트 전환 전 데이터 프리페칭
queryClient.prefetchQuery({
  queryKey: ['tenant-usage', projectId],
  queryFn: fetchTenantUsage,
});
```

## 보안

### 1. XSS 방지

- React의 기본 이스케이핑
- Markdown 렌더링 시 sanitization
- `dangerouslySetInnerHTML` 사용 금지

### 2. CSRF 방지

- `withCredentials: true`로 SameSite 쿠키 사용
- Refresh Token은 httpOnly 쿠키

### 3. 권한 기반 접근 제어

```tsx
const ProtectedComponent = () => {
  const { hasPermission } = useAuth();

  if (!hasPermission('admin:users:write')) {
    return <p>권한이 없습니다</p>;
  }

  return <UserManagement />;
};
```

## 개발 환경 설정

### 환경 변수

`.env.local` 파일:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 개발 서버 실행

```bash
cd apps/frontend-next
pnpm dev  # 포트 3001에서 실행
```

### 빌드 및 프로덕션

```bash
pnpm build  # .next/ 디렉토리에 빌드 출력
pnpm start  # 프로덕션 서버 시작
```

## 의존성 주의사항

### 공유 타입 의존성

`@ola/shared-types` 변경 시 반드시 빌드 필요:

```bash
cd packages/shared-types
pnpm build

cd ../../apps/frontend-next
pnpm dev  # 변경사항 반영
```

### Recharts 버전

Recharts 3.6.0 사용 중 - 일부 차트 타입은 TypeScript 타입 불완전할 수 있음.

## 확장 가이드

### 새 대시보드 페이지 추가

1. `app/dashboard/new-page/page.tsx` 생성
2. 데이터 페칭 훅 작성 (`hooks/queries/use-new-page.ts`)
3. 필요한 차트 컴포넌트 작성 (`components/charts/NewChart.tsx`)
4. `Sidebar.tsx`에 네비게이션 링크 추가

### 새 차트 추가

```tsx
// components/charts/CustomChart.tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface CustomChartProps {
  data: any[];
  title: string;
}

export default function CustomChart({ data, title }: CustomChartProps) {
  return (
    <div className="bg-slate-800 rounded-lg p-6">
      <h3 className="text-lg font-medium mb-4">{title}</h3>
      <LineChart width={600} height={300} data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="name" stroke="#94a3b8" />
        <YAxis stroke="#94a3b8" />
        <Tooltip
          contentStyle={{ backgroundColor: '#1e293b', border: 'none' }}
        />
        <Line type="monotone" dataKey="value" stroke="#3b82f6" />
      </LineChart>
    </div>
  );
}
```

### 새 서비스 추가

```typescript
// services/newService.ts
import apiClient from '@/lib/api-client';
import type { NewEntity } from '@ola/shared-types';

export const newService = {
  async getAll(): Promise<NewEntity[]> {
    const response = await apiClient.get('/api/new-entities');
    return response.data;
  },

  async create(data: Partial<NewEntity>): Promise<NewEntity> {
    const response = await apiClient.post('/api/new-entities', data);
    return response.data;
  },
};
```

## 참고 자료

- [Next.js 16 Documentation](https://nextjs.org/docs)
- [React 19 Documentation](https://react.dev/)
- [Recharts Documentation](https://recharts.org/)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
