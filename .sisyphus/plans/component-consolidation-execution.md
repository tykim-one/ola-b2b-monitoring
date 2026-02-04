# Component Consolidation - 자체 완결형 실행 문서

> **다음 세션 지침**: 이 문서를 읽고 Phase별로 순서대로 실행하세요.
> - 현재 진행 상황은 "Progress Tracker" 섹션을 확인하세요
> - 각 Phase 시작 전 해당 섹션의 "대상 파일"을 먼저 Read로 확인하세요
> - 각 Phase 완료 후 `pnpm build:frontend-next` 검증 필수
> - Phase별 별도 git commit 생성 (rollback 용이)
> - 문제 발생 시 "리스크 및 완화 전략" 섹션 참조

## 실행 명령 예시
이 문서의 Phase N을 실행하려면:
"component-consolidation-execution.md 문서의 Phase N을 실행해줘"

---

## Progress Tracker

| Phase | 상태 | 설명 |
|-------|------|------|
| Phase 1 | ✅ 완료 | 공통 컴포넌트 확장 (StatusBadge, Modal, EmptyState, KPICard) |
| Phase 2 | ✅ 완료 | 로그 테이블 3중 복사 통합 |
| Phase 3 | ✅ 완료 | batch-analysis 3개 탭 표준화 |
| Phase 4 | ⬜ 대기 | 자체 모달 → Modal 컴포넌트 교체 |
| Phase 5 | ⬜ 대기 | 인라인 EmptyState 10곳 교체 |
| Phase 6 | ⬜ 대기 | 인라인 StatusBadge 6곳 교체 |
| Phase 7 | ⬜ 대기 | 인라인 KPI 카드 7개 교체 |
| Phase 8 | ⬜ 대기 | Chart compound 17개 차트 마이그레이션 |
| Phase 9 | ⬜ 대기 | 기타 소규모 교체 (DateRangeFilter) |

> Phase 완료 시 ⬜를 ✅로 변경하세요.

---

## 프로젝트 컨텍스트

### 프로젝트 개요
- **이름**: OLA B2B Monitoring
- **프론트엔드**: Next.js 16 + React 19, Recharts 차트, Tailwind CSS
- **경로 기준**: `apps/frontend-next/src/` (이하 모든 경로는 이 기준)
- **전체 경로 prefix**: `/Users/tykim/Documents/ola-b2b-monitoring/apps/frontend-next/src/`
- **빌드 명령**: `pnpm build:frontend-next` (프로젝트 루트에서)
- **개발 서버**: `pnpm dev:frontend-next` (포트 3001)
- **브랜치**: `dev`

### 공통 컴포넌트 레퍼런스 (11개)

#### Compound Components (복합 컴포넌트)

**1. Dashboard** -- `components/compound/Dashboard/index.tsx`
- 패턴: `Object.assign(Root, { Header, KPISection, ChartsSection, TableSection, Section, Skeleton, Error, Empty, Content })`
- Root Props: `children`, `isLoading?`, `error?`, `className?`, `refetch?`
- Context로 isLoading/error 상태를 서브컴포넌트에 자동 전파
- 현재 11곳에서 사용 중

**2. DataTable** -- `components/compound/DataTable/index.tsx`
- 패턴: `Object.assign(Root, { Toolbar, Search, Content, Header, Body, Footer, Pagination, Stats, StatItem })`
- Root Props: `data: T[]`, `columns: Column<T>[]`, `searchFields?`, `variant?: 'default'|'card'|'flat'`, `rowKey?`
- Column<T>: `{ key, header, sortable?, align?, render?, className? }`
- Body Props: `emptyMessage?`, `onRowClick?`, `expandable?`, `renderExpandedRow?`
- Pagination Props: `pageSize?`, `pageSizeOptions?`
- 제네릭 타입 지원, 내장 검색/정렬/페이지네이션
- 현재 11곳에서 사용 중

**3. Chart** -- `components/compound/Chart/index.tsx`
- 패턴: `Object.assign(Root, { Legend, Metric, Loading, NoData, Wrapper })`
- Root Props: `title`, `subtitle?`, `height? (default 256)`, `headerRight?`
- Root 내부에 ResponsiveContainer 자동 래핑
- `CHART_COLORS` export: `{ primary, secondary, success, warning, danger, info, palette: string[] }`
- **현재 채택률 0%** -- 모든 차트가 ResponsiveContainer 직접 사용 중

#### UI Primitives

**4. Modal** -- `components/ui/Modal.tsx`
- Props: `isOpen`, `onClose`, `title`, `children`, `size?: 'sm'|'md'|'lg'|'xl'`
- default export
- 현재 9곳에서 사용 중

**5. ConfirmDialog** -- `components/ui/ConfirmDialog.tsx`
- Props: `isOpen`, `onClose`, `onConfirm`, `title`, `message`, `confirmText?`, `cancelText?`, `variant?: 'danger'|'warning'|'info'`, `isLoading?`
- default export
- 현재 8곳에서 사용 중

**6. SearchInput** -- `components/ui/SearchInput.tsx`
- Props: `value`, `onChange`, `placeholder?`, `className?`
- default export
- 현재 4곳에서 사용 중

**7. DateRangeFilter** -- `components/ui/DateRangeFilter.tsx`
- Props: `defaultPreset?: 'day'|'week'|'month'|'custom'`, `onChange: (range: DateRange) => void`, `className?`
- DateRange: `{ startDate: string; endDate: string; days: number }`
- default export + type exports
- 현재 8곳에서 사용 중

**8. StatusBadge** -- `components/ui/StatusBadge.tsx`
- Props: `label`, `variant: 'success'|'error'|'warning'|'info'|'neutral'`, `shape?: 'pill'|'rect'`, `size?: 'sm'|'md'`, `className?`
- named export
- 현재 4곳에서 사용 중

**9. EmptyState** -- `components/ui/EmptyState.tsx`
- Props: `icon?`, `title?`, `description`, `searchQuery?`, `action?: { label, onClick, icon?, disabled? }`, `variant?: 'dashed'|'solid'`, `className?`
- named export
- 현재 4곳에서 사용 중

**10. StatsFooter** -- `components/ui/StatsFooter.tsx`
- Props: `items: StatItem[]`, `columns?: 2|3|4`, `className?`
- StatItem: `{ label, value, color?, valueSize? }`
- named export
- 현재 5곳에서 사용 중

**11. KPICard** -- `components/kpi/KPICard.tsx`
- Props: `title`, `value`, `subtitle?`, `trend?`, `status?: 'success'|'warning'|'error'|'neutral'`, `icon?`, `format?: 'number'|'percentage'|'currency'|'tokens'`
- default export
- 현재 9곳에서 사용 중

### 핵심 결정사항 (이전 세션에서 확정)
1. **단계별(Phase별) 진행** -- 각 Phase 완료 후 빌드 검증, 별도 git commit
2. **필요시 공통 컴포넌트 variant 확장 포함** -- Phase 1에서 선행
3. **Chart compound 마이그레이션 포함** -- Phase 8
4. **로그 테이블 → DataTable 기반 단일 컴포넌트로 통합** -- Phase 2

### Conventions
- 파일 경로는 `apps/frontend-next/src/` 기준으로 표기 (전체 경로 명시)
- `[DONE IN PHASE N]` 표시는 해당 파일이 이미 다른 Phase에서 처리 완료됨을 의미
- 각 Phase 완료 후 `pnpm build:frontend-next` 및 수동 UI 확인 필수

---

## 실행 의존성 그래프

