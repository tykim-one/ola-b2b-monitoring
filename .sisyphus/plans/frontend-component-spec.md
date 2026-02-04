# 프론트엔드 UI 컴포넌트 명세서

> OLA B2B Monitoring 프론트엔드 컴포넌트 라이브러리의 단일 진실 소스(Single Source of Truth)
> 최종 갱신: 2026-02-04

---

## 1. 개요

본 문서는 `apps/frontend-next/src/components/` 하위에 위치한 **47개 파일, 42개 컴포넌트** (10개 디렉토리)의 전체 명세를 기술한다.

| 항목 | 값 |
|------|-----|
| 모노레포 경로 | `apps/frontend-next/src/components/` |
| 프레임워크 | Next.js 16 + React 19 |
| 차트 라이브러리 | Recharts |
| 서버 상태 관리 | TanStack React Query v5 |
| 아이콘 | lucide-react |
| 마크다운 렌더링 | react-markdown + remark-gfm + rehype-highlight |
| 공유 타입 | `@ola/shared-types` |

---

### 1.1 아키텍처 레이어

프론트엔드 컴포넌트는 5개 계층으로 구분된다.

| 레이어 | 디렉토리 | 설명 | 컴포넌트 수 |
|--------|----------|------|------------|
| **Layer 1 - Base UI** | `ui/` | 재사용 가능한 UI 원자 컴포넌트 | 7 |
| **Layer 2 - Compound** | `compound/` | React Context 기반 합성 컴포넌트 | 3 (서브 컴포넌트 다수) |
| **Layer 3 - Data Viz** | `charts/` | Recharts 기반 차트 및 테이블 (순수 프레젠테이셔널) | 17 |
| **Layer 4 - Domain** | `chatbot/`, `analysis/`, `faq-analysis/`, `session-analysis/`, `user-profiling/`, `markdown/` | 도메인별 기능 컴포넌트 | 12 |
| **Layer 5 - Layout** | 루트 | 레이아웃 셸 및 레거시 페이지 컴포넌트 | 5 |

**Layer 1 - Base UI (`ui/`)**: Modal, SearchInput, ConfirmDialog, DateRangeFilter, StatusBadge, EmptyState, StatsFooter

**Layer 2 - Compound Components (`compound/`)**: Dashboard, DataTable, Chart -- 각각 Object.assign() 패턴과 React Context를 사용하여 `<Dashboard.Header>`, `<DataTable.Body>` 등의 서브 컴포넌트를 제공

**Layer 3 - Data Visualization (`charts/`)**: Recharts 기반 차트 10종 + 독립 테이블 4종 + 다이얼로그 2종 + 테마 설정 1종. 모두 순수 프레젠테이셔널 컴포넌트로 데이터를 props로 수신

**Layer 4 - Domain Features**: 도메인별 기능 컴포넌트 그룹
- `chatbot/`: FloatingChatbot, ChatWindow, ChatMessage, ChatInput
- `analysis/`: ChatInterface, MessageBubble, SessionList, MetricsContext
- `faq-analysis/`: FAQAnalysisSection, FAQClusterCard
- `session-analysis/`: SessionTimelineModal
- `user-profiling/`: UserProfileSummary, SentimentIndicator, CategoryDistribution

**Layer 5 - Layout & Pages**: LayoutContent, Sidebar, Dashboard(레거시), LogExplorer, ArchitectureView

---

### 1.2 데이터 흐름 패턴

```
Page (app/dashboard/*)
  -> React Query hooks (hooks/queries/*)
    -> Service layer (services/*)
      -> API (fetch/axios)
        -> 컴포넌트에 props로 전달
```

**예외 -- 내부 데이터 패칭 컴포넌트 (5건)**:

| 컴포넌트 | 패칭 방식 | 비고 |
|----------|----------|------|
| MetricsContext | `fetch()` in useEffect | React Query 미사용 |
| UserActivityDialog | `fetchUserActivity()` in useEffect | React Query 미사용 |
| FAQAnalysisSection | `runFAQAnalysis()`, `getFAQTenants()` | React Query 미사용 |
| SessionTimelineModal | `sessionAnalysisApi` calls | React Query 미사용 |
| LogExplorer | `analyzeLogs()` | React Query 미사용 |

이 컴포넌트들은 캐싱/중복제거가 적용되지 않으며, React Query 훅으로 마이그레이션 권장.

---

### 1.3 캐싱 전략

THREE-TIER TTL 시스템 (TanStack React Query 기반):

| 티어 | TTL | 대상 | 자동 갱신 |
|------|-----|------|----------|
| **SHORT** | 5분 | RealtimeKPI, AnomalyStats, ErrorAnalysis, TokenEfficiency | `refetchInterval: 5 * 60 * 1000` |
| **MEDIUM** | 15분 | HourlyTraffic, DailyTraffic, TenantUsage, CostTrend, Quality, Heatmap | `staleTime` 기본값 |
| **LONG** | 1시간 | Health checks, Static data | 수동 갱신 |

---

## 2. Base UI 컴포넌트 (`components/ui/`)

### 2.1 Modal

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/ui/Modal.tsx` |
| 렌더링 모드 | Client Component (`'use client'`) |
| 주요 의존성 | lucide-react (`X`) |
| 상태 관리 | 없음 (props 기반) |
| 사용 위치 | QueryResponseScatterPlot, 각 admin 페이지에서 직접 import |

```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}
```

- `size` 기본값: `'md'`
- `!isOpen` 시 early return (`null`)
- size별 max-width: `sm`=max-w-md, `md`=max-w-2xl, `lg`=max-w-4xl, `xl`=max-w-6xl
- 백드롭 클릭 시 `onClose` 호출
- `max-h-[90vh]` + `overflow-y-auto` 적용

**성능 참고**: 단순 컴포넌트 -- 최적화 불필요

---

### 2.2 DateRangeFilter

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/ui/DateRangeFilter.tsx` |
| 렌더링 모드 | Client Component (`'use client'`) |
| 주요 의존성 | lucide-react (`Calendar`, `ChevronDown`) |
| 상태 관리 | `activePreset`, `showCustom`, `customStartDate`, `customEndDate` |
| 사용 위치 | Dashboard 페이지 Header의 `rightContent` slot |

```typescript
export type PresetType = 'day' | 'week' | 'month' | 'custom';

export interface DateRange {
  startDate: string; // YYYY-MM-DD format
  endDate: string;   // YYYY-MM-DD format
  days: number;      // Number of days for API calls
}

interface DateRangeFilterProps {
  defaultPreset?: PresetType;
  onChange: (range: DateRange) => void;
  className?: string;
}
```

- `defaultPreset` 기본값: `'week'`
- `useRef`로 `onChange` 참조 안정화 (StrictMode 중복 호출 방지)
- `useCallback`으로 모든 핸들러 메모이제이션
- 프리셋 버튼: 1일, 7일, 30일 + 커스텀 날짜 선택

**성능 참고**: GOOD -- `useCallback`/`useRef`로 적절한 메모이제이션 적용 (rerender-functional-setstate 준수)

---

