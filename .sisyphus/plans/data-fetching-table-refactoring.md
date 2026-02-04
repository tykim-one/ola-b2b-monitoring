# 데이터 패칭 일관성 및 테이블 통합 리팩토링 계획

## 요약

**목표**: 프론트엔드 전반의 데이터 패칭 패턴을 React Query 훅 기반으로 통일하고, 4개의 독립 테이블 컴포넌트를 Compound DataTable로 마이그레이션한다.

**범위**:
- 5개 컴포넌트의 내부 `fetch()`/`useEffect` 패턴을 React Query 훅으로 교체
- 3개 신규 훅 파일 생성, 1개 기존 훅 파일 확장
- Compound DataTable에 Expandable Row 기능 추가
- 4개 독립 테이블 컴포넌트를 Compound DataTable로 마이그레이션
- MetricsContext를 MetricsSidePanel로 리네이밍

**예상 파일 변경**: 신규 4개 + 수정 12개 + 삭제 4개 = 총 20개 파일
**예상 LOC 변경**: +800 / -1,200 (순감 약 400줄)

---

## 수락 기준

1. `hooks/queries/` 디렉토리에 모든 데이터 패칭 훅이 집중되어 있을 것
2. 5개 대상 컴포넌트에서 `useEffect` + `fetch()` 패턴이 완전히 제거될 것
3. MetricsContext.tsx가 MetricsSidePanel.tsx로 리네이밍되고 훅 기반으로 동작할 것
4. Compound DataTable이 Expandable Row를 지원할 것
5. 4개 독립 테이블이 Compound DataTable로 대체되고 기존 파일이 삭제될 것
6. `pnpm build:frontend-next` 빌드가 성공할 것
7. 모든 기존 핵심 기능(데이터 표시, 검색, 페이지네이션, 확장 행, 상세 보기)이 동일하게 동작할 것. 정렬 동작은 DataTable의 3-state 패턴(asc -> desc -> none)을 따르되 기능적 퇴화 없을 것.
8. 기존 쿼리 키 컨벤션(`{ all, lists, detail }` 패턴)을 준수할 것
9. DataTable Expandable Row 추가가 기존 DataTable 소비처에 회귀를 발생시키지 않을 것

---

## Phase 1: React Query 훅 생성 및 데이터 패칭 마이그레이션

### 1.1 신규 훅 파일 생성: `use-faq-analysis.ts`

**파일**: `apps/frontend-next/src/hooks/queries/use-faq-analysis.ts`
**예상 LOC**: +65

**쿼리 키 구조**:
```typescript
export const faqAnalysisKeys = {
  all: ['faq-analysis'] as const,
  tenants: (days?: number) =>
    [...faqAnalysisKeys.all, 'tenants', { days }] as const,
};
```

**생성할 훅**:

| 훅 이름 | 종류 | 래핑 대상 | 캐시 TTL |
|---------|------|----------|---------|
| `useFAQTenants` | query | `getFAQTenants(days)` | MEDIUM (15분) |
| `useRunFAQAnalysis` | mutation | `runFAQAnalysis(request)` | - |

**인터페이스 스니펫**:
```typescript
import { useQuery, useMutation, UseQueryOptions } from '@tanstack/react-query';
import { CACHE_TIME } from '@/lib/query-client';
import {
  getFAQTenants,
  runFAQAnalysis,
  FAQAnalysisRequest,
  FAQAnalysisResponse,
} from '@/services/faqAnalysisService';

export function useFAQTenants(
  days?: number,
  options?: Omit<UseQueryOptions<string[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: faqAnalysisKeys.tenants(days),
    queryFn: () => getFAQTenants(days),
    staleTime: CACHE_TIME.MEDIUM,
    ...options,
  });
}

export function useRunFAQAnalysis() {
  return useMutation({
    mutationFn: (request: FAQAnalysisRequest) => runFAQAnalysis(request),
  });
}
```

---

### 1.2 신규 훅 파일 생성: `use-session-analysis.ts`

**파일**: `apps/frontend-next/src/hooks/queries/use-session-analysis.ts`
**예상 LOC**: +70

**쿼리 키 구조**:
```typescript
export const sessionAnalysisKeys = {
  all: ['session-analysis'] as const,
  timeline: (sessionId: string) =>
    [...sessionAnalysisKeys.all, 'timeline', sessionId] as const,
};
```

**생성할 훅**:

| 훅 이름 | 종류 | 래핑 대상 | 캐시 TTL |
|---------|------|----------|---------|
| `useSessionTimeline` | query | `sessionAnalysisApi.getTimeline(sessionId)` | SHORT (5분) |
| `useAnalyzeSessionWithLLM` | mutation | `sessionAnalysisApi.analyzeWithLLM(sessionId)` | - |

**인터페이스 스니펫**:
```typescript
import { useQuery, useMutation, UseQueryOptions } from '@tanstack/react-query';
import { CACHE_TIME } from '@/lib/query-client';
import {
  sessionAnalysisApi,
  SessionTimeline,
  LLMSessionAnalysis,
} from '@/services/sessionAnalysisService';

export function useSessionTimeline(
  sessionId: string,
  options?: Omit<UseQueryOptions<SessionTimeline>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: sessionAnalysisKeys.timeline(sessionId),
    queryFn: () => sessionAnalysisApi.getTimeline(sessionId),
    staleTime: CACHE_TIME.SHORT,
    enabled: !!sessionId,
    ...options,
  });
}

export function useAnalyzeSessionWithLLM() {
  return useMutation({
    mutationFn: (sessionId: string) => sessionAnalysisApi.analyzeWithLLM(sessionId),
  });
}
```

---

### 1.3 신규 훅 파일 생성: `use-log-analysis.ts`

**파일**: `apps/frontend-next/src/hooks/queries/use-log-analysis.ts`
**예상 LOC**: +30

**쿼리 키 구조**:
```typescript
export const logAnalysisKeys = {
  all: ['log-analysis'] as const,
};
```

**생성할 훅**:

