# Frontend Routes

## 개요

Next.js 16 App Router 기반 라우팅 구조입니다. 파일 시스템 기반 라우팅을 사용하며, 라우트 그룹을 통해 레이아웃을 분리합니다.

**경로**: `apps/frontend-next/src/app/`

## 라우트 그룹

### `(auth)` - 인증 레이아웃 그룹

사이드바 없이 전체 화면으로 표시되는 인증 관련 페이지:

```
(auth)/
└── login/
    └── page.tsx
```

### `dashboard` - 대시보드 레이아웃 그룹

사이드바 네비게이션과 플로팅 챗봇이 포함된 대시보드 페이지들:

```
dashboard/
├── admin/
├── business/
├── operations/
├── quality/
├── chatbot-quality/
├── user-analytics/
├── ai-performance/
└── etl/
```

## 전체 라우트 구조

```
/
├── (auth)/
│   └── login                     # 로그인 페이지
│
├── dashboard/                    # 대시보드 메인 (리다이렉트 또는 개요)
│   ├── business/                 # 비즈니스 메트릭
│   ├── operations/               # 운영 메트릭
│   ├── quality/                  # 품질 분석
│   ├── chatbot-quality/          # 챗봇 품질 분석
│   ├── user-analytics/           # 유저 활동 분석
│   │   └── [userId]/            # 개별 유저 상세
│   ├── ai-performance/           # AI 성능 분석
│   ├── analysis/                 # LLM 분석 세션
│   ├── etl/
│   │   ├── wind/                # Wind ETL 모니터링
│   │   └── minkabu/             # Minkabu ETL 모니터링
│   └── admin/
│       ├── users/               # 사용자 관리
│       ├── roles/               # 역할 관리
│       ├── filters/             # 필터 관리
│       ├── analysis/            # LLM 분석 세션 목록
│       │   └── [id]/           # 분석 세션 상세
│       └── batch-analysis/      # 배치 분석
│           ├── issue-frequency/ # 이슈 빈도 분석
│           ├── prompts/         # 프롬프트 템플릿 관리
│           ├── schedules/       # 스케줄 관리
│           ├── faq/
│           │   └── [id]/       # FAQ 클러스터링 결과 상세
│           └── [id]/           # 배치 작업 상세
│
├── [projectId]/
│   └── logs/                    # 프로젝트별 로그 탐색기
│
├── logs/                        # 전역 로그 탐색기
└── architecture/                # 아키텍처 뷰어 (개발용)
```

## 페이지 상세

### 인증 (Auth)

#### `/login`
**파일**: `app/(auth)/login/page.tsx`

**기능:**
- 이메일/비밀번호 로그인
- JWT Access Token (15분) + Refresh Token (7일, httpOnly 쿠키)
- 로그인 성공 시 `/dashboard`로 리다이렉트
- `?redirect=` 쿼리 파라미터로 리다이렉트 URL 지정 가능

**사용 기술:**
- React Hook Form + Zod 유효성 검사
- AuthContext 로그인 함수

**기본 계정:**
- Email: `admin@ola.com`
- Password: `admin123`

---

### 대시보드 (Dashboard)

#### `/dashboard`
**파일**: `app/dashboard/page.tsx`

**기능:**
- 대시보드 메인 페이지 (현재는 비즈니스 메트릭으로 리다이렉트하거나 개요 표시)

---

### 비즈니스 메트릭

#### `/dashboard/business`
**파일**: `app/dashboard/business/page.tsx`

**기능:**
- 테넌트별 토큰 사용량 분석
- 예상 비용 계산 (Gemini Flash 기준: $0.15 / 1M input tokens)
- 일별 비용 트렌드 차트
- 시간대별 사용량 히트맵

**주요 컴포넌트:**
- KPICard: 총 토큰, 예상 비용, 총 요청, 활성 테넌트
- TenantPieChart: 테넌트별 토큰 분포
- CostTrendChart: 일별 비용 트렌드
- UsageHeatmap: 시간대별 히트맵
- DataTable: 테넌트별 상세 현황 (요청 수, 토큰, 에러율)