### 2.3 ConfirmDialog

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/ui/ConfirmDialog.tsx` |
| 렌더링 모드 | Client Component (`'use client'`) |
| 주요 의존성 | lucide-react (`X`, `AlertTriangle`) |
| 상태 관리 | 없음 (props 기반) |
| 사용 위치 | Admin 삭제 작업 확인 다이얼로그 |

```typescript
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;   // 기본값: 'Confirm'
  cancelText?: string;    // 기본값: 'Cancel'
  variant?: 'danger' | 'warning' | 'info'; // 기본값: 'warning'
  isLoading?: boolean;    // 기본값: false
}
```

- `!isOpen` 시 early return (`null`)
- variant별 색상 테마: danger(red), warning(amber), info(cyan)
- `isLoading` 시 버튼 비활성화 + "Processing..." 텍스트

---

### 2.4 SearchInput

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/ui/SearchInput.tsx` |
| 렌더링 모드 | Client Component (`'use client'`) |
| 주요 의존성 | lucide-react (`Search`, `X`) |
| 상태 관리 | 없음 (제어 컴포넌트 -- 상태는 부모에서 관리) |
| 사용 위치 | DataTable 외부 검색, Admin 페이지 |

```typescript
interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;   // 기본값: 'Search...'
  className?: string;     // 기본값: ''
}
```

- 값이 있을 때 X 버튼으로 클리어 기능 제공
- 제어 컴포넌트 패턴 -- 상태가 부모로 리프팅됨

---

### 2.5 StatusBadge

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/ui/StatusBadge.tsx` |
| 렌더링 모드 | **Server Component** (`'use client'` 없음) |
| 주요 의존성 | 없음 (Zero dependencies) |
| 상태 관리 | 없음 |
| 사용 위치 | DataTable 셀 렌더러, Admin 상태 표시 |

```typescript
export type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral';

export interface StatusBadgeProps {
  label: string;
  variant: BadgeVariant;
  shape?: 'pill' | 'rect';   // 기본값: 'rect'
  size?: 'sm' | 'md';        // 기본값: 'sm'
  className?: string;         // 기본값: ''
}
```

- 순수 JSX -- 이벤트 핸들러/상태 없음
- variant별 색상: success(emerald), error(rose), warning(amber), info(cyan), neutral(gray)

---

### 2.6 EmptyState

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/ui/EmptyState.tsx` |
| 렌더링 모드 | **Server Component** (`'use client'` 없음) |
| 주요 의존성 | 없음 |
| 상태 관리 | 없음 |
| 사용 위치 | DataTable, Dashboard.Empty, 각종 리스트 빈 상태 |

```typescript
export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description: string;
  searchQuery?: string;
  searchMessage?: string;     // 기본값: 'NO RESULTS FOUND'
  action?: EmptyStateAction;
  variant?: 'dashed' | 'solid'; // 기본값: 'dashed'
  className?: string;            // 기본값: ''
}
```

- `searchQuery` 존재 시 간소화된 검색 결과 없음 UI 표시
- `action` 존재 시 CTA 버튼 렌더링

**참고**: `action.onClick`이 있으므로 Server Component에서 사용 시 주의 -- action이 있는 경우 부모가 Client Component여야 함

---

### 2.7 StatsFooter

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/ui/StatsFooter.tsx` |
| 렌더링 모드 | **Server Component** (`'use client'` 없음) |
| 주요 의존성 | 없음 (Zero dependencies) |
| 상태 관리 | 없음 |
| 사용 위치 | 차트 카드 하단 요약 통계 |

```typescript
export interface StatItem {
  label: string;
  value: string | number;
  color?: string;
  valueSize?: 'lg' | '2xl'; // 기본값: '2xl'
}

export interface StatsFooterProps {
  items: StatItem[];
  columns?: 2 | 3 | 4;      // 기본값: 3
  className?: string;         // 기본값: ''
}
```

- 순수 JSX, 숫자 값 자동 `toLocaleString()` 포매팅

---

## 3. Compound 컴포넌트 (`components/compound/`)

### 3.1 Dashboard

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/compound/Dashboard/index.tsx` |
| 렌더링 모드 | Client Component (`'use client'`) |
| 패턴 | `Object.assign()` + React Context (`DashboardContext`) |
| 서브 컴포넌트 | `.Header`, `.KPISection`, `.ChartsSection`, `.TableSection`, `.Section`, `.Skeleton`, `.Error`, `.Empty`, `.Content` |
| Context 상태 | `{ isLoading: boolean; error: Error \| null; refetch?: () => void }` |

**전체 Props 인터페이스:**

```typescript
// Root
interface DashboardRootProps {
  children: ReactNode;
  isLoading?: boolean;    // 기본값: false
  error?: Error | null;   // 기본값: null
  className?: string;     // 기본값: ''
  refetch?: () => void;
}

// Header
interface DashboardHeaderProps {
  title: string;
  description?: string;
  rightContent?: ReactNode;
}

// KPISection
interface DashboardKPISectionProps {
  children: ReactNode;
  columns?: 2 | 3 | 4 | 5;  // 기본값: 4
  className?: string;
}

// ChartsSection
interface DashboardChartsSectionProps {
  children: ReactNode;
  columns?: 1 | 2 | 3;       // 기본값: 2
  className?: string;
}

// TableSection
interface DashboardTableSectionProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

// Section (Context 의존)
interface DashboardSectionProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

// Skeleton (Context 의존)
interface DashboardSkeletonProps {
  layout?: 'default' | 'kpi-chart' | 'kpi-only'; // 기본값: 'default'
}

// Error (Context 의존)
interface DashboardErrorProps {
  message?: string;
}

// Empty
interface DashboardEmptyProps {
  title?: string;       // 기본값: '데이터 없음'
  description?: string; // 기본값: '표시할 데이터가 없습니다.'
  icon?: ReactNode;
}

// Content (Context 의존)
interface DashboardContentProps {
  children: ReactNode;
}
```

**동작 규칙**:
- `Dashboard.Skeleton`: `isLoading === true`일 때만 렌더링
- `Dashboard.Error`: `error !== null`일 때만 렌더링 (refetch 버튼 포함)
- `Dashboard.Content`: `isLoading === false && error === null`일 때만 렌더링
- `Dashboard.Section`: `isLoading === true`이면 렌더링하지 않음

**사용 예시:**

```tsx
<Dashboard isLoading={isLoading} error={error} refetch={refetch}>
  <Dashboard.Header title="비즈니스 대시보드" rightContent={<DateRangeFilter />} />
  <Dashboard.Skeleton layout="kpi-chart" />
  <Dashboard.Error />
  <Dashboard.Content>
    <Dashboard.KPISection columns={4}>
      <KPICard title="총 요청" value={kpis.totalRequests} />
    </Dashboard.KPISection>
    <Dashboard.ChartsSection columns={2}>
      <CostTrendChart data={costTrend} />
    </Dashboard.ChartsSection>
  </Dashboard.Content>
</Dashboard>
```

---

### 3.2 DataTable

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/compound/DataTable/index.tsx` |
| 렌더링 모드 | Client Component (`'use client'`) |
| 패턴 | `Object.assign()` + React Context (`DataTableContext`) |
| 서브 컴포넌트 | `.Toolbar`, `.Search`, `.Content`, `.Header`, `.Body`, `.Footer`, `.Pagination` |
| 주요 의존성 | lucide-react (`Search`, `ChevronUp`, `ChevronDown`, `ChevronsUpDown`, `ChevronLeft`, `ChevronRight`) |

**전체 Props 인터페이스:**

```typescript
type SortDirection = 'asc' | 'desc' | null;
type DataTableVariant = 'default' | 'card' | 'flat';

interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  render?: (value: unknown, row: T, index: number) => ReactNode;
  className?: string;
}

// Root
interface DataTableRootProps<T> {
  children: ReactNode;
  data: T[];
  columns: Column<T>[];
  searchFields?: (keyof T)[];  // 기본값: []
  className?: string;           // 기본값: ''
  variant?: DataTableVariant;   // 기본값: 'default'
  rowKey?: keyof T | ((row: T) => string | number);
}