```
Phase 1 (공통 컴포넌트 확장) <- 모든 Phase의 선행 조건
  |
  +--- Phase 2 (로그 테이블) --- 독립 트랙 A
  |
  +--- Phase 8 (Chart 마이그레이션) --- 독립 트랙 B
  |
  +--- Phase 3 (batch-analysis 탭) --- 메인 트랙
       |
       +--- Phase 4 (모달 교체)
       |
       +--- Phase 5 (EmptyState 교체)
       |    |
       |    +--- Phase 6 (StatusBadge 교체)
       |         |
       |         +--- Phase 7 (KPI 카드 교체)
       |
       +--- Phase 9 (기타)
```

**병렬 실행 가능**: Phase 1 완료 후 Phase 2, Phase 3, Phase 8은 동시 진행 가능
**Critical Path**: Phase 1 → Phase 3 → Phase 5 → Phase 7

---

## Phase 1: Common Component Extension (선행 작업)

### Goal
기존 공통 컴포넌트에 부족한 variant/옵션을 확장하여 이후 Phase에서 교체가 가능하도록 준비한다.

### 실행 전 체크리스트
- [ ] 선행 Phase 완료 확인 (없음 - 첫 번째 Phase)
- [ ] 대상 파일을 Read로 현재 상태 확인
- [ ] git 상태 clean 확인

### Dependencies
없음 (첫 번째 Phase)

### Changes

#### 1-1. StatusBadge: `purple` variant 추가, icon slot 지원

**File:** `components/ui/StatusBadge.tsx`

**Current State:**
- `BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral'`
- icon 지원 없음

**Changes:**
1. `BadgeVariant` 타입에 `'purple'` 추가
2. `variantStyles`에 `purple: 'bg-purple-50 text-purple-700 border-purple-200'` 추가
3. `StatusBadgeProps`에 `icon?: React.ReactNode` 추가
4. 렌더링에 icon 삽입: `{icon && <span className="mr-1">{icon}</span>}{label}`

```typescript
// Before
export type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral';

// After
export type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'purple';
```

```typescript
// variantStyles 추가
purple: 'bg-purple-50 text-purple-700 border-purple-200',
```

```typescript
// Props 확장
export interface StatusBadgeProps {
  label: string;
  variant: BadgeVariant;
  shape?: 'pill' | 'rect';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;  // NEW
  className?: string;
}

// 렌더링 변경
return (
  <span className={classes}>
    {icon && <span className="mr-1 inline-flex">{icon}</span>}
    {label}
  </span>
);
```

#### 1-2. Modal: `size` prop에 `'full'` 추가 및 custom maxWidth 지원

**File:** `components/ui/Modal.tsx`

**Current State:**
- `size?: 'sm' | 'md' | 'lg' | 'xl'`
- `xl` = `max-w-6xl` (이미 UserActivityDialog의 max-w-5xl 커버)

**Changes:**
- `size` 타입에 `'full'` 추가
- `sizeClasses`에 `full: 'max-w-[95vw]'` 추가
- `maxWidth?: string` optional prop 추가 (custom maxWidth override용)

```typescript
// Before
size?: 'sm' | 'md' | 'lg' | 'xl';

// After
size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
maxWidth?: string;
```

```typescript
const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
  full: 'max-w-[95vw]',
};

// 적용: maxWidth가 주어지면 sizeClasses 대신 사용
const widthClass = maxWidth ? '' : sizeClasses[size];
// style={{ maxWidth: maxWidth || undefined }}
```

#### 1-3. EmptyState: `compact` variant 추가 (테이블 tbody 내 사용)

**File:** `components/ui/EmptyState.tsx`

**Current State:**
- `variant?: 'dashed' | 'solid'`
- 항상 `p-12` 패딩

**Changes:**
- `variant` 타입에 `'compact'` 추가
- compact variant 스타일: `'text-center py-8 px-4'` (패딩 축소, 테두리 없음)
- compact에서는 title 폰트 크기를 `text-base`로, description을 `text-xs`로 축소

```typescript
// variant 확장
variant?: 'dashed' | 'solid' | 'compact';

// 스타일 맵
const baseClasses = {
  dashed: 'border border-dashed border-gray-200 bg-gray-50 text-center p-12',
  solid: 'bg-white border border-gray-200 rounded-xl text-center p-12',
  compact: 'text-center py-8 px-4',
}[variant];
```

#### 1-4. KPICard: `compact` size, `iconPosition` variant 추가

**File:** `components/kpi/KPICard.tsx`

**Current State:**
- 단일 사이즈 (p-5, text-3xl)
- 아이콘은 항상 오른쪽 상단

**Changes:**
- `size?: 'default' | 'compact'` prop 추가
- compact: `p-3`, 값 `text-xl`, 타이틀 `text-xs`
- `iconPosition?: 'right' | 'left'` prop 추가

```typescript
export interface KPICardProps {
  // ...existing
  size?: 'default' | 'compact';         // NEW
  iconPosition?: 'right' | 'left';       // NEW
}
```

```typescript
// Size variants
const sizeConfig = {
  default: { padding: 'p-5', valueSize: 'text-3xl', titleSize: 'text-sm' },
  compact: { padding: 'p-3', valueSize: 'text-xl', titleSize: 'text-xs' },
};
const cfg = sizeConfig[size || 'default'];
```

### Verification
```bash
cd /Users/tykim/Documents/ola-b2b-monitoring
pnpm build:frontend-next
```
- 빌드 성공 확인
- 기존 사용처 11+11+10+9+9+8+8+5+4+4+4 = 83곳에서 UI 깨짐 없음 확인 (기존 default 값 유지)

### 완료 체크리스트
- [ ] `pnpm build:frontend-next` 성공
- [ ] 영향받는 페이지 UI 깨짐 없음
- [ ] git commit 생성: `git commit -m "refactor(frontend): Phase 1 - 공통 컴포넌트 variant 확장 (StatusBadge, Modal, EmptyState, KPICard)"`
- [ ] Progress Tracker에서 ⬜를 ✅로 변경

---

## Phase 2: Log Table 3-way Copy Consolidation

### Goal
동일한 로그 테이블 코드가 3곳에 복사되어 있으므로, DataTable + SearchInput 조합의 단일 공통 `LogTable` 컴포넌트를 생성하고 3곳을 교체한다.

### 실행 전 체크리스트
- [ ] 선행 Phase 완료 확인 (Phase 1)
- [ ] 대상 파일을 Read로 현재 상태 확인
- [ ] git 상태 clean 확인

### Dependencies
- Phase 1 (EmptyState compact variant 필요)

### Target Files

| # | File (Full Path) | Action |
|---|-----------------|--------|
| 1 | `components/LogExplorer.tsx` | DataTable 기반 LogTable로 교체 |
| 2 | `widgets/log-table-widget/ui.tsx` | LogTable import로 교체, 대부분 코드 제거 |
| 3 | `widgets/log-table-widget/ui/LogTableWidget.tsx` | LogTable import로 교체, 대부분 코드 제거 |

### New File
**`components/log/LogTable.tsx`** (새로 생성)

### Detailed Changes

#### 2-1. 새 공통 LogTable 컴포넌트 생성

**File:** `components/log/LogTable.tsx` (NEW)

- `DataTable` compound component 사용
- `SearchInput` 사용 (또는 `DataTable.Search`)
- Column 정의: Time, Tenant, User Input, LLM Response
- `EmptyState` compact variant 사용 (empty message)
- Gemini 분석 버튼 및 결과 표시 유지
- Props: `logs: B2BLog[]`, `title?: string`, `onAnalyze?: (logs: B2BLog[]) => void`