| 훅 이름 | 종류 | 래핑 대상 | 비고 |
|---------|------|----------|------|
| `useAnalyzeLogsWithGemini` | mutation | `analyzeLogs(logs)` | Server Action 래핑 |

**인터페이스 스니펫**:
```typescript
import { useMutation } from '@tanstack/react-query';
import { analyzeLogs } from '@/services/geminiService';
import { B2BLog } from '@/types';

export function useAnalyzeLogsWithGemini() {
  return useMutation({
    mutationFn: (logs: B2BLog[]) => analyzeLogs(logs),
  });
}
```

**주의**: `geminiService`는 `"use server"` 디렉티브를 사용하는 Server Action이다. `useMutation`으로 래핑해도 Server Action 호출이 정상 동작하는지 반드시 검증해야 한다.

---

### 1.4 기존 훅 확장: `use-user-analytics.ts`에 `useUserActivity` 추가

**파일**: `apps/frontend-next/src/hooks/queries/use-user-analytics.ts`
**예상 LOC 변경**: +30

**쿼리 키 추가**:
```typescript
export const userAnalyticsKeys = {
  // ...기존 키 유지
  userActivity: (projectId: string, userId: string, days: number, page: number) =>
    [...userAnalyticsKeys.all, 'user-activity', projectId, userId, { days, page }] as const,
};
```

**추가할 훅**:
```typescript
import { fetchUserActivity } from '@/services/userAnalyticsService';
import type { UserActivityDetail } from '@ola/shared-types';

export function useUserActivity(
  projectId: string,
  userId: string,
  days: number = 7,
  page: number = 0,
  pageSize: number = 20,
  options?: Omit<UseQueryOptions<UserActivityDetail[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: userAnalyticsKeys.userActivity(projectId, userId, days, page),
    queryFn: () => fetchUserActivity(projectId, userId, days, pageSize, page * pageSize),
    staleTime: CACHE_TIME.SHORT,
    enabled: !!userId && !!projectId,
    ...options,
  });
}
```

**의존성**: `@/services/userAnalyticsService`의 `fetchUserActivity` import 추가 필요

---

### 1.5 `index.ts` 중앙 허브 업데이트

**파일**: `apps/frontend-next/src/hooks/queries/index.ts`
**예상 LOC 변경**: +25

**추가할 export 블록**:
```typescript
// FAQ Analysis Hooks
export {
  faqAnalysisKeys,
  useFAQTenants,
  useRunFAQAnalysis,
} from './use-faq-analysis';

// Session Analysis Hooks
export {
  sessionAnalysisKeys,
  useSessionTimeline,
  useAnalyzeSessionWithLLM,
} from './use-session-analysis';

// Log Analysis Hooks
export {
  logAnalysisKeys,
  useAnalyzeLogsWithGemini,
} from './use-log-analysis';

// User Analytics - 기존 export에 useUserActivity 추가
export {
  userAnalyticsKeys,
  useUserList,
  useUserPatterns,
  useProblematicRules,
  useProblematicChats,
  useProblematicStats,
  useUserAnalyticsDashboard,
  useUserActivity,           // <-- 신규 추가
  type UserAnalyticsDashboardData,
} from './use-user-analytics';
```

---

### 1.6 컴포넌트 마이그레이션: MetricsContext -> MetricsSidePanel

**대상 파일**: `apps/frontend-next/src/components/analysis/MetricsContext.tsx`
**이름 변경**: `MetricsContext.tsx` -> `MetricsSidePanel.tsx`
**소비처 업데이트**: `apps/frontend-next/src/app/dashboard/analysis/page.tsx`
**예상 LOC 변경**: -20

**BEFORE** (현재 패턴):
```typescript
// MetricsContext.tsx - 3개 수동 fetch 호출
const [kpi, setKpi] = useState<RealtimeKPI | null>(null);
const [topTenants, setTopTenants] = useState<TenantUsage[]>([]);
const [costData, setCostData] = useState<CostTrend[]>([]);
const [loading, setLoading] = useState(false);

useEffect(() => {
  if (isVisible) { fetchMetrics(); }
}, [isVisible]);

const fetchMetrics = async () => {
  setLoading(true);
  try {
    const kpiRes = await fetch('/api/metrics/realtime');
    const tenantRes = await fetch('/api/analytics/tenant-usage?limit=5');
    const costRes = await fetch('/api/analytics/cost-trend?days=7');
    // ...setState 3회
  } finally { setLoading(false); }
};
```

**AFTER** (목표 패턴):
```typescript
// MetricsSidePanel.tsx - 기존 훅 3개 활용
import { useRealtimeKPI, useTenantUsage, useCostTrend } from '@/hooks/queries';

export default function MetricsSidePanel({ isVisible, onToggle, projectId }: MetricsSidePanelProps) {
  const { data: kpi, isLoading: kpiLoading, refetch: refetchKpi } = useRealtimeKPI(
    projectId, undefined, { enabled: isVisible }
  );
  const { data: allTenants = [], isLoading: tenantsLoading, refetch: refetchTenants } = useTenantUsage(
    projectId, undefined, { enabled: isVisible }
  );
  // IMPORTANT: 기존 코드는 ?limit=5로 상위 5개만 가져왔으나, useTenantUsage는 limit 미지원
  // 클라이언트 측에서 slice로 제한 (훅 수정 대신 소비처에서 처리)
  const topTenants = allTenants.slice(0, 5);
  const { data: costData = [], isLoading: costLoading, refetch: refetchCost } = useCostTrend(
    projectId, 7, { enabled: isVisible }
  );

  const loading = kpiLoading || tenantsLoading || costLoading;
  const handleRefresh = () => { refetchKpi(); refetchTenants(); refetchCost(); };

  // JSX는 동일, fetchMetrics 호출을 handleRefresh로 교체
}
```