// Toolbar
interface DataTableToolbarProps {
  children: ReactNode;
  className?: string;
}

// Search
interface DataTableSearchProps {
  placeholder?: string;  // 기본값: '검색...'
  className?: string;
}

// Content (table 래퍼)
interface DataTableContentProps {
  children?: ReactNode;
}

// Body
interface DataTableBodyProps<T> {
  emptyMessage?: string;  // 기본값: '데이터가 없습니다'
  emptyIcon?: ReactNode;
  onRowClick?: (row: T, index: number) => void;
  rowClassName?: (row: T, index: number) => string;
}

// Footer
interface DataTableFooterProps {
  children?: ReactNode;
  className?: string;
}

// Pagination
interface DataTablePaginationProps {
  pageSize?: number;           // 기본값: 10
  pageSizeOptions?: number[];  // 기본값: [10, 20, 50]
  className?: string;
}
```

**Context 내부 상태**: search, sort (field + direction), pagination (hasPagination, currentPage, pageSize)

**성능 최적화**:
- `useMemo`: filteredData, sortedData, paginatedData 각각 메모이제이션
- `useCallback`: setSorting 함수 메모이제이션
- 데이터/검색/정렬 변경 시 자동 페이지 1로 리셋

**사용 예시:**

```tsx
<DataTable data={users} columns={columns} searchFields={['name', 'email']}>
  <DataTable.Toolbar>
    <DataTable.Search placeholder="사용자 검색..." />
  </DataTable.Toolbar>
  <DataTable.Content>
    <DataTable.Header />
    <DataTable.Body onRowClick={handleRowClick} />
  </DataTable.Content>
  <DataTable.Pagination pageSize={20} />
</DataTable>
```

---

### 3.3 Chart

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/compound/Chart/index.tsx` |
| 렌더링 모드 | Client Component (`'use client'`) |
| 패턴 | `Object.assign()` (Context 미사용) |
| 서브 컴포넌트 | `.Legend`, `.Metric`, `.Loading`, `.NoData`, `.Wrapper` |
| 주요 의존성 | recharts (`ResponsiveContainer`) |

**전체 Props 인터페이스:**

```typescript
// Root
interface ChartRootProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  height?: number;        // 기본값: 256
  className?: string;
  headerRight?: ReactNode;
}

// Legend
interface LegendItem {
  color: string;
  label: string;
  value?: string | number;
}

interface ChartLegendProps {
  items: LegendItem[];
  position?: 'top' | 'bottom';   // 기본값: 'bottom'
  align?: 'left' | 'center' | 'right'; // 기본값: 'center'
  className?: string;
}

// Metric
interface ChartMetricProps {
  label: string;
  value: string | number;
  trend?: {
    value: number;
    isPositive?: boolean;
  };
  className?: string;
}

// Loading
interface ChartLoadingProps {
  height?: number;  // 기본값: 256
}

// NoData
interface ChartNoDataProps {
  title: string;
  message?: string;   // 기본값: '표시할 데이터가 없습니다'
  height?: number;     // 기본값: 256
}

// Wrapper
interface ChartWrapperProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  className?: string;
}
```

**CHART_COLORS 상수** (compound Chart에서 export):

```typescript
export const CHART_COLORS = {
  primary: '#3b82f6',    // blue-500
  secondary: '#8b5cf6',  // violet-500
  success: '#10b981',    // emerald-500
  warning: '#f59e0b',    // amber-500
  danger: '#ef4444',     // red-500
  info: '#06b6d4',       // cyan-500
  palette: [
    '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
    '#ef4444', '#06b6d4', '#ec4899', '#14b8a6',
  ],
} as const;
```

**주의사항 -- CHART_COLORS 이중 정의**:

| 위치 | 역할 | 키 |
|------|------|-----|
| `charts/chart-theme.ts` | grid/axis 스타일링 (개별 차트용) | `grid`, `axis`, `axisText`, `cursor`, `bgFill` |
| `compound/Chart/index.tsx` | primary/secondary 색상 팔레트 | `primary`, `secondary`, `success`, `warning`, `danger`, `info`, `palette` |

향후 단일 테마 파일로 통합 필요.

---

## 4. 차트 컴포넌트 (`components/charts/`)

### 4.0 차트 테마 (`chart-theme.ts`)

```typescript
export const CHART_COLORS = {
  /** CartesianGrid stroke */
  grid: '#e2e8f0',
  /** XAxis / YAxis stroke */
  axis: '#94a3b8',
  /** Axis tick & label fill */
  axisText: '#64748b',
  /** Tooltip cursor / hover background */
  cursor: '#f1f5f9',
  /** RadialBar / gauge background fill */
  bgFill: '#f1f5f9',
} as const;

export const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderColor: '#e2e8f0',
  color: '#1e293b',
  borderRadius: '8px',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
};
```

- 9개 차트 컴포넌트에서 import하여 일관된 스타일 유지
- 라이트 테마 전용 (다크 모드 미지원)

---

### 4.1 RealtimeTrafficChart

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/charts/RealtimeTrafficChart.tsx` |
| 렌더링 모드 | Client Component |
| Recharts 컴포넌트 | AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer |
| 의존성 | `chart-theme.ts` |

```typescript
interface TrafficData {
  hour: string;
  request_count: number;
  success_count: number;
  fail_count: number;
  total_tokens: number;
  avg_tokens: number;
}

interface RealtimeTrafficChartProps {
  data: TrafficData[];
  title?: string;  // 기본값: '실시간 트래픽'
}
```

- 시간순 자동 정렬 (오래된 것부터)
- 요청 수(blue) + 실패 수(rose) 두 개의 Area 영역
- 그래디언트 fill 적용

---

### 4.2 CostTrendChart

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/charts/CostTrendChart.tsx` |
| 렌더링 모드 | Client Component |
| Recharts 컴포넌트 | ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer |
| 의존성 | `chart-theme.ts` |

```typescript
interface CostData {
  date: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  input_cost: number;
  output_cost: number;
  total_cost: number;
}

interface CostTrendChartProps {
  data: CostData[];
  title?: string;  // 기본값: '일별 비용 트렌드'
}
```

- 날짜순 자동 정렬
- 입력/출력 비용: 스택 Bar (좌축, $)
- 총 토큰: Line (우축, K단위)
- 헤더에 30일 총 비용 표시

---

### 4.3 ErrorGauge

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/charts/ErrorGauge.tsx` |
| 렌더링 모드 | Client Component |
| Recharts 컴포넌트 | RadialBarChart, RadialBar, ResponsiveContainer |
| 의존성 | `chart-theme.ts` (bgFill만) |

```typescript
interface ErrorGaugeProps {
  errorRate: number;
  threshold?: number;  // 기본값: 1
  title?: string;      // 기본값: '에러율'
}
```

- 반원형 게이지 (startAngle=180, endAngle=0)
- 임계값 초과 시 빨간색, 이하 시 초록색
- 중앙에 성공률 텍스트 오버레이

---

### 4.4 TenantPieChart

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/charts/TenantPieChart.tsx` |
| 렌더링 모드 | Client Component |
| Recharts 컴포넌트 | PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend |
| 의존성 | `chart-theme.ts` (TOOLTIP_STYLE만) |

```typescript
interface TenantData {
  tenant_id: string;
  total_tokens: number;
  request_count: number;
}

interface TenantPieChartProps {
  data: TenantData[];
  title?: string;                            // 기본값: '테넌트별 사용량'
  dataKey?: 'total_tokens' | 'request_count'; // 기본값: 'total_tokens'
}
```