**날짜 필터:**
- 7일, 30일, 90일 프리셋

---

### 운영 메트릭

#### `/dashboard/operations`
**파일**: `app/dashboard/operations/page.tsx`

**기능:**
- 실시간 트래픽 모니터링 (5분 단위)
- 시간별 요청 수 트렌드
- 에러율 게이지
- 이상 탐지 통계 (Z-Score 기반)

**주요 컴포넌트:**
- RealtimeTrafficChart: 5분 단위 실시간 트래픽
- ErrorGauge: 에러율 게이지 (목표: 1% 이하)
- AnomalyStatsChart: 이상 탐지 빈도

**캐싱:**
- 실시간 KPI: 5분
- 시간별 트래픽: 15분

---

### 품질 분석

#### `/dashboard/quality`
**파일**: `app/dashboard/quality/page.tsx`

**기능:**
- 토큰 효율성 분석 (Input/Output 비율)
- 응답 시간 vs 토큰 수 상관관계
- 반복 쿼리 패턴 탐지
- 효율성 트렌드 시계열 분석

**주요 컴포넌트:**
- TokenScatterPlot: 토큰 효율성 산점도
- QueryResponseScatterPlot: 응답 시간 vs 토큰
- RepeatedQueriesTable: 반복 쿼리 목록
- TokenEfficiencyTrendChart: 효율성 트렌드

---

### 챗봇 품질 분석

#### `/dashboard/chatbot-quality`
**파일**: `app/dashboard/chatbot-quality/page.tsx`

**기능:**
- LLM 기반 챗봇 응답 품질 분석
- 평균 품질 점수 (1-10 스케일)
- 감정 분석 (positive, neutral, negative)
- 이슈 탐지 (hallucination, irrelevant, inappropriate)
- 일별 품질 트렌드

**주요 컴포넌트:**
- KPICard: 평균 점수, 감정 분포, 이슈 비율
- QualityTrendChart: 일별 품질 트렌드
- IssueFrequencyChart: 이슈 유형별 빈도
- DataTable: 대화별 상세 품질 분석 결과

**필터:**
- 최소/최대 평균 점수
- 감정 (positive, neutral, negative)
- 이슈 여부

---

### 유저 활동 분석

#### `/dashboard/user-analytics`
**파일**: `app/dashboard/user-analytics/page.tsx`

**기능:**
- `x_enc_data` 기준 유저별 활동 분석
- 유저별 요청 수, 토큰 사용량 랭킹
- 유저 행동 패턴 (일일 활동, 주간 활동)
- 특정 유저 상세 프로파일 조회

**주요 컴포넌트:**
- UserListTable: 유저 목록 (요청 수, 토큰, 에러율 정렬)
- UserRequestsBarChart: 상위 유저 요청 수 비교
- UserTokensPieChart: 유저별 토큰 분포
- UserPatternsTable: 행동 패턴 분석

**클릭 액션:**
- 유저 행 클릭 시 `UserActivityDialog` 모달 표시 (상세 타임라인)

#### `/dashboard/user-analytics/[userId]`
**파일**: `app/dashboard/user-analytics/[userId]/page.tsx`

**기능:**
- 개별 유저 상세 프로파일
- 카테고리 분포 (질문 유형 자동 분류)
- 감정 분석 결과 (시계열)
- 활동 히스토리 타임라인

**주요 컴포넌트:**
- UserProfileSummary: 총 요청, 평균 토큰, 활동 기간
- CategoryDistribution: 질문 카테고리 분포 (파이 차트)
- SentimentIndicator: 전체 감정 점수
- ActivityTimeline: 시간별 활동 패턴

---

### AI 성능 분석

#### `/dashboard/ai-performance`
**파일**: `app/dashboard/ai-performance/page.tsx`