**CRITICAL 수정 (Momus 검토 반영)**: `useTenantUsage` 훅은 `limit` 파라미터를 지원하지 않으므로, 클라이언트 측에서 `.slice(0, 5)`를 적용하여 기존 동작(상위 5개 테넌트만 표시)을 유지한다. 또한 `projectId`를 props로 받도록 인터페이스를 변경하고 (`MetricsSidePanelProps`에 `projectId: string` 추가), 소비처(`analysis/page.tsx`)에서 현재 프로젝트 ID를 전달해야 한다.

**중요 주의사항**: 기존 MetricsContext는 `/api/metrics/realtime` (projectId 없음)을 호출하지만, `useRealtimeKPI`는 `projectId`를 필수 인자로 요구한다. 마이그레이션 시 `projectId`를 props로 전달받거나, 기본 projectId를 결정해야 한다. 소비처인 `analysis/page.tsx`에서 어떤 projectId를 사용하는지 확인 필요.

**작업 순서**:
1. `MetricsContext.tsx`를 `MetricsSidePanel.tsx`로 리네이밍
2. 내부 fetch 로직을 기존 훅 3개로 교체
3. `analysis/page.tsx`에서 import 경로 및 컴포넌트명 업데이트

---

### 1.7 컴포넌트 마이그레이션: UserActivityDialog

**대상 파일**: `apps/frontend-next/src/components/charts/UserActivityDialog.tsx`
**예상 LOC 변경**: -25

**소비처 (Momus 검토 반영)**:
1. `apps/frontend-next/src/app/dashboard/user-analytics/page.tsx`
2. `apps/frontend-next/src/app/dashboard/user-analytics/[userId]/page.tsx`

두 번째 소비처는 UserActivityDialog를 import하여 사용하므로, 내부 데이터 패칭 변경 시 양쪽 모두에서 정상 동작하는지 검증해야 한다.

**BEFORE** (현재 패턴):
```typescript
const [activities, setActivities] = useState<UserActivityDetail[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  if (isOpen && userId) { loadActivities(); }
}, [isOpen, userId, period, page]);

const loadActivities = async () => {
  setLoading(true);
  setError(null);
  try {
    const data = await fetchUserActivity(projectId, userId, period, pageSize, page * pageSize);
    setActivities(data);
  } catch (err) { setError('...'); }
  finally { setLoading(false); }
};
```

**AFTER** (목표 패턴):
```typescript
import { useUserActivity } from '@/hooks/queries';

const {
  data: activities = [],
  isLoading: loading,
  error,
} = useUserActivity(projectId, userId, period, page, pageSize, {
  enabled: isOpen && !!userId,
});
```

**제거 대상**: `useState`(activities, loading, error), `useEffect`, `loadActivities` 함수
**유지**: `period`, `page`, `expandedRow` 상태 (UI 상태이므로 React Query와 무관)

---

### 1.8 컴포넌트 마이그레이션: FAQAnalysisSection

**대상 파일**: `apps/frontend-next/src/components/faq-analysis/FAQAnalysisSection.tsx`
**예상 LOC 변경**: -30

**BEFORE** (현재 패턴):
```typescript
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [result, setResult] = useState<FAQAnalysisResponse | null>(null);
const [tenants, setTenants] = useState<string[]>([]);

// 마운트 시 테넌트 로드
useEffect(() => {
  const loadTenants = async () => {
    const data = await getFAQTenants(30);
    setTenants(data);
  };
  loadTenants();
}, []);

// 버튼 클릭 시 분석 실행
const handleAnalyze = async () => {
  setIsLoading(true);
  const data = await runFAQAnalysis(request);
  setResult(data);
};
```

**AFTER** (목표 패턴):
```typescript
import { useFAQTenants, useRunFAQAnalysis } from '@/hooks/queries';

const { data: tenants = [] } = useFAQTenants(30);
const {
  mutate: runAnalysis,
  data: result,
  isPending: isLoading,
  error: mutationError,
} = useRunFAQAnalysis();

const handleAnalyze = () => {
  runAnalysis({ periodDays, topN, ...(tenantId && { tenantId }) });
};

const error = mutationError ? (mutationError instanceof Error ? mutationError.message : 'FAQ 분석 중 오류가 발생했습니다.') : null;
```

**제거 대상**: `useState`(isLoading, error, result, tenants), `useEffect`, `loadTenants`, `handleAnalyze` 내 수동 try/catch
**유지**: `periodDays`, `topN`, `tenantId` 상태 (필터 UI 상태)

---

### 1.9 컴포넌트 마이그레이션: SessionTimelineModal

**대상 파일**: `apps/frontend-next/src/components/session-analysis/SessionTimelineModal.tsx`
**소비처**: `apps/frontend-next/src/app/dashboard/admin/batch-analysis/components/SessionAnalysisTab.tsx`
**예상 LOC 변경**: -25

**BEFORE** (현재 패턴):
```typescript
const [timeline, setTimeline] = useState<SessionTimeline | null>(null);
const [llmAnalysis, setLlmAnalysis] = useState<LLMSessionAnalysis | null>(null);
const [loading, setLoading] = useState(true);
const [analyzing, setAnalyzing] = useState(false);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  if (isOpen && sessionId) { fetchTimeline(); }
}, [isOpen, sessionId]);

const fetchTimeline = async () => { /* ... */ };
const handleAnalyzeWithLLM = async () => { /* ... */ };
```

**AFTER** (목표 패턴):
```typescript
import { useSessionTimeline, useAnalyzeSessionWithLLM } from '@/hooks/queries';

const {
  data: timeline,
  isLoading: loading,
  error: timelineError,
} = useSessionTimeline(sessionId, { enabled: isOpen && !!sessionId });

const {
  mutate: analyzeWithLLM,
  data: llmAnalysis,
  isPending: analyzing,
} = useAnalyzeSessionWithLLM();

const handleAnalyzeWithLLM = () => analyzeWithLLM(sessionId);
const error = timelineError ? (timelineError instanceof Error ? timelineError.message : 'Failed to load session timeline') : null;
```

**제거 대상**: `useState` 5개, `useEffect`, `fetchTimeline`, `handleAnalyzeWithLLM` 내 수동 try/catch