- 도넛 차트 (innerRadius=60, outerRadius=100)
- 7색 팔레트 순환
- 하단에 총합 요약

---

### 4.5 TokenScatterPlot

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/charts/TokenScatterPlot.tsx` |
| 렌더링 모드 | Client Component |
| Recharts 컴포넌트 | ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ZAxis, ResponsiveContainer |
| 의존성 | `chart-theme.ts` |

```typescript
interface TokenData {
  tenant_id: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  efficiency_ratio: number;
  success: boolean;
}

interface TokenScatterPlotProps {
  data: TokenData[];
  title?: string;  // 기본값: '토큰 효율성 분석'
}
```

- 테넌트별 색상 그룹화 (ibks=blue, default=green)
- ZAxis로 total_tokens 기반 점 크기 조절
- 헤더에 평균 효율성 비율 표시

---

### 4.6 TokenEfficiencyTrendChart

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/charts/TokenEfficiencyTrendChart.tsx` |
| 렌더링 모드 | Client Component |
| Recharts 컴포넌트 | ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer |
| 의존성 | `chart-theme.ts` |

```typescript
interface EfficiencyTrendData {
  date: string;
  avg_efficiency_ratio: number;
  min_efficiency_ratio: number;
  max_efficiency_ratio: number;
  total_requests: number;
  avg_input_tokens: number;
  avg_output_tokens: number;
}

interface TokenEfficiencyTrendChartProps {
  data: EfficiencyTrendData[];
  title?: string;  // 기본값: '토큰 효율성 트렌드'
}
```

- 날짜순 자동 정렬
- 최소-최대 영역: Area (반투명 blue)
- 평균 라인: Line (green, dot 표시)
- 최소/최대 라인: Line (점선)

---

### 4.7 QueryResponseScatterPlot

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/charts/QueryResponseScatterPlot.tsx` |
| 렌더링 모드 | Client Component |
| Recharts 컴포넌트 | ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ZAxis, Legend, ResponsiveContainer |
| 의존성 | `chart-theme.ts`, Modal (`ui/`), MarkdownViewer (`markdown/`) |
| **교차 레이어 의존** | Layer 3 -> Layer 1 (Modal), Layer 4 (MarkdownViewer) |

```typescript
interface CorrelationData {
  tenant_id: string;
  query_length: number;
  response_length: number;
  input_tokens: number;
  output_tokens: number;
  efficiency_ratio: number;
  timestamp: string;
  user_input?: string;
  llm_response?: string;
}

interface QueryResponseScatterPlotProps {
  data: CorrelationData[];
  title?: string;  // 기본값: '질문-응답 길이 상관관계'
}
```

- 내부 상태: `selectedItem` (모달 표시용)
- 효율성 기준 3그룹 색상: high(green, 2x+), normal(blue, 0.5-2x), low(red, <0.5x)
- 피어슨 상관계수 실시간 계산
- 점 클릭 시 모달로 상세 질문/응답 표시 (MarkdownViewer로 LLM 응답 렌더링)
- ZAxis로 효율성 비율 기반 점 크기 조절

---

### 4.8 UsageHeatmap

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/charts/UsageHeatmap.tsx` |
| 렌더링 모드 | Client Component |
| Recharts 컴포넌트 | **없음** (recharts 미사용) |
| 의존성 | 없음 |

```typescript
interface HeatmapData {
  day_of_week: number;
  hour: number;
  request_count: number;
  avg_tokens: number;
}

interface UsageHeatmapProps {
  data: HeatmapData[];
  title?: string;  // 기본값: '시간대별 사용량 히트맵'
}
```

- **순수 CSS 히트맵** -- recharts 미사용으로 경량
- 7(요일) x 24(시간) 그리드
- 요소당 5단계 blue 강도 색상
- hover 시 상세 정보 title 속성

---

### 4.9 RepeatedQueriesTable

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/charts/RepeatedQueriesTable.tsx` |
| 렌더링 모드 | Client Component |
| 의존성 | lucide-react (`MessageSquare`, `Users`, `TrendingUp`, `Clock`) |

```typescript
interface RepeatedQueryData {
  query_pattern: string;
  occurrence_count: number;
  unique_tenants: number;
  avg_response_length: number;
  avg_output_tokens: number;
  first_seen: string;
  last_seen: string;
}

interface RepeatedQueriesTableProps {
  data: RepeatedQueryData[];
  title?: string;  // 기본값: '반복 질문 패턴 (FAQ 후보)'
}
```

- 자체 정렬/확장 구현 -- compound DataTable **미사용**
- 내부 상태: `expandedRow`
- 행 클릭 시 질문 전문 확장

---

### 4.10 UserRequestsBarChart

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/charts/UserRequestsBarChart.tsx` |
| 렌더링 모드 | Client Component |
| Recharts 컴포넌트 | BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer |
| 의존성 | `@ola/shared-types` (`UserRequestCount`), `chart-theme.ts` |

```typescript
interface UserRequestsBarChartProps {
  data: UserRequestCount[];  // from @ola/shared-types
  title?: string;            // 기본값: '유저별 요청 수'
  maxDisplay?: number;       // 기본값: 10
}
```

- 수평 BarChart (layout="vertical")
- 성공률 기반 색상: 95%+(green), 80-95%(amber), 80% 미만(red)
- userId 자동 truncate (12자)
- 상단에 총 유저 수 + 총 요청 수 표시

---

### 4.11 UserTokensPieChart

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/charts/UserTokensPieChart.tsx` |
| 렌더링 모드 | Client Component |
| Recharts 컴포넌트 | PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend |
| 의존성 | `@ola/shared-types` (`UserTokenUsage`), `chart-theme.ts` (TOOLTIP_STYLE) |

```typescript
interface UserTokensPieChartProps {
  data: UserTokenUsage[];  // from @ola/shared-types
  title?: string;          // 기본값: '유저별 토큰 사용량'
  maxDisplay?: number;     // 기본값: 8
}
```

- 내부 상태: `tokenType` (`'totalTokens' | 'inputTokens' | 'outputTokens'`)
- 토큰 타입 셀렉터 버튼 그룹
- Top N + "기타" 그룹핑
- 도넛 차트 (innerRadius=60, outerRadius=100)

---

### 4.12 UserListTable

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/charts/UserListTable.tsx` |
| 렌더링 모드 | Client Component |
| 의존성 | lucide-react (8종), `@ola/shared-types` (`UserListItem`), `next/navigation` (`useRouter`) |

```typescript
interface UserListTableProps {
  data: UserListItem[];  // from @ola/shared-types
  title?: string;        // 기본값: '유저 목록'
  onUserClick?: (userId: string) => void;
}
```

- **자체 검색/정렬/페이지네이션 구현** -- compound DataTable **미사용**
- 내부 상태: `searchTerm`, `sortField`, `sortDirection`, `currentPage`
- 정렬 필드: questionCount, successRate, totalTokens, avgTokens, errorCount, lastActivity
- 페이지 크기 고정 20건
- `useMemo`로 filtered + sorted data 메모이제이션
- "프로필 보기" 버튼으로 `/dashboard/user-analytics/{userId}`로 네비게이션

---