**기능:**
- LLM 모델별 성능 비교
- 응답 시간 분포
- 토큰 생성 속도 (tokens/sec)
- 성공률 및 에러 패턴

**주요 컴포넌트:**
- ModelPerformanceChart: 모델별 응답 시간 비교
- TokenThroughputChart: 토큰 생성 속도
- SuccessRateGauge: 모델별 성공률

---

### LLM 분석 세션

#### `/dashboard/analysis`
**파일**: `app/dashboard/analysis/page.tsx`

**기능:**
- LLM 기반 데이터 분석 세션 목록
- 새 분석 세션 생성 (프로젝트, 날짜 범위, 분석 목표 지정)
- 세션별 대화 히스토리 조회

**주요 컴포넌트:**
- SessionList: 세션 목록 (제목, 생성일, 메시지 수)
- NewSessionModal: 세션 생성 폼

#### `/dashboard/admin/analysis/[id]`
**파일**: `app/dashboard/admin/analysis/[id]/page.tsx`

**기능:**
- 특정 분석 세션 상세 페이지
- ChatInterface: LLM과 대화하며 데이터 분석
- MetricsContext: 현재 페이지의 메트릭 데이터를 LLM에 전달
- Markdown 렌더링 (코드 하이라이팅 포함)

**사용 시나리오:**
```
User: "테넌트 A의 에러율이 왜 높은가?"
LLM: "최근 7일간 테넌트 A의 에러율은 3.2%입니다. 주요 원인은..."
```

---

### ETL 모니터링

#### `/dashboard/etl/wind`
**파일**: `app/dashboard/etl/wind/page.tsx`

**기능:**
- Wind 데이터 파이프라인 모니터링
- ETL 작업 성공/실패 현황
- 데이터 처리량, 지연 시간
- 에러 로그 및 알림 히스토리

**주요 컴포넌트:**
- ETLStatusCard: 작업 상태 (성공, 실패, 진행 중)
- DataThroughputChart: 처리량 트렌드
- ErrorLogTable: 에러 로그 목록

#### `/dashboard/etl/minkabu`
**파일**: `app/dashboard/etl/minkabu/page.tsx`

**기능:**
- Minkabu 데이터 파이프라인 모니터링
- Wind와 동일한 모니터링 기능 제공

---

### 관리자 (Admin)

#### `/dashboard/admin/users`
**파일**: `app/dashboard/admin/users/page.tsx`

**기능:**
- 사용자 CRUD (생성, 수정, 삭제)
- 역할 할당 (Admin, Analyst, Viewer)
- 활성/비활성 상태 관리

**주요 컴포넌트:**
- DataTable: 사용자 목록 (이메일, 이름, 역할, 상태)
- UserFormModal: 사용자 생성/수정 폼
- ConfirmDialog: 삭제 확인 다이얼로그

**권한:**
- `admin:users:read`: 목록 조회
- `admin:users:write`: 생성/수정
- `admin:users:delete`: 삭제

---

#### `/dashboard/admin/roles`
**파일**: `app/dashboard/admin/roles/page.tsx`

**기능:**
- 역할 CRUD (Admin, Analyst, Viewer)
- 권한 관리 (resource:action 형식)
- 권한 템플릿 (읽기 전용, 전체 관리자 등)

**주요 컴포넌트:**
- DataTable: 역할 목록 (이름, 설명, 권한 수)
- RoleFormModal: 역할 생성/수정 폼 (멀티셀렉트 권한)

**권한 예시:**
```
admin:users:read
admin:users:write
admin:roles:write
analytics:view
```

---

#### `/dashboard/admin/filters`
**파일**: `app/dashboard/admin/filters/page.tsx`

**기능:**
- 저장된 필터 CRUD
- 기본 필터 설정 (사용자별)
- 필터 공유 (다른 사용자에게)