```typescript
// LogTable.tsx 핵심 구조
import { DataTable, Column } from '@/components/compound/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';

interface LogTableProps {
  logs: B2BLog[];
  title?: string;
  analysisResult?: string | null;
  isAnalyzing?: boolean;
  onAnalyze?: () => void;
  analysisError?: string | null;
}

const columns: Column<B2BLog>[] = [
  { key: 'timestamp', header: 'Time', render: (_, row) => formatTime(row.timestamp) },
  { key: 'tenant_id', header: 'Tenant', render: (_, row) => <TenantBadge id={row.tenant_id} /> },
  { key: 'user_input', header: 'User Input', render: (_, row) => <ScrollableCell text={row.user_input} /> },
  { key: 'llm_response', header: 'LLM Response', render: (_, row) => <ScrollableCell text={row.llm_response} /> },
];

export default function LogTable({ logs, title, ... }: LogTableProps) {
  return (
    <DataTable data={logs} columns={columns} searchFields={['user_input', 'tenant_id', 'llm_response']}>
      <DataTable.Toolbar>
        <DataTable.Search placeholder="Search by User Input, Tenant, or Response..." />
        {onAnalyze && <AnalyzeButton ... />}
      </DataTable.Toolbar>
      <DataTable.Content>
        <DataTable.Header />
        <DataTable.Body emptyMessage="No logs found matching your criteria." />
      </DataTable.Content>
      <DataTable.Footer />
    </DataTable>
  );
}
```

#### 2-2. LogExplorer.tsx 교체

**File:** `components/LogExplorer.tsx`

**Before:** 150줄, 자체 `<table>`, 자체 검색, 자체 empty state
**After:** LogTable import, ~30줄

```typescript
import LogTable from '@/components/log/LogTable';
import { useAnalyzeLogsWithGemini } from '@/hooks/queries';

const LogExplorer: React.FC<LogExplorerProps> = ({ logs }) => {
  const { mutate, data, isPending, error } = useAnalyzeLogsWithGemini();
  return (
    <div className="p-6 h-full flex flex-col">
      <LogTable
        logs={logs}
        title="Log Explorer (BigQuery)"
        analysisResult={data}
        isAnalyzing={isPending}
        onAnalyze={() => mutate(logs.slice(0, 20) as any)}
        analysisError={error?.message}
      />
    </div>
  );
};
```

#### 2-3. widgets/log-table-widget/ui.tsx 교체

**File:** `widgets/log-table-widget/ui.tsx`

**Before:** 150줄, LogExplorer 복사본
**After:** LogTable import, ~20줄 (또는 LogExplorer re-export)

#### 2-4. widgets/log-table-widget/ui/LogTableWidget.tsx 교체

**File:** `widgets/log-table-widget/ui/LogTableWidget.tsx`

**Before:** 144줄, LogExplorer 복사본
**After:** LogTable import, ~20줄

### Verification
```bash
pnpm build:frontend-next
```
- 3곳 모두 로그 테이블이 동일하게 렌더링되는지 수동 확인
- 검색 기능 동작 확인
- Gemini 분석 버튼 동작 확인
- Empty state 표시 확인

### 완료 체크리스트
- [ ] `pnpm build:frontend-next` 성공
- [ ] 영향받는 페이지 UI 깨짐 없음
- [ ] git commit 생성: `git commit -m "refactor(frontend): Phase 2 - 로그 테이블 3중 복사본을 LogTable 공통 컴포넌트로 통합"`
- [ ] Progress Tracker에서 ⬜를 ✅로 변경

---

## Phase 3: batch-analysis 3 Tabs Standardization

### Goal
ChatQualityTab, FAQAnalysisTab, SessionAnalysisTab에서 인라인 `<table>`, KPI, StatusBadge, 모달, pagination을 모두 공통 컴포넌트로 교체한다.

### 실행 전 체크리스트
- [ ] 선행 Phase 완료 확인 (Phase 1)
- [ ] 대상 파일을 Read로 현재 상태 확인
- [ ] git 상태 clean 확인

### Dependencies
- Phase 1 (StatusBadge purple variant, KPICard compact, EmptyState compact)

### Target Files

| # | File (Full Path) | Changes |
|---|-----------------|---------|
| 1 | `app/dashboard/admin/batch-analysis/components/ChatQualityTab.tsx` | `<table>` -> DataTable, 5 KPI -> KPICard, getStatusColor -> StatusBadge, confirm() -> ConfirmDialog |
| 2 | `app/dashboard/admin/batch-analysis/components/FAQAnalysisTab.tsx` | `<table>` -> DataTable, 4 KPI -> KPICard, getStatusColor -> StatusBadge, 자체 모달 -> Modal |
| 3 | `app/dashboard/admin/batch-analysis/components/SessionAnalysisTab.tsx` | `<table>` -> DataTable, 5 KPI -> KPICard, 인라인 badge -> StatusBadge, 자체 pagination -> DataTable.Pagination |

### Detailed Changes

#### 3-1. ChatQualityTab.tsx

**File:** `app/dashboard/admin/batch-analysis/components/ChatQualityTab.tsx`

**Replacements:**

| Inline Pattern | Common Component | Detail |
|---------------|-----------------|--------|
| 5개 `<div className="bg-white ...">` KPI 블록 | `<KPICard>` | title, value, subtitle, status 매핑 |
| `<table className="w-full ...">` | `<DataTable>` | columns 정의, DataTable.Body 사용 |
| `getStatusColor()` 함수 + 인라인 span | `<StatusBadge>` | variant 매핑: completed->success, failed->error, running->info, pending->neutral |
| `confirm('삭제하시겠습니까?')` | `<ConfirmDialog>` | 이미 import는 있으나, 브라우저 confirm() 대신 ConfirmDialog state 활용 |
| 인라인 empty `<tr><td>...데이터가 없습니다</td></tr>` | `DataTable.Body emptyMessage` | emptyMessage prop 전달 |
| 자체 expanded row 토글 로직 | `DataTable.Body expandable + renderExpandedRow` | DataTable의 내장 expandable 기능 활용 |

**KPI 매핑 (5개):**
```typescript
// Before: 인라인 div 블록들
<div className="bg-white border ...">
  <p className="text-sm text-gray-500">총 작업 수</p>
  <p className="text-2xl font-bold">{stats.totalJobs}</p>
</div>

// After:
<Dashboard.KPISection columns={5}>
  <KPICard title="총 작업 수" value={stats.totalJobs} format="number" />
  <KPICard title="완료" value={stats.completedJobs} status="success" format="number" />
  <KPICard title="실행 중" value={stats.runningJobs} status="warning" format="number" />
  <KPICard title="실패" value={stats.failedJobs} status="error" format="number" />
  <KPICard title="평균 분석 시간" value={stats.avgDuration} subtitle="초" />
</Dashboard.KPISection>
```

**DataTable 매핑:**
```typescript
const columns: Column<BatchAnalysisJob>[] = [
  { key: 'name', header: '작업명', sortable: true },
  { key: 'status', header: '상태', render: (_, row) => <StatusBadge label={row.status} variant={statusVariantMap[row.status]} /> },
  { key: 'tenantId', header: '테넌트' },
  { key: 'createdAt', header: '생성일', sortable: true, render: (_, row) => formatDate(row.createdAt) },
  { key: 'actions', header: '액션', render: (_, row) => <ActionButtons job={row} /> },
];
```