### 4.13 UserPatternsTable

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/charts/UserPatternsTable.tsx` |
| 렌더링 모드 | Client Component |
| 의존성 | lucide-react (5종), `@ola/shared-types` (`UserQuestionPattern`) |

```typescript
interface UserPatternsTableProps {
  data: UserQuestionPattern[];  // from @ola/shared-types
  title?: string;               // 기본값: '유저별 자주 묻는 질문'
  maxDisplay?: number;           // 기본값: 30
}
```

- **자체 확장/필터 구현** -- compound DataTable **미사용**
- 내부 상태: `expandedRow`, `filterUserId`
- 행 클릭 시 전체 질문/유저ID 확장 표시
- 유저 ID 필터링 (검색)

---

### 4.14 ProblematicChatTable

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/charts/ProblematicChatTable.tsx` |
| 렌더링 모드 | Client Component |
| 의존성 | lucide-react (6종), `@ola/shared-types` (`ProblematicChat`, `ProblematicChatRule`, `getFieldDefinition`, `isCompoundConfig`) |

```typescript
interface ProblematicChatTableProps {
  data: ProblematicChat[];
  rules: ProblematicChatRule[];
  title?: string;                          // 기본값: '문제 채팅 목록'
  onViewDetail: (chat: ProblematicChat) => void;
  loading?: boolean;                       // 기본값: false
}
```

- **자체 정렬 구현** -- compound DataTable **미사용**
- 내부 상태: `sortField`, `sortDirection`
- 매칭된 규칙명 표시
- "상세보기" 버튼으로 `onViewDetail` 콜백

---

### 4.15 ProblematicChatDialog

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/charts/ProblematicChatDialog.tsx` |
| 렌더링 모드 | Client Component |
| 의존성 | lucide-react (6종), `@ola/shared-types` (`ProblematicChat`, `ProblematicChatRule`, `getFieldDefinition`, `getOperatorDefinition`, `isCompoundConfig`) |

```typescript
interface ProblematicChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  chat: ProblematicChat | null;
  rules: ProblematicChatRule[];
}
```

- `!isOpen || !chat` 시 early return
- 키워드 하이라이팅 구현 (매칭된 규칙의 키워드를 텍스트 내에서 강조)
- 규칙 매칭 상세 정보 표시

---

### 4.16 UserActivityDialog

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/charts/UserActivityDialog.tsx` |
| 렌더링 모드 | Client Component |
| 의존성 | lucide-react (11종), `@ola/shared-types` (`UserActivityDetail`, `UserListItem`), `services/userAnalyticsService` |

```typescript
interface UserActivityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userInfo?: UserListItem;
  projectId: string;
}
```

- **경고**: 내부 데이터 패칭 -- `fetchUserActivity()` in `useEffect`
- React Query **미사용** -- 캐싱/중복제거 없음
- 내부 상태: `activities`, `loading`, `error`, `expandedIdx`, `currentPage`, `period`
- 기간 필터: 1일, 7일, 30일

---

## 5. KPI 컴포넌트 (`components/kpi/`)

### 5.1 KPICard

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/kpi/KPICard.tsx` |
| 렌더링 모드 | Client Component (`'use client'`) |
| 주요 의존성 | lucide-react (`TrendingUp`, `TrendingDown`, `Minus`) |
| 상태 관리 | 없음 (stateless) |
| 사용 위치 | Dashboard.KPISection 내부 |

```typescript
export interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    label: string;
  };
  status?: 'success' | 'warning' | 'error' | 'neutral';
  icon?: React.ReactNode;
  format?: 'number' | 'percentage' | 'currency' | 'tokens';
}
```

- `format`별 값 포매팅:
  - `number`: `toLocaleString()`
  - `percentage`: `{value.toFixed(2)}%`
  - `currency`: `${value.toFixed(2)}`
  - `tokens`: 1M+, 1K+ 단축 표기
- `trend.value`에 따른 방향 아이콘 및 색상 (양수=green, 음수=red, 0=gray)
- `status`에 따른 value 색상 (success=emerald, warning=yellow, error=rose, neutral=gray)

**성능 참고**: 이벤트 핸들러 없는 stateless 컴포넌트 -- Server Component 전환 후보

---

## 6. 챗봇 컴포넌트 (`components/chatbot/`)

Barrel export: `chatbot/index.ts`

### 6.1 FloatingChatbot

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/chatbot/FloatingChatbot.tsx` |
| 렌더링 모드 | Client Component |
| Props | 없음 (Context 기반: `useChatbot()`) |
| 의존성 | `ChatbotContext`, `ChatWindow` |

- `Ctrl+K` / `Cmd+K` 키보드 단축키 핸들러 (useEffect)
- 하단 우측 고정 버튼 (`fixed bottom-6 right-6 z-50`)
- `isOpen` 시 ChatWindow 렌더링
- 미읽은 메시지 뱃지 표시

---

### 6.2 ChatWindow

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/chatbot/ChatWindow.tsx` |
| 렌더링 모드 | Client Component |
| Props | 없음 (Context 기반: `useChatbot()`) |
| 의존성 | `ChatbotContext`, `ChatMessage`, `ChatInput` |

- Draggable + Resizable 윈도우 (마우스 이벤트 리스너)
- 내부 상태: `position`, `size`, `isDragging`, `isResizing`
- 페이지별 예시 질문 표시 (`PAGE_EXAMPLES` 매핑)
- 메시지 자동 스크롤

---

### 6.3 ChatMessage

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/chatbot/ChatMessage.tsx` |
| 렌더링 모드 | Client Component |
| 의존성 | `@ola/shared-types` (`ChatbotMessage`), `MarkdownViewer` |

```typescript
interface ChatMessageProps {
  message: ChatbotMessage;  // { role: 'user'|'assistant', content: string, metadata? }
}
```

- user 메시지: 우측 정렬, blue 배경, 텍스트 직접 표시
- assistant 메시지: 좌측 정렬, gray 배경, MarkdownViewer로 렌더링
- metadata 표시: 모델명, 지연시간(s), 토큰 수

---

### 6.4 ChatInput

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/chatbot/ChatInput.tsx` |
| 렌더링 모드 | Client Component |
| 의존성 | 없음 |

```typescript
interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;      // 기본값: false
  placeholder?: string;    // 기본값: 'Type a message...'
}
```

- Auto-resize textarea (useRef + useEffect, max 120px)
- Enter로 전송, Shift+Enter로 줄바꿈
- `disabled` 시 스피너 아이콘 표시
- 전송 후 자동 클리어 + 높이 리셋

---

## 7. 분석 컴포넌트 (`components/analysis/`)

### 7.1 ChatInterface

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/analysis/ChatInterface.tsx` |
| 렌더링 모드 | Client Component |
| 의존성 | `@ola/shared-types` (`AnalysisSession`, `AnalysisMessage`, `SendMessageRequest`), `MessageBubble` |

```typescript
interface ChatInterfaceProps {
  session: AnalysisSession | null;
  onSendMessage: (request: SendMessageRequest) => Promise<void>;
  loading?: boolean;  // 기본값: false
}
```

- 내부 상태: `input`, `includeMetrics` (체크박스), `sending` (플래그)
- 새 메시지 수신 시 자동 스크롤 (messagesEndRef)
- 세션 변경 시 입력 필드 자동 포커스
- textarea 기반 입력 (Enter 전송, Shift+Enter 줄바꿈)

---

### 7.2 MessageBubble

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/analysis/MessageBubble.tsx` |
| 렌더링 모드 | Client Component |
| 의존성 | `@ola/shared-types` (`AnalysisMessage`), `MarkdownViewer` |

```typescript
interface MessageBubbleProps {
  message: AnalysisMessage;
}
```

- Copy-to-clipboard 기능 (navigator.clipboard API)
- 내부 상태: `copied` (2초 타이머)
- user 메시지: 우측 blue, assistant 메시지: 좌측 gray + MarkdownViewer

---

### 7.3 SessionList

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/analysis/SessionList.tsx` |
| 렌더링 모드 | Client Component |
| 의존성 | `@ola/shared-types` (`AnalysisSession`) |