---

### 1.10 컴포넌트 마이그레이션: LogExplorer

**대상 파일**: `apps/frontend-next/src/components/LogExplorer.tsx`
**예상 LOC 변경**: -15

**BEFORE** (현재 패턴):
```typescript
const [isAnalyzing, setIsAnalyzing] = useState(false);
const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

const handleAnalyze = async () => {
  setIsAnalyzing(true);
  setAiAnalysis(null);
  try {
    const result = await analyzeLogs(filteredLogs.slice(0, 20) as any);
    setAiAnalysis(result);
  } catch (e) {
    setAiAnalysis("Error running analysis.");
  } finally {
    setIsAnalyzing(false);
  }
};
```

**AFTER** (목표 패턴):
```typescript
import { useAnalyzeLogsWithGemini } from '@/hooks/queries';

const {
  mutate: analyzeWithGemini,
  data: aiAnalysis,
  isPending: isAnalyzing,
  error: analysisError,
} = useAnalyzeLogsWithGemini();

const handleAnalyze = () => {
  analyzeWithGemini(filteredLogs.slice(0, 20) as any);
};

// 에러 시 aiAnalysis 대신 analysisError 참조
```

**제거 대상**: `useState`(isAnalyzing, aiAnalysis), `handleAnalyze` 내 수동 try/catch

---

## Phase 2: Compound DataTable 확장

### 2.1 Expandable Row 기능 추가

**대상 파일**: `apps/frontend-next/src/components/compound/DataTable/index.tsx`
**예상 LOC 변경**: +120

**의존 관계**: Phase 3.3, 3.4에서 필수 (RepeatedQueriesTable, UserPatternsTable 마이그레이션)

#### 2.1.1 Context 확장

**현재 DataTableContextValue에 추가할 필드**:
```typescript
interface DataTableContextValue<T> {
  // ...기존 필드 유지
  // Expandable Rows
  expandedRows: Set<string | number>;
  toggleExpandedRow: (key: string | number) => void;
  isRowExpanded: (key: string | number) => boolean;
}
```

**DataTableRoot에 상태 추가**:
```typescript
function DataTableRoot<T extends object>({ /* ...기존 props */ }: DataTableRootProps<T>) {
  // ...기존 상태 유지
  const [expandedRows, setExpandedRows] = useState<Set<string | number>>(new Set());

  const toggleExpandedRow = useCallback((key: string | number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const isRowExpanded = useCallback((key: string | number) => {
    return expandedRows.has(key);
  }, [expandedRows]);

  // Provider value에 expandedRows, toggleExpandedRow, isRowExpanded 추가
}
```

#### 2.1.2 DataTable.Body 확장

**Column 인터페이스에 추가할 필드 없음** - 확장 행 렌더링은 `DataTableBody` props로 처리.

**DataTableBodyProps 확장**:
```typescript
interface DataTableBodyProps<T> {
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  onRowClick?: (row: T, index: number) => void;
  rowClassName?: (row: T, index: number) => string;
  // Expandable Row 관련 신규 props
  expandable?: boolean;
  renderExpandedRow?: (row: T, index: number) => ReactNode;
}
```

**Body 렌더링 로직 변경**:
```typescript
function DataTableBody<T>({
  // ...기존 props
  expandable = false,
  renderExpandedRow,
}: DataTableBodyProps<T>) {
  const { /* ...기존 */ expandedRows, toggleExpandedRow, isRowExpanded, rowKey } = useDataTableContext<T>();

  // 각 row 렌더링 시:
  return (
    <tbody>
      {displayData.map((row, index) => {
        const key = getRowKey(row, index);
        const isExpanded = expandable && isRowExpanded(key);

        return (
          <React.Fragment key={key}>
            <tr
              className={`... ${expandable ? 'cursor-pointer' : ''}`}
              onClick={() => {
                if (expandable) toggleExpandedRow(key);
                onRowClick?.(row, index);
              }}
            >
              {/* 확장 아이콘 컬럼은 columns에 포함시키거나, expandable일 때 자동 추가 */}
              {expandable && (
                <td className="py-3 px-2 w-8 text-gray-400">
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </td>
              )}
              {columns.map((col) => (
                <td key={String(col.key)} /* 기존 렌더링 */ />
              ))}
            </tr>
            {isExpanded && renderExpandedRow && (
              <tr className="bg-gray-100/20">
                <td colSpan={columns.length + (expandable ? 1 : 0)} className="py-4 px-4">
                  {renderExpandedRow(row, index)}
                </td>
              </tr>
            )}
          </React.Fragment>
        );
      })}
    </tbody>
  );
}
```

**Header도 업데이트** - `expandable`일 때 빈 `<th>` 추가:
```typescript
function DataTableHeader() {
  // expandable 상태는 context에서 가져오거나 prop으로 전달
  // 빈 헤더 셀 추가는 Body의 expandable prop과 일관성 유지 필요
}
```

**설계 결정**: `expandable` 플래그를 Context에 넣지 않고 `DataTable.Body`의 prop으로만 유지한다. Header는 `DataTable.Body`와 동일한 부모(DataTable.Content) 안에서 렌더링되므로, Header가 expandable을 알아야 할 경우 Context에 추가하거나 Header에도 prop을 전달한다.

**권장 접근**: Context에 `hasExpandableColumn: boolean` 플래그를 추가하고, `DataTable.Body`가 마운트될 때 `expandable=true`면 Context에 등록한다 (Pagination의 `setHasPagination` 패턴과 동일).

```typescript
// Context 추가
hasExpandableColumn: boolean;
setHasExpandableColumn: (v: boolean) => void;
```

```typescript
// DataTableBody 내부
useEffect(() => {
  if (expandable) setHasExpandableColumn(true);
  return () => setHasExpandableColumn(false);
}, [expandable, setHasExpandableColumn]);
```

```typescript
// DataTableHeader 내부
const { hasExpandableColumn, /* ... */ } = useDataTableContext();
// hasExpandableColumn이면 첫 번째 <th>로 빈 셀 추가
```