#### 3-2. FAQAnalysisTab.tsx

**File:** `app/dashboard/admin/batch-analysis/components/FAQAnalysisTab.tsx`

**Replacements:**

| Inline Pattern | Common Component | Detail |
|---------------|-----------------|--------|
| 4개 인라인 KPI div | `<KPICard>` | title, value 매핑 |
| `<table>` | `<DataTable>` | columns 정의 |
| `getStatusColor()` | `<StatusBadge>` | variant 매핑 |
| 자체 모달 (fixed inset-0 div) | `<Modal>` | isOpen, onClose, title, children |
| 인라인 empty 메시지 | `EmptyState` compact 또는 DataTable emptyMessage | |

#### 3-3. SessionAnalysisTab.tsx

**File:** `app/dashboard/admin/batch-analysis/components/SessionAnalysisTab.tsx`

**Replacements:**

| Inline Pattern | Common Component | Detail |
|---------------|-----------------|--------|
| 5개 인라인 KPI div | `<KPICard>` | title, value 매핑 |
| `<table>` | `<DataTable>` | columns 정의 |
| 인라인 badge span | `<StatusBadge>` | resolved->success, unresolved->error, partial->warning |
| 자체 pagination (page state, 이전/다음 버튼) | `<DataTable.Pagination>` | pageSize, pageSizeOptions |
| 인라인 empty 메시지 | DataTable emptyMessage | |

### Verification
```bash
pnpm build:frontend-next
```
- 각 탭 렌더링 확인 (KPI 카드 스타일, 테이블 데이터, 정렬, 페이지네이션)
- StatusBadge 색상 매핑 확인
- 모달 열기/닫기 확인 (FAQAnalysisTab)
- ConfirmDialog 동작 확인 (ChatQualityTab 삭제)
- Expandable rows 동작 확인 (ChatQualityTab)

### 완료 체크리스트
- [ ] `pnpm build:frontend-next` 성공
- [ ] 영향받는 페이지 UI 깨짐 없음
- [ ] git commit 생성: `git commit -m "refactor(frontend): Phase 3 - batch-analysis 3개 탭을 공통 컴포넌트(DataTable, KPICard, StatusBadge)로 표준화"`
- [ ] Progress Tracker에서 ⬜를 ✅로 변경

---

## Phase 4: Self-contained Modal/Dialog Replacement

### Goal
자체 구현된 모달/다이얼로그를 `Modal` 컴포넌트로 교체한다.

### 실행 전 체크리스트
- [ ] 선행 Phase 완료 확인 (Phase 1)
- [ ] 대상 파일을 Read로 현재 상태 확인
- [ ] git 상태 clean 확인

### Dependencies
- Phase 1 (Modal size 확장)

### Target Files

| # | File (Full Path) | Action |
|---|-----------------|--------|
| 1 | `components/charts/UserActivityDialog.tsx` | `fixed inset-0 z-50` 자체 모달 -> `Modal(size:'xl')` |
| 2 | `app/dashboard/admin/problematic-rules/page.tsx` | 2개 자체 모달 (상세보기, 규칙 생성/수정) -> `Modal` |
| 3 | `app/dashboard/admin/batch-analysis/components/FAQAnalysisTab.tsx` | `[DONE IN PHASE 3]` |

### Detailed Changes

#### 4-1. UserActivityDialog.tsx

**File:** `components/charts/UserActivityDialog.tsx`

**Before:**
```tsx
// 자체 모달 래퍼
<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
  <div className="absolute inset-0 bg-black/50" onClick={onClose} />
  <div className="relative z-10 w-full max-w-5xl bg-white rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
    {/* Header with X button */}
    {/* Content */}
  </div>
</div>
```

**After:**
```tsx
import Modal from '@/components/ui/Modal';

<Modal isOpen={isOpen} onClose={onClose} title={`사용자 활동 상세 - ${userId}`} size="xl">
  {/* Content only - no header/backdrop needed */}
</Modal>
```

- 기존 자체 구현 `<div className="fixed inset-0 ...">` 전체 제거
- Modal 컴포넌트의 `xl` size = `max-w-6xl` (기존 max-w-5xl보다 약간 넓지만 호환)
- 또는 `maxWidth="max-w-5xl"` custom prop 활용 (Phase 1에서 추가)

#### 4-2. problematic-rules/page.tsx

**File:** `app/dashboard/admin/problematic-rules/page.tsx`

**Before:** 2개의 인라인 모달 (조건부 렌더링, fixed position)
**After:** `<Modal>` 2개 사용

```tsx
// 상세보기 모달
<Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="규칙 상세" size="lg">
  {/* rule detail content */}
</Modal>

// 생성/수정 모달
<Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingRule ? '규칙 수정' : '규칙 생성'} size="lg">
  {/* rule form content */}
</Modal>
```

### Verification
```bash
pnpm build:frontend-next
```
- UserActivityDialog: 열기/닫기, 데이터 로딩, 페이지네이션 동작 확인
- problematic-rules: 규칙 상세보기 모달, 생성/수정 모달 동작 확인
- 모달 backdrop 클릭 닫기 동작 확인
- 모달 내부 스크롤 동작 확인

### 완료 체크리스트
- [ ] `pnpm build:frontend-next` 성공
- [ ] 영향받는 페이지 UI 깨짐 없음
- [ ] git commit 생성: `git commit -m "refactor(frontend): Phase 4 - 자체 모달 오버레이를 Modal 공통 컴포넌트로 교체"`
- [ ] Progress Tracker에서 ⬜를 ✅로 변경

---

## Phase 5: Inline EmptyState Replacement (10 Locations)

### Goal
인라인으로 구현된 빈 상태 메시지를 `EmptyState` 컴포넌트로 통일한다.

### 실행 전 체크리스트
- [ ] 선행 Phase 완료 확인 (Phase 1, Phase 2, Phase 3)
- [ ] 대상 파일을 Read로 현재 상태 확인
- [ ] git 상태 clean 확인

### Dependencies
- Phase 1 (EmptyState compact variant)
- Phase 2 (LogExplorer, log-table-widget은 이미 처리)
- Phase 3 (ChatQualityTab, FAQAnalysisTab, SessionAnalysisTab은 이미 처리)

### Target Files

| # | File (Full Path) | Status |
|---|-----------------|--------|
| 1 | `components/charts/UserActivityDialog.tsx` | REPLACE |
| 2 | `components/faq-analysis/FAQAnalysisSection.tsx` | REPLACE |
| 3 | `components/analysis/SessionList.tsx` | REPLACE |
| 4 | `components/user-profiling/CategoryDistribution.tsx` | REPLACE |
| 5 | `app/dashboard/admin/batch-analysis/[id]/page.tsx` | REPLACE |
| 6 | `app/dashboard/admin/batch-analysis/prompts/page.tsx` | REPLACE |
| 7 | `app/dashboard/admin/batch-analysis/issue-frequency/page.tsx` | REPLACE |
| 8 | `app/dashboard/admin/problematic-rules/page.tsx` | REPLACE |
| 9 | `app/dashboard/admin/batch-analysis/faq/[id]/page.tsx` | REPLACE |
| 10 | `app/dashboard/admin/analysis/[id]/page.tsx` | REPLACE |

### Detailed Changes

#### 5-1. UserActivityDialog.tsx

**Inline pattern:**
```tsx
{conversations.length === 0 && (
  <div className="text-center py-12 text-gray-400">
    해당 기간에 대화 기록이 없습니다.
  </div>
)}
```