```typescript
interface SessionListProps {
  sessions: AnalysisSession[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  loading?: boolean;  // 기본값: false
}
```

- 내부 상태: `deleteConfirm` (이중 클릭 삭제 패턴)
- 활성 세션 하이라이팅

---

### 7.4 MetricsContext

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/analysis/MetricsContext.tsx` |
| 렌더링 모드 | Client Component |
| 의존성 | `@ola/shared-types` (`RealtimeKPI`, `TenantUsage`, `CostTrend`) |

```typescript
interface MetricsContextProps {
  isVisible: boolean;
  onToggle: () => void;
}
```

- **주의**: 이름이 "MetricsContext"이지만 React Context가 **아님** -- 사이드바 패널 컴포넌트
- **경고**: 내부 데이터 패칭 -- `fetch()` in `useEffect` (React Query 미사용)
- 내부 상태: `kpi`, `topTenants`, `costData`, `loading`
- `isVisible` 전환 시 `/api/metrics/*` 직접 호출

---

## 8. FAQ 분석 컴포넌트 (`components/faq-analysis/`)

### 8.1 FAQAnalysisSection

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/faq-analysis/FAQAnalysisSection.tsx` |
| 렌더링 모드 | Client Component |
| Props | 없음 (self-contained) |
| 의존성 | lucide-react (4종), `FAQClusterCard`, `services/faqAnalysisService` |

- **경고**: 내부 데이터 패칭 -- `runFAQAnalysis()`, `getFAQTenants()` 직접 호출 (React Query 미사용)
- 내부 상태: `isLoading`, `error`, `result`, `tenants`, `periodDays`, `topN`, `tenantId`
- 필터: 기간(7/14/30일), TopN(10/20/50), 테넌트 선택

---

### 8.2 FAQClusterCard

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/faq-analysis/FAQClusterCard.tsx` |
| 렌더링 모드 | Client Component |
| 의존성 | lucide-react (3종), `services/faqAnalysisService` (`FAQCluster`) |

```typescript
interface FAQClusterCardProps {
  cluster: FAQCluster;
  rank: number;
}
```

- Expandable 카드 (3개까지 미리보기, 이후 확장)
- 내부 상태: `isExpanded`
- 순위 뱃지 표시

---

## 9. 세션 분석 컴포넌트 (`components/session-analysis/`)

### 9.1 SessionTimelineModal

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/session-analysis/SessionTimelineModal.tsx` |
| 렌더링 모드 | Client Component |
| 의존성 | lucide-react (8종), `services/sessionAnalysisService` |

```typescript
interface SessionTimelineModalProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
}
```

- **경고**: 내부 데이터 패칭 -- `sessionAnalysisApi.getTimeline()`, `analyzeWithLLM()` 직접 호출 (React Query 미사용)
- 타임라인 표시 + LLM 심층 분석 트리거

---

## 10. 사용자 프로파일링 컴포넌트 (`components/user-profiling/`)

Barrel export: `user-profiling/index.ts`

세 컴포넌트 모두 Client Component, stateless, 내부 데이터 패칭 없음.

### 10.1 UserProfileSummary

```typescript
interface Props {
  profile: UserProfileSummaryType;  // from services/userProfilingService
}
```

- 기본 통계 표시: 총 대화 수, 활동 기간, 첫/마지막 활동

---

### 10.2 SentimentIndicator

```typescript
interface Props {
  sentiment: SentimentAnalysisResult;  // from services/userProfilingService
}
```

- 감정 분석 결과 시각화
- 트렌드 방향 아이콘: increasing, decreasing, stable

---

### 10.3 CategoryDistribution

```typescript
interface Props {
  topCategories: TopCategory[];  // from services/userProfilingService
}
```

- 카테고리별 비율 바 차트 (8색 팔레트)

---

## 11. 마크다운 컴포넌트 (`components/markdown/`)

Barrel export: `markdown/index.ts`

### 11.1 MarkdownViewer

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/markdown/MarkdownViewer.tsx` |
| 렌더링 모드 | Client Component |
| 주요 의존성 | react-markdown, remark-gfm, rehype-highlight, lucide-react (`Check`, `Copy`, `ExternalLink`) |
| 사용 위치 | ChatMessage, MessageBubble, QueryResponseScatterPlot 모달 |

```typescript
interface MarkdownViewerProps {
  content: string;
  className?: string;        // 기본값: ''
  size?: 'sm' | 'base';     // 기본값: 'base'
  enableCodeCopy?: boolean;  // 기본값: true
}
```

- `size`별 텍스트 크기/여백 프리셋 (sm: 채팅 버블용, base: 콘텐츠 영역용)
- `useMemo`로 `components` 오브젝트 메모이제이션 (rerender-memo 준수)
- 코드 블록 copy 버튼 (`CopyButton` 내부 컴포넌트)
- GFM 지원: 테이블, 체크박스, 취소선
- 외부 링크 자동 탐지 + ExternalLink 아이콘

**번들 우려**: react-markdown (~30KB) + remark-gfm (~10KB) + rehype-highlight (~10KB + highlight.js 언어팩) = 약 50KB+
-> `next/dynamic` import 후보 (bundle-dynamic-imports)

---

## 12. 레이아웃 및 레거시 컴포넌트

### 12.1 LayoutContent

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/LayoutContent.tsx` |
| 렌더링 모드 | Client Component (`'use client'`) |
| Props | `{ children: ReactNode }` |
| 의존성 | `next/navigation` (`usePathname`), `Sidebar`, `FloatingChatbot` |

- 루트 레이아웃 셸
- `pathname === '/login'` 시 사이드바/챗봇 숨김
- `flex h-screen` 기반 레이아웃

---

### 12.2 Sidebar

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/Sidebar.tsx` |
| 렌더링 모드 | Client Component |
| Props | 없음 |
| 의존성 | `next/navigation` (`usePathname`), `contexts/AuthContext` |

- **참고**: 인라인 SVG 아이콘 약 15개 사용 (lucide-react와 불일치)
- 현재 경로 기반 활성 메뉴 하이라이팅

---

### 12.3 Dashboard (레거시)

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/Dashboard.tsx` |
| 렌더링 모드 | Client Component |
| 의존성 | recharts, `@/types` (`MetricData`), `chart-theme.ts` |

```typescript
interface DashboardProps {
  metrics: MetricData[];
}
```

- **레거시**: compound Dashboard 도입 이전의 원본
- 현재 사용 여부 확인 필요 -- compound Dashboard로 대체 진행 중

---

### 12.4 LogExplorer

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/LogExplorer.tsx` |
| 렌더링 모드 | Client Component |
| 의존성 | `@/types` (`B2BLog`, `LogLevel`), `services/geminiService` |

```typescript
interface LogExplorerProps {
  logs: B2BLog[];
}
```

- **경고**: 내부 데이터 패칭 -- `analyzeLogs()` 직접 호출 (React Query 미사용)
- 내부 상태: `filter`, `isAnalyzing`, `aiAnalysis`

---

### 12.5 ArchitectureView

| 항목 | 값 |
|------|-----|
| 파일 경로 | `components/ArchitectureView.tsx` |
| 렌더링 모드 | **Server Component** (`'use client'` 없음) |
| Props | 없음 |
| 의존성 | 없음 |

- 순수 정적 콘텐츠 (시스템 아키텍처 다이어그램)
- 이벤트 핸들러/상태 없음

---

## 13. 데이터 패칭 훅 (`hooks/queries/`)

### 13.1 Query Key 체계

```typescript
// Metrics
metricsKeys.all                           -> ['metrics']
metricsKeys.realtime(projectId)           -> ['metrics', 'realtime', projectId]
metricsKeys.hourly(projectId)             -> ['metrics', 'hourly', projectId]
metricsKeys.daily(projectId, days?)       -> ['metrics', 'daily', projectId, { days }]
metricsKeys.tenantUsage(projectId, days?) -> ['metrics', 'tenant-usage', projectId, { days }]
metricsKeys.costTrend(projectId, days?)   -> ['metrics', 'cost-trend', projectId, { days }]
metricsKeys.heatmap(projectId, days?)     -> ['metrics', 'heatmap', projectId, { days }]
metricsKeys.errors(projectId)             -> ['metrics', 'errors', projectId]
metricsKeys.anomaly(projectId)            -> ['metrics', 'anomaly', projectId]

// Admin
adminKeys.all       -> ['admin']
adminKeys.users()   -> ['admin', 'users']
adminKeys.user(id)  -> ['admin', 'users', id]
adminKeys.roles()   -> ['admin', 'roles']
adminKeys.role(id)  -> ['admin', 'roles', id]
adminKeys.filters() -> ['admin', 'filters']
adminKeys.filter(id)-> ['admin', 'filters', id]
adminKeys.sessions()-> ['admin', 'analysis', 'sessions']
adminKeys.session(id)-> ['admin', 'analysis', 'sessions', id]

// Quality
qualityKeys.all                                   -> ['quality']
qualityKeys.efficiencyTrend(projectId, days)      -> ['quality', 'efficiency-trend', projectId, { days }]
qualityKeys.queryResponseCorrelation(projectId, days) -> ['quality', 'correlation', projectId, { days }]
qualityKeys.repeatedPatterns(projectId, days)     -> ['quality', 'repeated', projectId, { days }]

// User Analytics
userAnalyticsKeys.all                             -> ['user-analytics']
userAnalyticsKeys.userList(projectId, days)       -> ['user-analytics', 'users', projectId, { days }]
userAnalyticsKeys.userPatterns(projectId, days)   -> ['user-analytics', 'patterns', projectId, { days }]
userAnalyticsKeys.problematicRules(projectId)     -> ['user-analytics', 'problematic-rules', projectId]
userAnalyticsKeys.problematicChats(projectId, ...) -> ['user-analytics', 'problematic-chats', projectId, ...]
userAnalyticsKeys.problematicStats(projectId)     -> ['user-analytics', 'problematic-stats', projectId]

// Batch Schedules
batchScheduleKeys.all         -> ['batch-schedules']
batchScheduleKeys.schedules() -> ['batch-schedules', 'list']
batchScheduleKeys.templates() -> ['batch-schedules', 'templates']
batchScheduleKeys.tenants()   -> ['batch-schedules', 'tenants']

// Report Monitoring
reportMonitoringKeys.all        -> ['report-monitoring']
reportMonitoringKeys.health()   -> ['report-monitoring', 'health']
reportMonitoringKeys.result(id) -> ['report-monitoring', 'result', id]

// ETL
etlKeys.all                     -> ['etl']
etlKeys.wind.*                  -> ['etl', 'wind', ...]
etlKeys.minkabu.*               -> ['etl', 'minkabu', ...]
```

---

### 13.2 Metrics 훅

| Hook | Return Type | Cache Tier | Auto-Refetch |
|------|-----------|------------|-------------|
| `useRealtimeKPI` | `RealtimeKPI` | SHORT (5분) | `refetchInterval: 5분` |
| `useHourlyTraffic` | `HourlyTraffic[]` | MEDIUM | - |
| `useDailyTraffic` | `DailyTraffic[]` | MEDIUM | - |
| `useTenantUsage` | `TenantUsage[]` | MEDIUM | - |
| `useCostTrend` | `CostTrend[]` | MEDIUM | - |
| `useHeatmap` | `UsageHeatmapCell[]` | MEDIUM | - |
| `useErrorAnalysis` | `ErrorAnalysis[]` | SHORT | - |
| `useAnomalyStats` | `AnomalyStats[]` | SHORT | - |
| `useTokenEfficiency` | `TokenEfficiencyData[]` | SHORT | - |

---

### 13.3 Dashboard Composite 훅

복합 훅 -- 여러 개별 훅을 조합하여 페이지별 데이터 + 계산된 KPI를 반환.

| Hook | 조합 대상 | 계산 KPI |
|------|----------|---------|
| `useBusinessDashboard(projectId, days)` | tenantUsage + costTrend + heatmap | totalTokens, totalRequests, totalCost, tenantCount |
| `useOperationsDashboard(projectId, days)` | realtimeKPI + hourlyTraffic + errors | totalRequests, successRate, errorRate, avgTokens, activeTenants |
| `useAIPerformanceDashboard(projectId, days)` | anomalyStats + tokenEfficiency + tenantUsage | tenantsWithAnomalies 등 |

---

### 13.4 Admin 훅

| Resource | Query 훅 | Mutation 훅 |
|----------|---------|------------|
| Users | `useUsers()`, `useUser(id)` | `useCreateUser`, `useUpdateUser`, `useDeleteUser` |
| Roles | `useRoles()`, `useRole(id)` | `useCreateRole`, `useUpdateRole`, `useDeleteRole` |
| Filters | `useFilters()`, `useFilter(id)` | `useCreateFilter`, `useUpdateFilter`, `useDeleteFilter`, `useSetDefaultFilter` |
| Analysis | `useAnalysisSessions()`, `useAnalysisSession(id)` | `useCreateAnalysisSession`, `useSendAnalysisMessage`, `useDeleteAnalysisSession` |

---

### 13.5 기타 훅

**Quality:**
- `useEfficiencyTrend(projectId, days)`
- `useQueryResponseCorrelation(projectId, days)`
- `useRepeatedPatterns(projectId, days)`
- `useQualityDashboard(projectId, days)` (composite)

**ETL:**
- Wind: `useWindSummary`, `useWindRecentRuns`, `useWindDailyTrend`, `useWindFileStats`, `useWindErrors`, `useWindHealth`, `useWindETLDashboard` (composite)
- Minkabu: `useMinkabuSummary`, `useMinkabuRecentRuns`, `useMinkabuDailyTrend`, `useMinkabuHeadlineStats`, `useMinkabuErrors`, `useMinkabuHealth`, `useMinkabuETLDashboard` (composite)

**Batch Schedules:**
- `useSchedules()`, `useScheduleTemplates()`, `useScheduleTenants()`
- Mutations: `useCreateSchedule`, `useUpdateSchedule`, `useDeleteSchedule`, `useToggleSchedule`

**Report Monitoring:**
- `useReportMonitoringHealth()`, `useReportMonitoringResult(id)`
- `useRunReportCheck()` (mutation)

**User Analytics:**
- `useUserList(projectId, days)`, `useUserPatterns(projectId, days)`
- `useProblematicRules(projectId)`, `useProblematicChats(projectId, ...)`, `useProblematicStats(projectId)`
- `useUserAnalyticsDashboard(projectId, days)` (composite)

---

## 14. Context Providers

### 14.1 AuthContext

| 항목 | 값 |
|------|-----|
| 파일 경로 | `contexts/AuthContext.tsx` |
| 렌더링 모드 | Client Component |

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

- Access token: 메모리 저장 (변수, 15분 만료)
- Refresh token: httpOnly 쿠키 (7일 만료)
- 마운트 시 `authApi.refresh()` 호출로 세션 복원 시도
- `api-client.ts`와 `setAccessToken()` / `setOnAuthError()` 콜백으로 동기화
- 401 에러 시 자동 로그아웃

---

### 14.2 ChatbotContext

| 항목 | 값 |
|------|-----|
| 파일 경로 | `contexts/ChatbotContext.tsx` |
| 렌더링 모드 | Client Component |

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

- `Ctrl+K` 단축키 토글은 `FloatingChatbot`에서 처리
- `usePathname()`으로 현재 페이지 컨텍스트 추적
- Direct API 호출 (`apiClient.post('/api/chatbot/chat')`) -- React Query **미사용**
- 세션 ID 자동 관리 (첫 메시지에서 서버 응답으로 수신)

---

## 15. Vercel React Best Practices 감사

### 15.1 CRITICAL 이슈

#### [bundle-dynamic-imports] recharts Dynamic Import 미적용

- **현황**: recharts (~200KB gzipped)가 10개 차트 컴포넌트에 정적 import
- **영향**: 초기 번들 크기 증가, 차트가 없는 페이지에서도 로드됨
- **권장**: `next/dynamic`으로 차트 컴포넌트 래핑

```tsx
const CostTrendChart = dynamic(
  () => import('@/components/charts/CostTrendChart'),
  { loading: () => <Chart.Loading />, ssr: false }
);
```

#### [bundle-barrel-imports] Barrel File 최적화 필요

- **현황**: `chatbot/index.ts`, `compound/index.ts`, `markdown/index.ts`, `user-profiling/index.ts`에 barrel 파일 존재
- **영향**: Tree-shaking 방해 가능성 (200-800ms import cost 보고됨)
- **권장**: 직접 파일 import 또는 barrel file에서 re-export 최소화

#### [bundle-defer-third-party] react-markdown Deferred Loading

- **현황**: react-markdown + remark-gfm + rehype-highlight (~50KB) 정적 import
- **권장**: MarkdownViewer를 dynamic import로 전환

---

### 15.2 HIGH 이슈

#### [server-serialization] 과도한 Client Component 사용

- **현황**: 42개 컴포넌트 중 38개가 Client Component (Server Component은 StatusBadge, EmptyState, StatsFooter, ArchitectureView의 4개뿐)
- **영향**: 불필요한 JS 번들 전송
- **Server Component 전환 후보**:
  - KPICard -- 이벤트 핸들러 없는 stateless 컴포넌트
  - 모든 stateless 차트 wrapper (title + ResponsiveContainer만 제공하는 경우)

#### [client-swr-dedup] 비일관적 데이터 패칭

- **현황**: 5개 컴포넌트가 내부에서 직접 fetch/service 호출

| 컴포넌트 | 패칭 방식 |
|----------|----------|
| MetricsContext | `fetch()` in useEffect |
| UserActivityDialog | `fetchUserActivity()` in useEffect |
| FAQAnalysisSection | `runFAQAnalysis()` 직접 호출 |
| SessionTimelineModal | `sessionAnalysisApi` 직접 호출 |
| LogExplorer | `analyzeLogs()` 직접 호출 |

- **영향**: 캐싱/중복제거 없음, 로딩/에러 처리 불일관
- **권장**: React Query 훅으로 마이그레이션

---

### 15.3 MEDIUM 이슈

#### [rerender-memo] 독립 테이블 컴포넌트 중복

- **현황**: UserListTable, RepeatedQueriesTable, UserPatternsTable, ProblematicChatTable이 각각 자체 정렬/검색/페이지네이션 구현
- **영향**: 코드 중복 (4곳에서 동일 패턴 반복), UX 불일관
- **권장**: compound DataTable로 마이그레이션

#### [rendering-hoist-jsx] 정적 JSX 추출

- **현황**: Sidebar에 인라인 SVG 아이콘 약 15개
- **권장**: lucide-react 아이콘으로 통일하거나 정적 요소를 컴포넌트 외부로 추출

---

### 15.4 개선 완료 항목

| 항목 | 컴포넌트 | Best Practice |
|------|---------|--------------|
| DateRangeFilter | `useCallback`/`useRef` 메모이제이션 | rerender-functional-setstate |
| DataTable | `useMemo` 필터링/정렬/페이지네이션 | rerender-memo |
| MarkdownViewer | `useMemo` on components object | rerender-memo |
| React Query 훅 | 계층적 query key 자동 중복제거 | client-swr-dedup |

---

## 16. 의존성 맵

### 16.1 외부 라이브러리 의존성

| Library | Size (approx) | Used By | Concern |
|---------|---------------|---------|---------|
| recharts | ~200KB gz | 10 chart components | Dynamic import 권장 |
| react-markdown | ~30KB | MarkdownViewer -> 3+ consumers | Dynamic import 권장 |
| remark-gfm | ~10KB | MarkdownViewer | 번들 포함 |
| rehype-highlight | ~10KB+ | MarkdownViewer | highlight.js 언어팩 포함 |
| lucide-react | tree-shakeable | 20+ components | OK -- tree-shaking 지원 |
| @ola/shared-types | minimal | 8+ components | Type-only import, OK |
| @tanstack/react-query | ~40KB | hooks/queries/* | 코어 의존성, OK |

---

### 16.2 내부 컴포넌트 의존성 (Cross-Layer)

```
QueryResponseScatterPlot (Layer 3)
  -> Modal (Layer 1 - ui/)
  -> MarkdownViewer (Layer 4 - markdown/)

ChatMessage (Layer 4 - chatbot/)
  -> MarkdownViewer (Layer 4 - markdown/)

MessageBubble (Layer 4 - analysis/)
  -> MarkdownViewer (Layer 4 - markdown/)

LayoutContent (Layer 5)
  -> Sidebar (Layer 5)
  -> FloatingChatbot (Layer 4 - chatbot/)

FloatingChatbot (Layer 4 - chatbot/)
  -> ChatWindow (Layer 4 - chatbot/)
    -> ChatMessage (Layer 4 - chatbot/)
    -> ChatInput (Layer 4 - chatbot/)
```

---

### 16.3 수정 시 영향 범위

| 수정 대상 | 영향 범위 |
|-----------|----------|
| `chart-theme.ts` | RealtimeTrafficChart, CostTrendChart, ErrorGauge, TenantPieChart, TokenScatterPlot, TokenEfficiencyTrendChart, QueryResponseScatterPlot, UserRequestsBarChart, UserTokensPieChart (9개) |
| `MarkdownViewer` props 변경 | ChatMessage, MessageBubble, QueryResponseScatterPlot (3개) |
| `ChatbotContext` interface 변경 | FloatingChatbot, ChatWindow (2개) |
| `AuthContext` interface 변경 | Sidebar + 모든 인증 필요 페이지 |
| `Modal` props 변경 | QueryResponseScatterPlot + admin 페이지 직접 import 전체 |
| `@ola/shared-types` 타입 변경 | 8+ 컴포넌트 + hooks/queries 전체 |
| `compound/Dashboard` interface 변경 | 모든 dashboard 페이지 (business, operations, ai-performance, quality, etl 등) |
| `compound/DataTable` interface 변경 | admin 관리 페이지 (users, roles, filters, batch-analysis 등) |
| `KPICard` props 변경 | 모든 dashboard 페이지의 KPISection 내부 |

---

**문서 끝**