#### 2.1.4 정렬 동작 차이 (Momus 검토 반영)

기존 독립 테이블들은 **2-state 정렬** (asc <-> desc 토글)을 사용하지만, Compound DataTable은 **3-state 정렬** (asc -> desc -> none 순환)을 사용한다. 이 차이는 의도적으로 수용한다:

- 3-state 정렬이 UX 관점에서 우수 (정렬 해제 가능)
- 기존 사용자 경험과의 미세한 차이이나, 기능적 퇴화는 아님
- 수락 기준 #7을 "핵심 기능 동일 동작"으로 재해석하여 정렬 상태 수 차이는 허용

이 결정을 수락 기준에 반영하여 #7을 다음과 같이 수정:
> "모든 기존 핵심 기능(데이터 표시, 검색, 페이지네이션, 확장 행, 상세 보기)이 동일하게 동작할 것. 정렬 동작은 DataTable의 3-state 패턴을 따르되 기능적 퇴화 없을 것."

#### 2.1.3 타입 export 추가

```typescript
export type { Column, DataTableRootProps, DataTableBodyProps, DataTablePaginationProps };
// DataTableBodyProps에 expandable, renderExpandedRow가 이미 포함됨
```

---

### 2.2 DataTable.Stats 서브컴포넌트 추가 (선택적)

**대상 파일**: `apps/frontend-next/src/components/compound/DataTable/index.tsx`
**예상 LOC 변경**: +35

UserListTable, RepeatedQueriesTable, UserPatternsTable 모두 테이블 상단에 통계 요약 패널이 있다. 공통 서브컴포넌트로 추출할 수 있다.

```typescript
interface DataTableStatsProps {
  children: ReactNode;
  className?: string;
}

function DataTableStats({ children, className = '' }: DataTableStatsProps) {
  return (
    <div className={`flex flex-wrap gap-4 text-sm ${className}`}>
      {children}
    </div>
  );
}

interface DataTableStatItemProps {
  label: string;
  value: string | number;
  colorClass?: string;
}

function DataTableStatItem({ label, value, colorClass = 'text-gray-900' }: DataTableStatItemProps) {
  return (
    <div className="text-right">
      <div className="text-gray-500 text-xs">{label}</div>
      <div className={`font-bold ${colorClass}`}>{value}</div>
    </div>
  );
}
```

**export에 추가**:
```typescript
export const DataTable = Object.assign(DataTableRoot, {
  // ...기존
  Stats: DataTableStats,
  StatItem: DataTableStatItem,
});
```

---

## Phase 3: 독립 테이블 마이그레이션

### 3.1 ProblematicChatTable 마이그레이션 (파일럿)

**대상 파일**: `apps/frontend-next/src/components/charts/ProblematicChatTable.tsx` (212줄)
**소비처**: `apps/frontend-next/src/app/dashboard/user-analytics/page.tsx`
**난이도**: LOW
**예상 LOC 변경**: -212 (파일 삭제) + 소비처에 ~60줄 인라인

**현재 기능 분석**:
- 정렬: `timestamp`, `outputTokens` 2개 필드 -> DataTable 기본 지원
- 커스텀 렌더링: 날짜 포맷, 텍스트 truncation, 규칙 배지, 토큰 색상 -> `Column.render` 사용
- 상세 보기 버튼: `onViewDetail` 콜백 -> `Column.render`에서 버튼 렌더링
- 로딩/빈 상태: -> DataTable 기본 지원
- 외부에서 데이터 주입(props): 유지 (이미 React Query 훅으로 데이터 패칭 중)

**마이그레이션 전략**: 소비처(`user-analytics/page.tsx`)에서 `DataTable` compound 패턴으로 직접 작성. `columns` 배열 정의와 `DataTable` 조합으로 대체.

**소비처 코드 스니펫**:
```typescript
import { DataTable, Column } from '@/components/compound/DataTable';

const problematicColumns: Column<ProblematicChat>[] = [
  {
    key: 'timestamp', header: '시간', sortable: true,
    render: (v) => formatTimestamp(v as string),
  },
  {
    key: 'userId', header: '유저',
    render: (v) => <span className="text-xs truncate max-w-[180px]" title={v as string}>{v || '-'}</span>,
  },
  {
    key: 'userInput', header: '입력',
    render: (v) => <span title={v as string}>{truncateText(v as string, 50)}</span>,
  },
  { key: 'llmResponse', header: '응답',
    render: (v) => <span title={v as string}>{truncateText(v as string, 50)}</span>,
  },
  {
    key: 'outputTokens', header: '토큰', sortable: true, align: 'center',
    render: (v) => <span className={(v as number) < 1500 ? 'text-amber-400' : ''}>{(v as number).toLocaleString()}</span>,
  },
  {
    key: 'matchedRules', header: '매칭 규칙',
    render: (_, row) => (
      <div className="flex flex-wrap gap-1">
        {row.matchedRules.map(name => (
          <span key={name} className={`px-2 py-0.5 text-xs rounded-full text-white ${getRuleColor(name)}`}>{name}</span>
        ))}
      </div>
    ),
  },
  {
    key: 'id', header: '액션', align: 'center',
    render: (_, row) => (
      <button onClick={(e) => { e.stopPropagation(); onViewDetail(row); }} className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 ...">
        <Eye className="w-4 h-4" />
      </button>
    ),
  },
];

// JSX:
<DataTable data={problematicChats} columns={problematicColumns} rowKey="id">
  <DataTable.Content>
    <DataTable.Header />
    <DataTable.Body emptyMessage="필터링 조건에 맞는 문제 채팅이 없습니다." />
  </DataTable.Content>
  <DataTable.Footer />
</DataTable>
```

**CRITICAL 수정 (Momus 검토 반영)**: `matchedRules` 컬럼은 `rules` prop에 의존하는 `getRuleColor` 클로저 함수를 사용한다. 마이그레이션 시 다음 의존성을 소비처에 포함해야 한다:

필요한 import:
- `@ola/shared-types`: `isCompoundConfig`, `getFieldDefinition`
- `rules` 데이터: 소비처에서 `useProblematicRules()` 훅으로 가져옴 (이미 사용 중)

`getRuleColor` 헬퍼 함수를 소비처에 인라인하거나 별도 유틸로 추출:
```typescript
const getRuleColor = (ruleName: string) => {
  const rule = rules.find((r) => r.name === ruleName);
  if (!rule) return 'bg-gray-300';
  if (isCompoundConfig(rule.config)) return 'bg-purple-600';
  const fieldDef = getFieldDefinition(rule.config.field);
  return fieldDef?.color ?? 'bg-gray-500';
};
```

---

### 3.2 UserListTable 마이그레이션

**대상 파일**: `apps/frontend-next/src/components/charts/UserListTable.tsx` (373줄)
**소비처**: `apps/frontend-next/src/app/dashboard/user-analytics/page.tsx`
**난이도**: MEDIUM
**예상 LOC 변경**: -373 (파일 삭제) + 소비처에 ~90줄 인라인

**현재 기능 분석**:
- 검색: userId 필드 -> `DataTable searchFields={['userId']}`
- 정렬: 6개 필드 (questionCount, successRate, totalTokens, avgTokens, errorCount, lastActivity) -> DataTable 기본 지원
- 페이지네이션: 20개/페이지 -> `DataTable.Pagination pageSize={20}`
- 요약 통계: 총 유저, 총 질문, 평균 성공률 -> `DataTable.Toolbar` 내에 배치 또는 `DataTable.Stats` 사용
- 행 클릭: `onUserClick` -> `DataTable.Body onRowClick`
- 프로필 링크 버튼: -> `Column.render`에서 `router.push` 처리
- 커스텀 렌더링: 성공률 색상, 에러 수 색상, 날짜 포맷, userId truncation -> `Column.render`

**GAP 분석**: 요약 통계 패널을 `DataTable.Toolbar` 안에 배치하면 된다. 별도 서브컴포넌트 불필요.

**소비처 코드 구조**:
```typescript
<DataTable data={userList} columns={userListColumns} searchFields={['userId']} rowKey={(row) => row.userId}>
  <DataTable.Toolbar>
    <DataTable.Search placeholder="유저 ID 검색..." />
    {/* 인라인 통계 */}
    <div className="flex gap-4 text-sm">
      <div className="text-right"><div className="text-gray-500 text-xs">총 유저</div><div className="text-blue-400 font-bold">{totalUsers}명</div></div>
      {/* ... */}
    </div>
  </DataTable.Toolbar>
  <DataTable.Content>
    <DataTable.Header />
    <DataTable.Body onRowClick={(row) => onUserClick?.(row.userId)} />
  </DataTable.Content>
  <DataTable.Pagination pageSize={20} />
</DataTable>
```

---

### 3.3 RepeatedQueriesTable 마이그레이션

**대상 파일**: `apps/frontend-next/src/components/charts/RepeatedQueriesTable.tsx` (178줄)
**소비처**: `apps/frontend-next/src/app/dashboard/quality/page.tsx`
**난이도**: HIGH (Expandable Row 필요)
**의존**: Phase 2.1 완료 필수
**예상 LOC 변경**: -178 (파일 삭제) + 소비처에 ~80줄 인라인

**현재 기능 분석**:
- 확장 행: 클릭 시 전체 질문 패턴 + 첫 발생일 + 평균 토큰 표시 -> `DataTable.Body expandable renderExpandedRow`
- 요약 통계: 총 패턴, 총 반복 -> Toolbar 내 배치
- 상위 20개 제한: `displayData = data.slice(0, 20)` -> 데이터를 소비처에서 slice 후 전달
- 커스텀 렌더링: 반복 횟수 색상, 응답 길이 K 포맷, 날짜 포맷 -> `Column.render`

**소비처 코드 구조**:
```typescript
<DataTable data={repeatedData.slice(0, 20)} columns={repeatedColumns} rowKey={(_, i) => i}>
  <DataTable.Toolbar>
    <h3 className="text-lg font-semibold text-gray-900">반복 질문 패턴 (FAQ 후보)</h3>
    <div className="flex gap-4">
      {/* 통계 */}
    </div>
  </DataTable.Toolbar>
  <DataTable.Content>
    <DataTable.Header />
    <DataTable.Body
      expandable
      renderExpandedRow={(row) => (
        <div className="space-y-2">
          <div className="text-gray-500 text-xs">전체 질문 패턴:</div>
          <div className="text-gray-900 bg-white p-3 rounded-lg text-xs break-all">{row.query_pattern}</div>
          <div className="flex gap-6 mt-3 text-xs">
            <div><span className="text-gray-500">첫 발생:</span> {formatDate(row.first_seen)}</div>
            <div><span className="text-gray-500">평균 토큰:</span> {row.avg_output_tokens.toLocaleString()}</div>
          </div>
        </div>
      )}
    />
  </DataTable.Content>
  <DataTable.Footer />
</DataTable>
```

**커스텀 Footer 처리 (Momus 검토 반영)**: 기존 RepeatedQueriesTable은 `data.length > 20`일 때 "상위 20개 패턴 표시 중 (전체 {data.length}개)" 메시지를 표시한다. DataTable.Footer는 이 커스텀 메시지를 기본 지원하지 않으므로, Footer 대신 DataTable.Toolbar 하단에 정보 텍스트를 배치한다:

```typescript
{repeatedData.length > 20 && (
  <p className="text-xs text-gray-400 mt-2">
    상위 20개 패턴 표시 중 (전체 {repeatedData.length}개)
  </p>
)}
```

---

### 3.4 UserPatternsTable 마이그레이션

**대상 파일**: `apps/frontend-next/src/components/charts/UserPatternsTable.tsx` (210줄)
**소비처**: `apps/frontend-next/src/app/dashboard/user-analytics/page.tsx`
**난이도**: HIGH (Expandable Row 필요)
**의존**: Phase 2.1 완료 필수
**예상 LOC 변경**: -210 (파일 삭제) + 소비처에 ~75줄 인라인