**Replace with:**
```tsx
import { EmptyState } from '@/components/ui/EmptyState';

{conversations.length === 0 && (
  <EmptyState variant="compact" description="해당 기간에 대화 기록이 없습니다." />
)}
```

#### 5-2. FAQAnalysisSection.tsx

**Inline pattern:** 빈 상태 텍스트 div
**Replace with:** `<EmptyState variant="compact" description="..." />`

#### 5-3. SessionList.tsx

**Inline pattern:** "세션이 없습니다" 텍스트
**Replace with:** `<EmptyState variant="compact" description="세션이 없습니다." />`

#### 5-4. CategoryDistribution.tsx

**Inline pattern:** 데이터 없음 메시지
**Replace with:** `<EmptyState variant="compact" description="카테고리 데이터가 없습니다." />`

#### 5-5. batch-analysis/[id]/page.tsx

**Inline pattern:** 분석 결과 없음 메시지
**Replace with:** `<EmptyState description="분석 결과가 없습니다." />`

#### 5-6. batch-analysis/prompts/page.tsx

**Inline pattern:** 프롬프트 없음 메시지
**Replace with:** `<EmptyState description="등록된 프롬프트 템플릿이 없습니다." action={...} />`

#### 5-7. batch-analysis/issue-frequency/page.tsx

**Inline pattern:** 이슈 빈도 데이터 없음
**Replace with:** `<EmptyState description="이슈 빈도 데이터가 없습니다." />`

#### 5-8. admin/problematic-rules/page.tsx

**Inline pattern:** 규칙 없음 메시지
**Replace with:** `<EmptyState description="등록된 규칙이 없습니다." action={{ label: '규칙 추가', onClick: () => setIsFormOpen(true) }} />`

#### 5-9. batch-analysis/faq/[id]/page.tsx

**Inline pattern:** FAQ 분석 결과 없음
**Replace with:** `<EmptyState description="FAQ 분석 결과가 없습니다." />`

#### 5-10. admin/analysis/[id]/page.tsx

**Inline pattern:** 분석 세션 없음
**Replace with:** `<EmptyState description="분석 데이터가 없습니다." />`

### Verification
```bash
pnpm build:frontend-next
```
- 각 페이지에서 데이터 없을 때 EmptyState 컴포넌트가 올바르게 표시되는지 확인
- compact variant가 테이블 내부에서 적절한 사이즈로 렌더링되는지 확인
- action 버튼이 있는 경우 클릭 동작 확인

### 완료 체크리스트
- [ ] `pnpm build:frontend-next` 성공
- [ ] 영향받는 페이지 UI 깨짐 없음
- [ ] git commit 생성: `git commit -m "refactor(frontend): Phase 5 - 인라인 빈 상태 메시지 10곳을 EmptyState 공통 컴포넌트로 교체"`
- [ ] Progress Tracker에서 ⬜를 ✅로 변경

---

## Phase 6: Inline StatusBadge Replacement (6 Locations)

### Goal
인라인 상태 뱃지 (조건부 className, getStatusColor 함수 등)를 `StatusBadge` 컴포넌트로 교체한다.

### 실행 전 체크리스트
- [ ] 선행 Phase 완료 확인 (Phase 1, Phase 3)
- [ ] 대상 파일을 Read로 현재 상태 확인
- [ ] git 상태 clean 확인

### Dependencies
- Phase 1 (StatusBadge purple variant, icon slot)
- Phase 3 (ChatQualityTab, FAQAnalysisTab, SessionAnalysisTab은 이미 처리)

### Target Files

| # | File (Full Path) | Status | Inline Count |
|---|-----------------|--------|-------------|
| 1 | `app/dashboard/admin/problematic-rules/page.tsx` | REPLACE | 2곳 |
| 2 | `app/dashboard/admin/batch-analysis/prompts/page.tsx` | REPLACE | 1곳 |
| 3 | `app/dashboard/admin/users/page.tsx` | REPLACE | 1곳 |
| 4 | `app/dashboard/admin/filters/page.tsx` | REPLACE | 1곳 |
| 5 | `app/dashboard/report-monitoring/page.tsx` | REPLACE | 4개 상태 |
| 6 | `app/dashboard/user-analytics/page.tsx` | REPLACE | 1곳 |

### Detailed Changes

#### 6-1. problematic-rules/page.tsx (2곳)