**주요 컴포넌트:**
- DataTable: 필터 목록 (이름, 조건, 기본 여부)
- FilterFormModal: 필터 생성/수정 폼
- SetDefaultButton: 기본 필터 설정 버튼

**필터 조건 예시:**
```json
{
  "tenantId": "tenant-a",
  "dateRange": { "startDate": "2025-01-01", "endDate": "2025-01-23" },
  "severity": ["ERROR", "WARN"]
}
```

---

### 배치 분석 (Batch Analysis)

#### `/dashboard/admin/batch-analysis`
**파일**: `app/dashboard/admin/batch-analysis/page.tsx`

**기능:**
- 배치 분석 작업 관리 (일일 자동 챗봇 품질 분석)
- 작업 생성, 실행, 결과 조회
- 3개 탭: Chat Quality, Session Analysis, FAQ Analysis

**탭 구성:**

1. **Chat Quality 탭** (ChatQualityTab.tsx):
   - LLM 기반 챗봇 응답 품질 분석 결과
   - 필터: 최소/최대 점수, 감정, 이슈 여부
   - 결과 테이블: 테넌트, 대화 ID, 평균 점수, 감정, 이슈 목록

2. **Session Analysis 탭** (SessionAnalysisTab.tsx):
   - 세션 해결률, 효율성, 이탈률 분석
   - 필터: 테넌트, 해결 여부, 효율성 범위
   - 세션별 타임라인 조회 (SessionTimelineModal)

3. **FAQ Analysis 탭** (FAQAnalysisTab.tsx):
   - FAQ 클러스터링 결과
   - 유사 질문 그룹화, 빈도 분석
   - 클러스터별 LLM 사유 분석

**주요 컴포넌트:**
- CreateJobModal: 작업 생성 폼 (테넌트, 날짜 범위, 분석 유형)
- DataTable: 결과 목록

---

#### `/dashboard/admin/batch-analysis/[id]`
**파일**: `app/dashboard/admin/batch-analysis/[id]/page.tsx`

**기능:**
- 특정 배치 작업 상세 페이지
- 작업 실행 히스토리 (성공/실패 로그)
- 분석 결과 다운로드 (CSV, JSON)

---

#### `/dashboard/admin/batch-analysis/issue-frequency`
**파일**: `app/dashboard/admin/batch-analysis/issue-frequency/page.tsx`

**기능:**
- 이슈 빈도 분석 대시보드
- 이슈 유형별 발생 빈도 (hallucination, irrelevant, inappropriate)
- 테넌트별 이슈 비교
- 시계열 트렌드 (일별 이슈 발생 추이)

**주요 컴포넌트:**
- IssueFrequencyBarChart: 이슈 유형별 빈도
- IssueTrendChart: 일별 이슈 트렌드

---

#### `/dashboard/admin/batch-analysis/prompts`
**파일**: `app/dashboard/admin/batch-analysis/prompts/page.tsx`

**기능:**
- 프롬프트 템플릿 CRUD
- 분석 유형별 프롬프트 관리 (chat-quality, session-analysis, faq-analysis)
- 버전 관리 (v1, v2, ...)

**주요 컴포넌트:**
- DataTable: 프롬프트 목록 (이름, 유형, 버전)
- PromptFormModal: 프롬프트 생성/수정 폼 (코드 에디터)

---

#### `/dashboard/admin/batch-analysis/schedules`
**파일**: `app/dashboard/admin/batch-analysis/schedules/page.tsx`

**기능:**
- 배치 작업 스케줄 CRUD (다중 스케줄 지원)
- Cron 표현식 기반 주기 설정 (매일 오전 1시, 매주 월요일 등)
- 활성/비활성 상태 관리

**주요 컴포넌트:**
- DataTable: 스케줄 목록 (이름, Cron, 활성 여부, 다음 실행 시간)
- ScheduleFormModal: 스케줄 생성/수정 폼

**Cron 예시:**
```
0 1 * * *       # 매일 오전 1시
0 9 * * 1       # 매주 월요일 오전 9시
0 */6 * * *     # 6시간마다
```