**현재 기능 분석**:
- 확장 행: 클릭 시 전체 유저 ID + 전체 질문 표시 -> `DataTable.Body expandable renderExpandedRow`
- 검색: userId 필드 -> `DataTable searchFields`
- 요약 통계: 유저 수, 총 패턴, 총 빈도 -> Toolbar 내 배치
- 최대 표시 제한: `maxDisplay` prop -> 데이터를 소비처에서 slice 후 전달
- 커스텀 렌더링: 빈도 색상, userId truncation, 날짜 포맷 -> `Column.render`

**소비처 코드 구조**:
```typescript
<DataTable data={userPatterns.slice(0, 30)} columns={patternColumns} searchFields={['userId']} rowKey={(_, i) => i}>
  <DataTable.Toolbar>
    <DataTable.Search placeholder="유저 ID 검색..." />
    <div className="flex gap-4 text-sm">
      {/* 통계 */}
    </div>
  </DataTable.Toolbar>
  <DataTable.Content>
    <DataTable.Header />
    <DataTable.Body
      expandable
      renderExpandedRow={(row) => (
        <div className="space-y-3">
          <div>
            <div className="text-gray-500 text-xs mb-1">전체 유저 ID:</div>
            <div className="text-blue-400 bg-white p-2 rounded text-xs break-all">{row.userId}</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs mb-1">전체 질문:</div>
            <div className="text-gray-900 bg-white p-3 rounded-lg text-sm break-all">{row.question}</div>
          </div>
        </div>
      )}
    />
  </DataTable.Content>
  <DataTable.Footer />
</DataTable>
```

---

## Phase 4: 정리 및 검증

### 4.1 사용하지 않는 코드 제거

**삭제 대상 파일**:
1. `apps/frontend-next/src/components/charts/ProblematicChatTable.tsx`
2. `apps/frontend-next/src/components/charts/UserListTable.tsx`
3. `apps/frontend-next/src/components/charts/RepeatedQueriesTable.tsx`
4. `apps/frontend-next/src/components/charts/UserPatternsTable.tsx`

**삭제 전 확인**: 각 파일의 import가 소비처에서 완전히 제거되었는지 `grep` 검증.

**사용하지 않는 import 정리**: 마이그레이션된 5개 컴포넌트에서 제거된 직접 서비스 import들 (`fetchUserActivity`, `getFAQTenants`, `runFAQAnalysis`, `sessionAnalysisApi`, `analyzeLogs`)이 다른 곳에서도 사용되지 않는지 확인. 서비스 파일 자체는 훅에서 사용하므로 삭제하지 않는다.

### 4.2 빌드 검증

```bash
cd apps/frontend-next && pnpm build
```

**확인 사항**:
- TypeScript 타입 오류 없음
- 미사용 import 경고 없음
- 빌드 성공

### 4.3 기능 테스트 체크리스트

| 페이지 | 테스트 항목 | 검증 방법 |
|--------|-----------|----------|
| `/dashboard/analysis` | MetricsSidePanel 토글, 데이터 로딩, 새로고침 | 수동 |
| `/dashboard/user-analytics` | UserListTable 검색/정렬/페이지네이션/행 클릭 | 수동 |
| `/dashboard/user-analytics` | UserPatternsTable 확장 행/검색 | 수동 |
| `/dashboard/user-analytics` | ProblematicChatTable 정렬/상세 보기 | 수동 |
| `/dashboard/user-analytics` | UserActivityDialog 기간 변경/페이지 이동/확장 행 | 수동 |
| `/dashboard/quality` | RepeatedQueriesTable 확장 행 | 수동 |
| `/dashboard/quality` | FAQAnalysisSection 테넌트 로딩/분석 실행 | 수동 |
| Batch Analysis | SessionTimelineModal 타임라인 로딩/LLM 분석 | 수동 |
| Log Explorer | Gemini 분석 실행/결과 표시 | 수동 |

---

## 위험 요소 및 완화 방안

### 1. MetricsSidePanel의 projectId 부재

**위험**: 기존 MetricsContext는 `/api/metrics/realtime` (projectId 없음)을 직접 호출하지만, `useRealtimeKPI`는 `projectId`를 필수 인자로 요구한다.

**완화**: 소비처(`analysis/page.tsx`)에서 현재 선택된 projectId를 확인하고 props로 전달하거나, 해당 API가 projectId 없이도 동작하는 기본 경로를 지원하는지 백엔드를 확인한다. 최악의 경우 MetricsSidePanel 전용으로 projectId 없이 호출하는 별도 훅을 추가할 수 있다.

### 2. Server Action과 useMutation 호환성

**위험**: `geminiService`의 `analyzeLogs`는 `"use server"` 디렉티브를 사용한다. `useMutation`에서 Server Action을 직접 호출하는 것이 Next.js 16에서 정상 동작하는지 확인 필요.

**완화**: Server Action은 일반 비동기 함수처럼 클라이언트에서 호출 가능하므로 `useMutation`과 호환된다. 빌드 시 경고가 발생하면 별도 래퍼 함수로 분리한다.

### 3. Expandable Row와 기존 기능 충돌

**위험**: DataTable.Body에 `expandable`과 `onRowClick`이 동시에 사용될 때, 행 클릭 시 확장과 콜백이 모두 발생할 수 있다.

**완화**: `expandable`일 때 행 클릭은 확장 토글만 수행하고, `onRowClick`은 확장과 분리하여 동작하도록 설계한다. 또는 `expandable`이 true이면 `onRowClick`을 무시하도록 명시한다.

### 4. Pagination 컴포넌트 마운트 순서

**위험**: `expandable` 등록이 Pagination의 `setHasPagination`과 동일한 패턴을 사용하므로, 마운트/언마운트 순서에 따른 상태 충돌 가능성.

**완화**: `useEffect` cleanup에서 명확히 해제하고, 조건부 렌더링 시에도 안전하게 동작하도록 한다.