**Inline pattern:**
```tsx
// 규칙 활성/비활성 상태
<span className={`px-2 py-1 rounded text-xs ${rule.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
  {rule.enabled ? '활성' : '비활성'}
</span>

// 규칙 심각도
<span className={`px-2 py-1 rounded text-xs ${severityColorMap[rule.severity]}`}>
  {rule.severity}
</span>
```

**Replace with:**
```tsx
import { StatusBadge } from '@/components/ui/StatusBadge';

<StatusBadge label={rule.enabled ? '활성' : '비활성'} variant={rule.enabled ? 'success' : 'neutral'} />
<StatusBadge label={rule.severity} variant={severityToVariant(rule.severity)} />
```

#### 6-2. batch-analysis/prompts/page.tsx

**Inline pattern:** 프롬프트 상태 뱃지 (active/inactive)
**Replace with:** `<StatusBadge label={...} variant={...} />`

#### 6-3. admin/users/page.tsx

**Inline pattern:** 사용자 상태 뱃지 (active/inactive/pending)
**Replace with:**
```tsx
<StatusBadge
  label={user.status === 'active' ? '활성' : user.status === 'pending' ? '대기' : '비활성'}
  variant={user.status === 'active' ? 'success' : user.status === 'pending' ? 'warning' : 'neutral'}
/>
```

#### 6-4. admin/filters/page.tsx

**Inline pattern:** 필터 활성/비활성 뱃지
**Replace with:** `<StatusBadge label={...} variant={filter.active ? 'success' : 'neutral'} />`

#### 6-5. report-monitoring/page.tsx (4개 상태)

**Inline pattern:**
```tsx
const getStatusColor = (status: string) => {
  switch(status) {
    case 'success': return 'bg-green-100 text-green-700';
    case 'warning': return 'bg-yellow-100 text-yellow-700';
    case 'error': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-500';
  }
};
```

**Replace with:**
```tsx
import { StatusBadge, BadgeVariant } from '@/components/ui/StatusBadge';

const statusVariantMap: Record<string, BadgeVariant> = {
  success: 'success',
  warning: 'warning',
  error: 'error',
  pending: 'neutral',
};

<StatusBadge label={status} variant={statusVariantMap[status] || 'neutral'} />
```

**Side effect:** `getStatusColor()` 함수 제거 가능

#### 6-6. user-analytics/page.tsx

**Inline pattern:** 사용자 활동 상태 뱃지
**Replace with:** `<StatusBadge label={...} variant={...} />`

### Verification
```bash
pnpm build:frontend-next
```
- 각 페이지에서 상태 뱃지 색상이 기존과 일치하는지 확인
- 뱃지 사이즈/패딩이 일관적인지 확인

### 완료 체크리스트
- [ ] `pnpm build:frontend-next` 성공
- [ ] 영향받는 페이지 UI 깨짐 없음
- [ ] git commit 생성: `git commit -m "refactor(frontend): Phase 6 - 인라인 상태 뱃지 6곳을 StatusBadge 공통 컴포넌트로 교체"`
- [ ] Progress Tracker에서 ⬜를 ✅로 변경

---

## Phase 7: Inline KPI Card Replacement (Remaining)

### Goal
Phase 3에서 처리되지 않은 나머지 인라인 KPI 카드를 `KPICard` 컴포넌트로 교체한다.

### 실행 전 체크리스트
- [ ] 선행 Phase 완료 확인 (Phase 1, Phase 3)
- [ ] 대상 파일을 Read로 현재 상태 확인
- [ ] git 상태 clean 확인

### Dependencies
- Phase 1 (KPICard compact, iconPosition)
- Phase 3 (batch-analysis 탭들은 이미 처리)

### Target Files

| # | File (Full Path) | Status | KPI Count |
|---|-----------------|--------|-----------|
| 1 | `components/charts/UserActivityDialog.tsx` | REPLACE | 4개 |
| 2 | `app/dashboard/admin/batch-analysis/issue-frequency/page.tsx` | REPLACE | 3개 |

### Detailed Changes

#### 7-1. UserActivityDialog.tsx (4개 KPI)

**Inline pattern:**
```tsx
<div className="grid grid-cols-4 gap-4 mb-6">
  <div className="bg-gray-50 rounded-lg p-3">
    <p className="text-xs text-gray-400">총 대화</p>
    <p className="text-xl font-bold text-gray-900">{summary.totalConversations}</p>
  </div>
  {/* ... 3 more */}
</div>
```

**Replace with:**
```tsx
import KPICard from '@/components/kpi/KPICard';

<div className="grid grid-cols-4 gap-4 mb-6">
  <KPICard title="총 대화" value={summary.totalConversations} size="compact" format="number" />
  <KPICard title="성공률" value={summary.successRate} size="compact" format="percentage" status="success" />
  <KPICard title="총 토큰" value={summary.totalTokens} size="compact" format="tokens" />
  <KPICard title="평균 응답시간" value={summary.avgResponseTime} size="compact" subtitle="ms" />
</div>
```

#### 7-2. batch-analysis/issue-frequency/page.tsx (3개 KPI)

**Inline pattern:** 3개의 인라인 통계 카드
**Replace with:**
```tsx
<Dashboard.KPISection columns={3}>
  <KPICard title="총 이슈 수" value={totalIssues} format="number" />
  <KPICard title="주요 이슈" value={topIssue} />
  <KPICard title="평균 빈도" value={avgFrequency} format="number" />
</Dashboard.KPISection>
```

### Verification
```bash
pnpm build:frontend-next
```
- UserActivityDialog의 KPI 카드 compact 렌더링 확인
- issue-frequency 페이지 KPI 카드 렌더링 확인
- 값 포맷팅 (number, percentage, tokens) 정확성 확인

### 완료 체크리스트
- [ ] `pnpm build:frontend-next` 성공
- [ ] 영향받는 페이지 UI 깨짐 없음
- [ ] git commit 생성: `git commit -m "refactor(frontend): Phase 7 - 인라인 KPI 카드 7개를 KPICard 공통 컴포넌트로 교체"`
- [ ] Progress Tracker에서 ⬜를 ✅로 변경

---

## Phase 8: Chart Compound Migration (17 Charts)

### Goal
현재 채택률 0%인 `Chart` compound component를 17개 차트 컴포넌트에 적용한다. 각 차트의 자체 래퍼 (div + h3 + ResponsiveContainer)를 `Chart` 또는 `Chart.Wrapper`로 교체한다.

### 실행 전 체크리스트
- [ ] 선행 Phase 완료 확인 (Phase 1)
- [ ] 대상 파일을 Read로 현재 상태 확인
- [ ] git 상태 clean 확인

### Dependencies
- Phase 1 완료 (직접적 의존은 없으나, 전체 빌드 안정성 보장 필요)

### Target Files

| # | File (Full Path) | Chart Type |
|---|-----------------|-----------|
| 1 | `components/charts/CostTrendChart.tsx` | ComposedChart (Bar + Line) |
| 2 | `components/charts/QueryResponseScatterPlot.tsx` | ScatterChart |
| 3 | `components/charts/UserRequestsBarChart.tsx` | BarChart |
| 4 | `components/charts/UserTokensPieChart.tsx` | PieChart |
| 5 | `components/charts/TokenScatterPlot.tsx` | ScatterChart |
| 6 | `components/charts/ErrorGauge.tsx` | RadialBarChart |
| 7 | `components/charts/TokenEfficiencyTrendChart.tsx` | LineChart |
| 8 | `components/charts/RealtimeTrafficChart.tsx` | LineChart |
| 9 | `components/charts/TenantPieChart.tsx` | PieChart |
| 10 | `components/Dashboard.tsx` | 2개 인라인 차트 |
| 11 | `app/dashboard/etl/minkabu/page.tsx` | 2개 인라인 차트 |
| 12 | `app/dashboard/etl/wind/page.tsx` | 2개 인라인 차트 |
| 13 | `app/dashboard/admin/batch-analysis/issue-frequency/page.tsx` | 1개 BarChart |

### Detailed Changes

#### Migration Pattern (공통)

**Before (typical pattern):**
```tsx
export default function SomeChart({ data, title }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title || 'Chart Title'}</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          표시할 데이터가 없습니다
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title || 'Chart Title'}</h3>
      <div style={{ height: 256 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            {/* ... chart content ... */}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

**After:**
```tsx
import { Chart, CHART_COLORS } from '@/components/compound/Chart';

export default function SomeChart({ data, title }: Props) {
  if (!data || data.length === 0) {
    return <Chart.NoData title={title || 'Chart Title'} />;
  }

  return (
    <Chart title={title || 'Chart Title'} height={256}>
      <LineChart data={data}>
        {/* ... chart content ... */}
      </LineChart>
    </Chart>
  );
}
```

**Key changes per chart:**
1. 자체 wrapper div 제거 -> `<Chart>` 또는 `<Chart.Wrapper>` 사용
2. 자체 `<ResponsiveContainer>` 제거 -> `<Chart>` 내부에서 자동 래핑
3. 빈 데이터 상태 -> `<Chart.NoData>` 사용
4. 로딩 상태 (있는 경우) -> `<Chart.Loading>` 사용
5. `CHART_COLORS`를 `components/compound/Chart/index.tsx`에서 import (chart-theme.ts 대체 가능)

#### 8-1 ~ 8-9. components/charts/*.tsx (9개 개별 차트)

각 차트 파일에 동일 패턴 적용:

| File | Specific Notes |
|------|---------------|
| `CostTrendChart.tsx` | ComposedChart, 이미 chart-theme.ts import -> Chart compound의 CHART_COLORS로 통합 |
| `QueryResponseScatterPlot.tsx` | ScatterChart, custom tooltip -> 유지, 래퍼만 교체 |
| `UserRequestsBarChart.tsx` | BarChart, Legend 자체 구현 -> Chart.Legend로 교체 가능 |
| `UserTokensPieChart.tsx` | PieChart, custom center label -> 유지 |
| `TokenScatterPlot.tsx` | ScatterChart |
| `ErrorGauge.tsx` | RadialBarChart, CHART_COLORS.bgFill 사용 -> 유지 |
| `TokenEfficiencyTrendChart.tsx` | LineChart, dual Y axis |
| `RealtimeTrafficChart.tsx` | LineChart, gradient fill |
| `TenantPieChart.tsx` | PieChart, Legend 포함 |

#### 8-10. components/Dashboard.tsx (2개 인라인 차트)

**인라인 차트 래퍼를 `Chart.Wrapper`로 교체**

#### 8-11 ~ 8-12. ETL pages (4개 인라인 차트)

**Files:**
- `app/dashboard/etl/minkabu/page.tsx` - 2개 차트
- `app/dashboard/etl/wind/page.tsx` - 2개 차트

**인라인 차트 래퍼 + ResponsiveContainer를 `Chart`로 교체**

#### 8-13. issue-frequency/page.tsx (1개 BarChart)

**인라인 차트를 `Chart`로 교체**

### CHART_COLORS 통합 전략

현재 두 곳에 CHART_COLORS가 존재:
1. `components/compound/Chart/index.tsx` - palette 색상 (primary, secondary, success 등)
2. `components/charts/chart-theme.ts` - 축/그리드/툴팁 스타일

**통합 방안:**
- `chart-theme.ts`의 `CHART_COLORS`와 `TOOLTIP_STYLE`을 `Chart/index.tsx`로 병합
- 또는 `chart-theme.ts`를 유지하되 `Chart/index.tsx`에서 re-export
- 차트 컴포넌트들은 하나의 소스에서만 import

```typescript
// Chart/index.tsx에 추가
export { CHART_COLORS as CHART_THEME, TOOLTIP_STYLE } from '@/components/charts/chart-theme';
// 기존 CHART_COLORS (palette)는 그대로 유지
```

### Verification
```bash
pnpm build:frontend-next
```
- 모든 17개 차트가 올바르게 렌더링되는지 확인
- 차트 크기/비율이 기존과 동일한지 확인
- tooltip, legend, axis 스타일이 유지되는지 확인
- 빈 데이터 상태에서 Chart.NoData가 올바르게 표시되는지 확인
- 로딩 상태에서 Chart.Loading이 올바르게 표시되는지 확인

### 완료 체크리스트
- [ ] `pnpm build:frontend-next` 성공
- [ ] 영향받는 페이지 UI 깨짐 없음
- [ ] git commit 생성: `git commit -m "refactor(frontend): Phase 8 - 17개 차트를 Chart compound 컴포넌트로 마이그레이션 (채택률 0% -> 100%)"`
- [ ] Progress Tracker에서 ⬜를 ✅로 변경

---

## Phase 9: Miscellaneous Small Replacements

### Goal
이전 Phase에서 커버되지 않은 소규모 교체를 처리한다.

### 실행 전 체크리스트
- [ ] 선행 Phase 완료 확인 (Phase 3)
- [ ] 대상 파일을 Read로 현재 상태 확인
- [ ] git 상태 clean 확인

### Dependencies
- Phase 3 (ChatQualityTab confirm() 처리 완료)

### Target Files

| # | File (Full Path) | Status | Change |
|---|-----------------|--------|--------|
| 1 | `app/dashboard/admin/batch-analysis/components/ChatQualityTab.tsx` | `[DONE IN PHASE 3]` | confirm() -> ConfirmDialog |
| 2 | `app/dashboard/admin/batch-analysis/issue-frequency/page.tsx` | REPLACE | startDate/endDate 직접 관리 -> DateRangeFilter |

### Detailed Changes

#### 9-1. issue-frequency/page.tsx: DateRangeFilter 교체

**File:** `app/dashboard/admin/batch-analysis/issue-frequency/page.tsx`

**Before:**
```tsx
const [startDate, setStartDate] = useState('');
const [endDate, setEndDate] = useState('');

<div className="flex gap-2">
  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
  <span>~</span>
  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
</div>
```

**After:**
```tsx
import DateRangeFilter, { DateRange } from '@/components/ui/DateRangeFilter';

const [dateRange, setDateRange] = useState<DateRange | null>(null);

<DateRangeFilter
  defaultPreset="week"
  onChange={(range) => {
    setDateRange(range);
    fetchData(range.startDate, range.endDate);
  }}
/>
```

### Verification
```bash
pnpm build:frontend-next
```
- issue-frequency 페이지에서 DateRangeFilter 프리셋 버튼 동작 확인
- 커스텀 날짜 선택 동작 확인
- 날짜 변경 시 데이터 갱신 확인

### 완료 체크리스트
- [ ] `pnpm build:frontend-next` 성공
- [ ] 영향받는 페이지 UI 깨짐 없음
- [ ] git commit 생성: `git commit -m "refactor(frontend): Phase 9 - issue-frequency 페이지의 인라인 날짜 선택을 DateRangeFilter로 교체"`
- [ ] Progress Tracker에서 ⬜를 ✅로 변경

---

## 리스크 및 완화 전략

### Risk Matrix

| Risk | Impact | Probability | Mitigation |
|------|--------|------------|-----------|
| Phase 1 확장으로 기존 사용처 스타일 깨짐 | HIGH | LOW | default 값 유지, 기존 props 변경 없음 |
| DataTable column 정의 오류로 데이터 누락 | MEDIUM | MEDIUM | 기존 `<table>` 렌더링과 1:1 비교 |
| Modal size 변경으로 레이아웃 깨짐 | MEDIUM | LOW | 기존 max-w 값과 동일하거나 유사한 값 사용 |
| Chart compound 래핑으로 차트 크기 변경 | MEDIUM | MEDIUM | height prop 명시, ResponsiveContainer 동작 확인 |
| StatusBadge variant 매핑 오류 | LOW | LOW | variant 매핑 테이블 미리 정의 |
| 3중 로그 테이블 통합 시 미묘한 차이 누락 | MEDIUM | MEDIUM | diff로 3개 파일 비교 후 차이점 목록화 |
| CHART_COLORS 이름 충돌 (compound vs chart-theme) | LOW | HIGH | 명시적 re-export 또는 별칭 사용 |
| 빌드 실패로 다음 Phase 차단 | HIGH | LOW | Phase별 독립 빌드 검증 |

### Mitigation Strategies

1. **Phase별 독립 빌드 검증**: 각 Phase 완료 후 반드시 `pnpm build:frontend-next` 실행. 빌드 실패 시 해당 Phase 내에서 해결 후 다음 Phase 진행.

2. **Visual Regression**: 각 Phase 완료 후 영향받는 페이지를 수동으로 브라우저에서 확인. 특히:
   - KPI 카드 값 포맷팅
   - 테이블 정렬/페이지네이션
   - 모달 열기/닫기
   - 차트 크기/비율

3. **Rollback Strategy**: 각 Phase를 별도 git commit으로 관리. 문제 발생 시 해당 Phase commit만 revert.

4. **Breaking Change Prevention**: 공통 컴포넌트 확장 시 기존 props의 default 값을 변경하지 않음. 새 props는 항상 optional with sensible defaults.

---

## Acceptance Criteria

### Phase 1: Common Component Extension
- [ ] StatusBadge에 `purple` variant 추가, `icon` prop 동작
- [ ] Modal에 `full` size 및 `maxWidth` prop 동작
- [ ] EmptyState에 `compact` variant 동작
- [ ] KPICard에 `compact` size 및 `iconPosition` prop 동작
- [ ] 기존 사용처(83곳)에서 UI 변경 없음 (default 유지)
- [ ] `pnpm build:frontend-next` 성공

### Phase 2: Log Table Consolidation
- [ ] `components/log/LogTable.tsx` 생성, DataTable 기반
- [ ] LogExplorer.tsx가 LogTable 사용 (~30줄 이하)
- [ ] widgets/log-table-widget/ui.tsx가 LogTable 사용
- [ ] widgets/log-table-widget/ui/LogTableWidget.tsx가 LogTable 사용
- [ ] 검색, Gemini 분석, empty state 동작 확인
- [ ] `pnpm build:frontend-next` 성공

### Phase 3: batch-analysis Tabs
- [ ] ChatQualityTab: DataTable, KPICard, StatusBadge, ConfirmDialog 사용
- [ ] FAQAnalysisTab: DataTable, KPICard, StatusBadge, Modal 사용
- [ ] SessionAnalysisTab: DataTable, KPICard, StatusBadge, DataTable.Pagination 사용
- [ ] 기존 자체 `<table>`, 인라인 KPI, getStatusColor(), 자체 pagination 코드 제거
- [ ] `pnpm build:frontend-next` 성공

### Phase 4: Modal/Dialog Replacement
- [ ] UserActivityDialog가 `Modal(size:'xl')` 사용
- [ ] problematic-rules 2개 모달이 `Modal` 사용
- [ ] 자체 fixed/inset-0 모달 코드 제거
- [ ] `pnpm build:frontend-next` 성공

### Phase 5: EmptyState Replacement
- [ ] 나머지 10곳에서 인라인 empty 메시지가 `EmptyState` 컴포넌트로 교체
- [ ] compact variant가 테이블 내부에서 적절히 렌더링
- [ ] `pnpm build:frontend-next` 성공

### Phase 6: StatusBadge Replacement
- [ ] 6개 파일에서 인라인 뱃지/getStatusColor()가 `StatusBadge`로 교체
- [ ] variant 매핑이 기존 색상과 일치
- [ ] `pnpm build:frontend-next` 성공

### Phase 7: KPI Card Replacement
- [ ] UserActivityDialog 4개 KPI가 `KPICard(compact)` 사용
- [ ] issue-frequency 3개 KPI가 `KPICard` 사용
- [ ] `pnpm build:frontend-next` 성공

### Phase 8: Chart Compound Migration
- [ ] 17개 차트 모두 `Chart` compound 사용 (자체 wrapper/ResponsiveContainer 제거)
- [ ] Chart.NoData, Chart.Loading 적용
- [ ] CHART_COLORS 충돌 해결 (chart-theme.ts와 compound 통합)
- [ ] 차트 크기/비율 기존과 동일
- [ ] `pnpm build:frontend-next` 성공

### Phase 9: Miscellaneous
- [ ] issue-frequency에서 DateRangeFilter 사용
- [ ] `pnpm build:frontend-next` 성공

### Final Acceptance
- [ ] 전체 `pnpm build:frontend-next` 성공
- [ ] 인라인 중복 패턴 60곳 이상 제거 완료
- [ ] 공통 컴포넌트 채택률: Dashboard(11+), DataTable(14+), Chart(17+), Modal(12+), KPICard(21+), StatusBadge(14+), EmptyState(14+)
- [ ] 코드 라인 수 순감소 (예상 -785줄 이상)
- [ ] UI 시각적 회귀 없음

---

## 파일별 영향 매트릭스

> 하나의 파일이 여러 Phase에서 수정될 수 있음. 이 매트릭스로 충돌 방지.

| 파일 경로 | Phase |
|----------|-------|
| `components/ui/StatusBadge.tsx` | 1 |
| `components/ui/Modal.tsx` | 1 |
| `components/ui/EmptyState.tsx` | 1 |
| `components/kpi/KPICard.tsx` | 1 |
| `components/log/LogTable.tsx` (NEW) | 2 |
| `components/LogExplorer.tsx` | 2 |
| `widgets/log-table-widget/ui.tsx` | 2 |
| `widgets/log-table-widget/ui/LogTableWidget.tsx` | 2 |
| `app/dashboard/admin/batch-analysis/components/ChatQualityTab.tsx` | 3 |
| `app/dashboard/admin/batch-analysis/components/FAQAnalysisTab.tsx` | 3 |
| `app/dashboard/admin/batch-analysis/components/SessionAnalysisTab.tsx` | 3 |
| `components/charts/UserActivityDialog.tsx` | 4, 5, 7 |
| `app/dashboard/admin/problematic-rules/page.tsx` | 4, 5, 6 |
| `components/faq-analysis/FAQAnalysisSection.tsx` | 5 |
| `components/analysis/SessionList.tsx` | 5 |
| `components/user-profiling/CategoryDistribution.tsx` | 5 |
| `app/dashboard/admin/batch-analysis/[id]/page.tsx` | 5 |
| `app/dashboard/admin/batch-analysis/prompts/page.tsx` | 5, 6 |
| `app/dashboard/admin/batch-analysis/issue-frequency/page.tsx` | 5, 7, 8, 9 |
| `app/dashboard/admin/batch-analysis/faq/[id]/page.tsx` | 5 |
| `app/dashboard/admin/analysis/[id]/page.tsx` | 5 |
| `app/dashboard/admin/users/page.tsx` | 6 |
| `app/dashboard/admin/filters/page.tsx` | 6 |
| `app/dashboard/report-monitoring/page.tsx` | 6 |
| `app/dashboard/user-analytics/page.tsx` | 6 |
| `components/charts/CostTrendChart.tsx` | 8 |
| `components/charts/QueryResponseScatterPlot.tsx` | 8 |
| `components/charts/UserRequestsBarChart.tsx` | 8 |
| `components/charts/UserTokensPieChart.tsx` | 8 |
| `components/charts/TokenScatterPlot.tsx` | 8 |
| `components/charts/ErrorGauge.tsx` | 8 |
| `components/charts/TokenEfficiencyTrendChart.tsx` | 8 |
| `components/charts/RealtimeTrafficChart.tsx` | 8 |
| `components/charts/TenantPieChart.tsx` | 8 |
| `components/Dashboard.tsx` | 8 |
| `app/dashboard/etl/minkabu/page.tsx` | 8 |
| `app/dashboard/etl/wind/page.tsx` | 8 |

### 다중 Phase 영향 파일 (충돌 주의)

| 파일 | Phases | 처리 전략 |
|------|--------|----------|
| `UserActivityDialog.tsx` | 4->5->7 | Phase 4(모달)->5(EmptyState)->7(KPI) 순서 준수 |
| `problematic-rules/page.tsx` | 4->5->6 | Phase 4(모달)->5(EmptyState)->6(StatusBadge) 순서 준수 |
| `issue-frequency/page.tsx` | 5->7->8->9 | Phase 5(Empty)->7(KPI)->8(Chart)->9(DateRange) 순서 준수 |
| `prompts/page.tsx` | 5->6 | Phase 5(EmptyState)->6(StatusBadge) 순서 준수 |

---

## 총괄 통계

| 지표 | Before | After (예상) |
|------|--------|-------------|
| 공통 컴포넌트 사용 횟수 | ~83회 | ~143회 |
| 인라인 중복 패턴 | ~60곳+ | 0곳 |
| Chart compound 채택률 | 0% | 100% |
| 총 변경 파일 수 | - | ~44개 |
| 코드 라인 순감소 | - | ~785줄 |

### Phase별 작업량

| Phase | 변경 파일 수 | 라인 변경 (추가/삭제) | 복잡도 |
|-------|:----------:|:--------------------:|:------:|
| 1 | 4 | +80 / -0 | Low |
| 2 | 4 (1 new) | +200 / -350 | Medium |
| 3 | 3 | +150 / -300 | High |
| 4 | 2 | +20 / -100 | Low-Med |
| 5 | 10 | +50 / -150 | Low |
| 6 | 5 | +40 / -80 | Low |
| 7 | 2 | +30 / -60 | Low |
| 8 | 13 | +200 / -400 | Med-High |
| 9 | 1 | +15 / -30 | Low |
| **Total** | **~44** | **+785 / -1,470** | - |