---

#### `/dashboard/admin/batch-analysis/faq/[id]`
**파일**: `app/dashboard/admin/batch-analysis/faq/[id]/page.tsx`

**기능:**
- FAQ 클러스터링 결과 상세 조회
- 클러스터별 질문 목록
- LLM이 생성한 사유 (왜 이 질문들이 유사한가?)
- 빈도 분석 (상위 클러스터)

**주요 컴포넌트:**
- FAQClusterCard: 클러스터 카드 (대표 질문, 유사 질문 목록, 사유)

---

### 기타 페이지

#### `/logs`
**파일**: `app/logs/page.tsx`

**기능:**
- 전역 로그 탐색기 (모든 프로젝트)
- 실시간 로그 스트리밍 (선택 사항)
- 필터: 테넌트, 심각도, 날짜 범위, 키워드

#### `/[projectId]/logs`
**파일**: `app/[projectId]/logs/page.tsx`

**기능:**
- 프로젝트별 로그 탐색기
- 동적 라우팅 (예: `/ibks/logs`)

#### `/architecture`
**파일**: `app/architecture/page.tsx`

**기능:**
- 아키텍처 다이어그램 뷰어 (개발용)
- 시스템 구조 시각화

---

## 레이아웃 구조

### RootLayout (`app/layout.tsx`)

모든 페이지의 최상위 레이아웃:

```tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <LayoutContent>{children}</LayoutContent>
        </Providers>
      </body>
    </html>
  );
}
```

**Providers** (`app/providers.tsx`):
- AuthProvider (JWT 토큰 관리)
- ChatbotProvider (플로팅 챗봇)
- QueryClientProvider (React Query)

### LayoutContent (`components/LayoutContent.tsx`)

사이드바 표시 여부를 제어:

```tsx
// 로그인 페이지 제외 모든 페이지에서 사이드바 표시
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

### 사이드바 네비게이션 (`components/Sidebar.tsx`)

**섹션 구성:**

1. **비즈니스**
   - `/dashboard/business` - 비즈니스 메트릭
   - `/dashboard/operations` - 운영 메트릭

2. **품질**
   - `/dashboard/quality` - 품질 분석
   - `/dashboard/chatbot-quality` - 챗봇 품질

3. **분석**
   - `/dashboard/analysis` - LLM 분석
   - `/dashboard/user-analytics` - 유저 분석
   - `/dashboard/ai-performance` - AI 성능

4. **ETL**
   - `/dashboard/etl/wind` - Wind
   - `/dashboard/etl/minkabu` - Minkabu

5. **관리자** (권한 필요)
   - `/dashboard/admin/users` - 사용자 관리
   - `/dashboard/admin/roles` - 역할 관리
   - `/dashboard/admin/filters` - 필터 관리
   - `/dashboard/admin/batch-analysis` - 배치 분석

**권한 기반 표시:**
```tsx
{hasPermission('admin:users:read') && (
  <Link href="/dashboard/admin/users">사용자 관리</Link>
)}
```

---

## 라우팅 패턴

### 정적 라우트

파일 시스템 경로가 그대로 URL로 매핑:

```
app/dashboard/business/page.tsx  →  /dashboard/business
```

### 동적 라우트

대괄호 `[]`로 동적 세그먼트 정의:

```
app/dashboard/user-analytics/[userId]/page.tsx
→ /dashboard/user-analytics/user-123

app/dashboard/admin/batch-analysis/[id]/page.tsx
→ /dashboard/admin/batch-analysis/job-456
```

**파라미터 접근:**
```tsx
export default function UserDetailPage({ params }: { params: { userId: string } }) {
  const { userId } = params;
  // userId 사용하여 데이터 페칭
}
```

### 라우트 그룹

소괄호 `()`로 라우트 그룹 정의 (URL에 영향 없음):

```
app/(auth)/login/page.tsx  →  /login (사이드바 없음)
app/dashboard/business/page.tsx  →  /dashboard/business (사이드바 포함)
```

---

## 네비게이션 패턴

### Link 컴포넌트

Next.js의 `Link` 컴포넌트로 클라이언트 사이드 네비게이션:

```tsx
import Link from 'next/link';