### 5. DataTable 확장에 의한 기존 소비처 회귀 (Momus 검토 반영)

**위험**: Phase 2.1에서 DataTable Context에 `expandedRows`, `toggleExpandedRow` 등 필드를 추가하면, 기존 DataTable 소비처(admin 페이지, batch-analysis 등)에서 예기치 않은 동작이 발생할 수 있다.

**완화**:
- 모든 신규 Context 필드에 안전한 기본값 설정 (`expandedRows: new Set()`, `hasExpandableColumn: false`)
- `expandable` prop이 명시적으로 `true`일 때만 확장 UI 렌더링
- Phase 2.1 완료 후 기존 DataTable 소비처에서 회귀 테스트 수행
- `pnpm build:frontend-next` 빌드 성공 확인

---

## 파일 변경 목록 (전체)

### 신규 파일 (4개)

| 파일 경로 | 예상 LOC |
|----------|---------|
| `apps/frontend-next/src/hooks/queries/use-faq-analysis.ts` | +65 |
| `apps/frontend-next/src/hooks/queries/use-session-analysis.ts` | +70 |
| `apps/frontend-next/src/hooks/queries/use-log-analysis.ts` | +30 |
| `apps/frontend-next/src/components/analysis/MetricsSidePanel.tsx` | (리네이밍) |

### 수정 파일 (12개)

| 파일 경로 | 변경 내용 | 예상 LOC 변경 |
|----------|----------|-------------|
| `apps/frontend-next/src/hooks/queries/use-user-analytics.ts` | `useUserActivity` 훅 추가 | +30 |
| `apps/frontend-next/src/hooks/queries/index.ts` | 신규 훅 export 추가 | +25 |
| `apps/frontend-next/src/components/compound/DataTable/index.tsx` | Expandable Row + Stats 추가 | +155 |
| `apps/frontend-next/src/components/analysis/MetricsContext.tsx` | MetricsSidePanel 리네이밍 + 훅 마이그레이션 | -20 |
| `apps/frontend-next/src/components/charts/UserActivityDialog.tsx` | 훅 마이그레이션 | -25 |
| `apps/frontend-next/src/components/faq-analysis/FAQAnalysisSection.tsx` | 훅 마이그레이션 | -30 |
| `apps/frontend-next/src/components/session-analysis/SessionTimelineModal.tsx` | 훅 마이그레이션 | -25 |
| `apps/frontend-next/src/components/LogExplorer.tsx` | 훅 마이그레이션 | -15 |
| `apps/frontend-next/src/app/dashboard/analysis/page.tsx` | MetricsSidePanel import 변경 | -2 |
| `apps/frontend-next/src/app/dashboard/user-analytics/page.tsx` | 3개 테이블을 DataTable로 교체 | +225 / -15 |
| `apps/frontend-next/src/app/dashboard/quality/page.tsx` | RepeatedQueriesTable을 DataTable로 교체 | +80 / -5 |
| (선택) `apps/frontend-next/src/app/dashboard/chatbot-quality/page.tsx` | FAQAnalysisSection 변경 시 영향 확인 | 0 |

### 삭제 파일 (4개)

| 파일 경로 | 삭제 LOC |
|----------|---------|
| `apps/frontend-next/src/components/charts/ProblematicChatTable.tsx` | -212 |
| `apps/frontend-next/src/components/charts/UserListTable.tsx` | -373 |
| `apps/frontend-next/src/components/charts/RepeatedQueriesTable.tsx` | -178 |
| `apps/frontend-next/src/components/charts/UserPatternsTable.tsx` | -210 |

---

## 작업 순서 및 의존성

```
Phase 1.1 (use-faq-analysis.ts)          ─┐
Phase 1.2 (use-session-analysis.ts)       │ 병렬 가능
Phase 1.3 (use-log-analysis.ts)           │
Phase 1.4 (use-user-analytics.ts 확장)    ─┘
            │
Phase 1.5 (index.ts 업데이트)  ── 1.1~1.4 완료 후
            │
Phase 1.6 (MetricsSidePanel)   ─┐
Phase 1.7 (UserActivityDialog)  │
Phase 1.8 (FAQAnalysisSection)  │ 병렬 가능, 1.5 완료 후
Phase 1.9 (SessionTimelineModal)│
Phase 1.10 (LogExplorer)       ─┘
            │
Phase 2.1 (Expandable Row)    ── Phase 1 완료 후 (또는 병렬)
Phase 2.2 (Stats 서브컴포넌트) ── Phase 2.1과 병렬
            │
Phase 3.1 (ProblematicChatTable) ── Phase 1 완료 후 (Phase 2 불필요, expandable row 미사용)
Phase 3.2 (UserListTable)       ── Phase 2.2 완료 후 (Stats 사용, expandable 미사용)
Phase 3.3 (RepeatedQueriesTable) ── Phase 2.1 필수 (expandable row 사용)
Phase 3.4 (UserPatternsTable)    ── Phase 2.1 필수, 3.3과 병렬
            │
Phase 4.1 (코드 정리)  ── Phase 3 완료 후
Phase 4.2 (빌드 검증)  ── 4.1 완료 후
Phase 4.3 (기능 테스트) ── 4.2 완료 후
```

---

## 커밋 전략

| 커밋 | 내용 | Phase |
|------|------|-------|
| 1 | `feat: React Query 훅 신규 생성 (faq-analysis, session-analysis, log-analysis)` | 1.1~1.5 |
| 2 | `refactor: 5개 컴포넌트의 데이터 패칭을 React Query 훅으로 마이그레이션` | 1.6~1.10 |
| 3 | `feat: Compound DataTable에 Expandable Row 및 Stats 기능 추가` | 2.1~2.2 |
| 4 | `refactor: 4개 독립 테이블을 Compound DataTable로 마이그레이션` | 3.1~3.4 |
| 5 | `chore: 사용하지 않는 독립 테이블 컴포넌트 삭제 및 빌드 검증` | 4.1~4.2 |