<Link href="/dashboard/business" className="nav-link">
  비즈니스 메트릭
</Link>
```

### useRouter Hook

프로그래매틱 네비게이션:

```tsx
import { useRouter } from 'next/navigation';

const router = useRouter();

const handleLogin = async () => {
  await login();
  router.push('/dashboard');
};
```

### 조건부 리다이렉트

미들웨어 또는 서버 컴포넌트에서:

```tsx
// middleware.ts
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('refreshToken');

  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
```

---

## 페이지별 메타데이터

### 정적 메타데이터

```tsx
// app/dashboard/business/page.tsx
export const metadata = {
  title: '비즈니스 메트릭 | OLA-B2B Monitoring',
  description: '테넌트별 토큰 사용량 및 비용 분석',
};
```

### 동적 메타데이터

```tsx
export async function generateMetadata({ params }: { params: { userId: string } }) {
  const user = await fetchUser(params.userId);

  return {
    title: `${user.name} - 유저 분석 | OLA-B2B Monitoring`,
    description: `${user.name}의 활동 분석 및 프로파일`,
  };
}
```

---

## 접근 제어

### 권한 기반 라우트 가드

AuthContext의 `hasPermission` 함수로 페이지 레벨 접근 제어:

```tsx
'use client';

export default function UsersPage() {
  const { hasPermission, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;

  if (!hasPermission('admin:users:read')) {
    return <p>접근 권한이 없습니다</p>;
  }

  return <UserManagement />;
}
```

### 미들웨어 기반 인증 체크

```tsx
// middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('refreshToken');
  const isAuthPage = request.nextUrl.pathname.startsWith('/login');
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard');

  // 대시보드 접근 시 토큰 없으면 로그인 페이지로
  if (isDashboard && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 로그인 페이지인데 이미 토큰 있으면 대시보드로
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}
```

---

## URL 쿼리 파라미터

### 날짜 범위 필터

```
/dashboard/business?days=30
/dashboard/business?startDate=2025-01-01&endDate=2025-01-23
```

### 리다이렉트 URL

```
/login?redirect=/dashboard/admin/users
```

### 정렬 및 검색

```
/dashboard/admin/users?sort=email&order=asc&search=admin
```

**파라미터 접근:**
```tsx
import { useSearchParams } from 'next/navigation';

const searchParams = useSearchParams();
const days = searchParams.get('days') || '30';
```

---

## 라우트 확장 가이드

### 새 페이지 추가

1. 파일 생성:
```bash
touch app/dashboard/new-feature/page.tsx
```

2. 페이지 컴포넌트 작성:
```tsx
'use client';

export default function NewFeaturePage() {
  return (
    <Dashboard>
      <Dashboard.Header title="새 기능" />
      <Dashboard.Content>
        {/* 컨텐츠 */}
      </Dashboard.Content>
    </Dashboard>
  );
}
```

3. 사이드바에 링크 추가 (`components/Sidebar.tsx`):
```tsx
<Link href="/dashboard/new-feature">새 기능</Link>
```

### 동적 라우트 추가

```bash
mkdir -p app/dashboard/items/[id]
touch app/dashboard/items/[id]/page.tsx
```

```tsx
interface PageProps {
  params: { id: string };
}

export default function ItemDetailPage({ params }: PageProps) {
  const { id } = params;
  // id로 데이터 페칭
}
```

---

## 참고 자료

- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [Next.js Routing Documentation](https://nextjs.org/docs/app/building-your-application/routing)
- [Next.js Dynamic Routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)
- [Next.js Route Groups](https://nextjs.org/docs/app/building-your-application/routing/route-groups)
