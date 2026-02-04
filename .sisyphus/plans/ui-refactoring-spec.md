# UI 컴포넌트 리팩토링 실행 명세서

> **이 문서는 AI에게 작업을 위임하기 위한 실행 명세서입니다.**
> 각 Task를 순서대로 실행하고, 각 Task 완료 후 반드시 검증 기준을 확인하세요.
> 모든 Task에서 기존 UI의 시각적 결과물이 변경되지 않아야 합니다 (리팩토링 only).

---

## 프로젝트 정보

- **루트 경로**: `/Users/tykim/Documents/ola-b2b-monitoring`
- **프론트엔드 경로**: `apps/frontend-next`
- **빌드 명령**: `pnpm build:frontend-next`
- **린트 명령**: `cd apps/frontend-next && pnpm lint`
- **패키지 설치**: `cd apps/frontend-next && pnpm add @tanstack/react-query`

---

## 의존 관계 다이어그램

```
Task 1 (react-query 인프라)
  ↓
Task 2 (StatusBadge) ─┐
Task 3 (StatsFooter)  ├─→ Task 6 (Dashboard 개선) ─┐
Task 4 (EmptyState) ──┘   Task 7 (DataTable 개선)  ├─→ Task 9  (ETL 마이그레이션)
                           Task 8 (Chart 개선) ─────┘   Task 10 (CRUD 마이그레이션)
                                                         Task 11 (모니터링 마이그레이션)
                                                         Task 12 (report-monitoring 마이그레이션)
                                                         Task 13 (chatbot-quality 마이그레이션)
```

**병렬 가능**: Task 2, 3, 4는 서로 독립적이므로 병렬 실행 가능
**병렬 가능**: Task 6, 7, 8은 서로 독립적이므로 병렬 실행 가능
**병렬 가능**: Task 9, 10, 11, 12, 13은 서로 독립적이므로 병렬 실행 가능 (단, 6/7/8 완료 후)

---

## Phase 1: 인프라 설정

### Task 1: react-query 글로벌 인프라 설정

**선행 조건**: 없음

**실행 단계**:

1. 패키지 설치 확인:
   ```bash
   cd apps/frontend-next && pnpm add @tanstack/react-query
   ```
   - 이미 설치되어 있을 수 있음 (chatbot-quality 페이지에서 사용 중). `package.json`에 `@tanstack/react-query`가 있는지 먼저 확인.

2. **신규 파일 생성**: `apps/frontend-next/src/lib/query-client.ts`
   ```tsx
   import { QueryClient } from '@tanstack/react-query';

   export function makeQueryClient() {
     return new QueryClient({
       defaultOptions: {
         queries: {
           staleTime: 60 * 1000,        // 1분
           gcTime: 5 * 60 * 1000,       // 5분
           refetchOnWindowFocus: false,
           retry: 1,
         },
       },
     });
   }
   ```

3. **신규 파일 생성**: `apps/frontend-next/src/components/providers/QueryProvider.tsx`
   ```tsx
   'use client';

   import { QueryClientProvider } from '@tanstack/react-query';
   import { useState } from 'react';
   import { makeQueryClient } from '@/lib/query-client';

   export function QueryProvider({ children }: { children: React.ReactNode }) {
     const [queryClient] = useState(() => makeQueryClient());
     return (
       <QueryClientProvider client={queryClient}>
         {children}
       </QueryClientProvider>
     );
   }
   ```

4. **수정 파일**: `apps/frontend-next/src/app/layout.tsx`
   - 루트 레이아웃에 `QueryProvider`를 추가
   - 기존의 다른 Provider(AuthProvider 등) 안에 중첩되도록 배치
   - 구체적 위치: children을 감싸는 가장 바깥 Provider 레벨에 추가

5. **수정 파일**: `apps/frontend-next/src/app/dashboard/chatbot-quality/page.tsx`
   - 이 페이지에서 자체적으로 생성한 QueryClient/QueryClientProvider가 있다면 제거
   - 글로벌 QueryProvider를 사용하도록 변경
   - `useQuery` 등의 훅 호출은 그대로 유지

**검증 기준**:
- [ ] `pnpm build:frontend-next` 빌드 성공
- [ ] chatbot-quality 페이지가 정상 동작 (기존 react-query 기능 유지)
- [ ] 다른 페이지에 영향 없음

---

## Phase 2: 소형 공통 컴포넌트 생성

### Task 2: StatusBadge 공통 컴포넌트 생성

**선행 조건**: 없음 (Task 1과 독립)

**실행 단계**:

1. **신규 파일 생성**: `apps/frontend-next/src/components/ui/StatusBadge.tsx`

   **요구사항**:
   - Props: `label: string`, `variant: 'success' | 'error' | 'warning' | 'info' | 'neutral'`, `shape?: 'pill' | 'rect'` (기본 'rect'), `size?: 'sm' | 'md'` (기본 'sm'), `className?: string`
   - 색상 매핑:
     - success: `bg-emerald-50 text-emerald-700 border-emerald-200`
     - error: `bg-rose-50 text-rose-700 border-rose-200`
     - warning: `bg-amber-50 text-amber-700 border-amber-200`
     - info: `bg-cyan-50 text-cyan-700 border-cyan-200`
     - neutral: `bg-gray-100 text-gray-600 border-gray-300`
   - shape: pill → `rounded-full`, rect → `rounded`
   - size: sm → `px-2 py-0.5 text-xs`, md → `px-2.5 py-1 text-xs`
   - 항상 `inline-flex items-center font-medium border` 포함
   - `className` prop으로 외부 스타일 확장 가능

2. **인라인 코드 교체 — 4개 파일**:

   **파일 A**: `apps/frontend-next/src/app/dashboard/chatbot-quality/page.tsx`
   - 삭제 대상: 파일 상단의 인라인 `Badge` 함수 컴포넌트 전체 (약 20줄)
   - 교체 방법: `import { StatusBadge } from '@/components/ui/StatusBadge'` 추가
   - 사용처에서 `<Badge type="NEW" label="신규" />` → `<StatusBadge variant="success" label="신규" shape="pill" />` 로 변환
   - 타입 매핑 규칙:
     - `NEW` → `variant="success"`, `EMERGING` → `variant="warning"`, `FRUSTRATED` → `variant="error"`, `EMOTIONAL` → `variant="warning"`, `URGENT` → `variant="error"`, `NEUTRAL` → `variant="neutral"`
   - 이 페이지에서는 `shape="pill"` 사용 (기존이 `rounded-full`이었으므로)

   **파일 B**: `apps/frontend-next/src/app/dashboard/report-monitoring/page.tsx`
   - 삭제 대상: `getStatusBadge` 함수 (약 15줄)
   - 교체 방법: `import { StatusBadge } from '@/components/ui/StatusBadge'` 추가
   - 사용처에서 `{getStatusBadge(hasCriticalIssues)}` → `<StatusBadge variant={hasCriticalIssues ? 'error' : 'success'} label={hasCriticalIssues ? '이슈 발견' : '정상'} />` 로 변환

   **파일 C**: `apps/frontend-next/src/app/dashboard/etl/wind/page.tsx`
   - 삭제 대상: `getStatusBadgeClass` 함수 (약 12줄)
   - 교체 방법: `import { StatusBadge } from '@/components/ui/StatusBadge'` 추가
   - 사용처에서 `<span className={...getStatusBadgeClass(run.status)...}>{run.status}</span>` → `<StatusBadge variant={statusToVariant(run.status)} label={run.status} />` 로 변환
   - 상태 매핑 헬퍼가 필요하면 페이지 내에 간단한 매핑 객체를 정의:
     ```tsx
     const statusVariantMap: Record<string, BadgeVariant> = {
       SUCCESS: 'success', FAILED: 'error', RUNNING: 'warning'
     };
     ```

   **파일 D**: `apps/frontend-next/src/app/dashboard/etl/minkabu/page.tsx`
   - 삭제 대상: `getStatusBadge` 함수 (약 15줄)
   - Wind ETL과 동일한 방식으로 교체

**검증 기준**:
- [ ] `pnpm build:frontend-next` 빌드 성공
- [ ] 4개 파일에서 인라인 Badge/StatusBadge 함수가 모두 제거됨
- [ ] 각 페이지에서 배지의 색상/모양이 기존과 동일하게 렌더링됨

---

### Task 3: StatsFooter 공통 컴포넌트 생성

**선행 조건**: 없음 (Task 1, 2와 독립)

**실행 단계**:

1. **신규 파일 생성**: `apps/frontend-next/src/components/ui/StatsFooter.tsx`

   **요구사항**:
   - Props 인터페이스:
     ```tsx
     interface StatItem {
       label: string;
       value: string | number;
       color?: string;            // Tailwind 텍스트 색상 클래스. 기본: 'text-gray-500'
       valueSize?: 'lg' | '2xl'; // 기본: '2xl'
     }

     interface StatsFooterProps {
       items: StatItem[];
       columns?: 2 | 3 | 4;      // 기본: 3
       className?: string;
     }
     ```
   - 렌더링 구조:
     ```
     <div className={`grid grid-cols-{columns} gap-4 ${className}`}>
       {items.map → <div className="p-4 border border-gray-200 bg-gray-50">
         <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">{label}</p>
         <p className={`${color} text-${valueSize} font-bold`}>{value}</p>
       </div>}
     </div>
     ```
   - `value`가 number면 `toLocaleString()` 포매팅 적용
   - `className` 기본값 없음 (외부에서 `mt-6` 등 마진 제어)

2. **인라인 코드 교체 — 5개 파일**:

   **파일 A**: `apps/frontend-next/src/app/dashboard/admin/users/page.tsx`
   - 삭제 대상: 파일 하단의 `grid grid-cols-3` Stats Footer 블록 (약 15줄)
   - 교체:
     ```tsx
     <StatsFooter
       className="mt-6"
       items={[
         { label: 'Total Users', value: users.length, color: 'text-cyan-400' },
         { label: 'Active', value: users.filter(u => u.isActive).length, color: 'text-green-400' },
         { label: 'Inactive', value: users.filter(u => !u.isActive).length, color: 'text-gray-400' },
       ]}
     />
     ```

   **파일 B**: `apps/frontend-next/src/app/dashboard/admin/roles/page.tsx`
   - 삭제 대상: 동일 패턴의 Stats Footer 블록 (약 15줄)
   - 교체: items에 `Total Roles`, `Total Users`, `Avg Users/Role` 포함. `className="mt-8"`

   **파일 C**: `apps/frontend-next/src/app/dashboard/admin/filters/page.tsx`
   - 삭제 대상: 동일 패턴의 Stats Footer 블록 (약 15줄)
   - 교체: items에 `Total Filters`, `Default Filter` (valueSize: 'lg'), `With Date Range` 포함. `className="mt-8"`
   - **주의**: `Default Filter`의 value가 문자열이고 `text-lg truncate`가 필요 → `valueSize: 'lg'` 사용

   **파일 D**: `apps/frontend-next/src/app/dashboard/admin/analysis/page.tsx`
   - 삭제 대상: 동일 패턴의 Stats Footer 블록 (약 15줄)
   - 교체: items에 `Total Sessions`, `Total Messages`, `Avg Messages/Session` 포함. `className="mt-8"`

   **파일 E**: `apps/frontend-next/src/app/dashboard/admin/batch-analysis/schedules/page.tsx`
   - 삭제 대상: 동일 패턴의 Stats Footer 블록 (약 15줄)
   - 교체: 해당 페이지의 통계 항목 유지. `className="mt-6"`

**검증 기준**:
- [ ] `pnpm build:frontend-next` 빌드 성공
- [ ] 5개 파일에서 인라인 Stats Footer가 모두 제거됨
- [ ] 각 페이지 하단에 3칸 통계 그리드가 기존과 동일하게 렌더링됨

---

### Task 4: EmptyState 공통 컴포넌트 생성

**선행 조건**: 없음 (Task 1, 2, 3과 독립)

**실행 단계**:

1. **신규 파일 생성**: `apps/frontend-next/src/components/ui/EmptyState.tsx`

   **요구사항**:
   - Props 인터페이스:
     ```tsx
     interface EmptyStateProps {
       icon?: ReactNode;
       title?: string;
       description: string;
       searchQuery?: string;
       searchMessage?: string;      // 기본: 'NO RESULTS FOUND'
       action?: {
         label: string;
         onClick: () => void;
         icon?: ReactNode;
         disabled?: boolean;
       };
       variant?: 'dashed' | 'solid'; // 기본: 'dashed'
       className?: string;
     }
     ```
   - variant별 외관:
     - `dashed`: `border border-dashed border-gray-200 bg-gray-50 text-center p-12`
     - `solid`: `bg-white border border-gray-200 rounded-xl text-center p-12`
   - 렌더링 순서: icon → title(h3) → description(p) → action(button)
   - `searchQuery`가 truthy이면 description 대신 `searchMessage`를 표시하고 action을 숨김
   - 아이콘: 전달된 ReactNode를 `mx-auto mb-4` 래퍼로 감쌈
   - action 버튼 스타일: `px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/50 text-emerald-400 text-sm uppercase tracking-wider transition-all`

2. **인라인 코드 교체 — 5개 파일**:

   **파일 A**: `apps/frontend-next/src/app/dashboard/admin/analysis/page.tsx`
   - 삭제 대상: `col-span-full p-12 border border-dashed...` EmptyState 블록 (약 15줄)
   - 교체:
     ```tsx
     <EmptyState
       icon={<Bot className="w-12 h-12 text-gray-300" />}
       description="NO ANALYSIS SESSIONS YET"
       searchQuery={searchQuery}
       action={{ label: 'Start Your First Session', onClick: handleCreateSession }}
       className="col-span-full"
     />
     ```

   **파일 B**: `apps/frontend-next/src/app/dashboard/admin/roles/page.tsx`
   - 삭제 대상: `col-span-2 p-12 border border-dashed...` EmptyState 블록 (약 7줄)
   - 교체:
     ```tsx
     <EmptyState
       icon={<Shield className="w-12 h-12 text-gray-300" />}
       description="NO ROLES IN SYSTEM"
       searchQuery={searchQuery}
       className="col-span-2"
     />
     ```

   **파일 C**: `apps/frontend-next/src/app/dashboard/admin/filters/page.tsx`
   - 삭제 대상: 동일 패턴의 EmptyState 블록
   - 교체: icon을 `Filter`로, description을 `'NO FILTERS SAVED'`로 변경

   **파일 D**: `apps/frontend-next/src/app/dashboard/report-monitoring/page.tsx`
   - 삭제 대상: `bg-white border border-gray-200 rounded-xl p-12 text-center` EmptyState 블록 (약 20줄)
   - 교체:
     ```tsx
     <EmptyState
       variant="solid"
       icon={<FileText className="w-16 h-16 text-gray-400" />}
       title="아직 체크가 실행되지 않았습니다"
       description="리포트 데이터 상태를 확인하려면 체크를 실행하세요."
       action={{
         label: '첫 체크 실행',
         onClick: handleRunCheck,
         icon: <Play className="w-4 h-4" />,
         disabled: checking || !dbConnected,
       }}
     />
     ```

   **파일 E**: `apps/frontend-next/src/app/dashboard/admin/batch-analysis/schedules/page.tsx`
   - 삭제 대상: 테이블 내 `<tr><td colSpan>` EmptyState (약 7줄)
   - 교체: 이 경우 `<td>` 내부에서 사용하므로, EmptyState를 `<td colSpan={6} className="px-6 py-12">` 안에 넣어서 사용
     ```tsx
     <tr>
       <td colSpan={6} className="px-6 py-12">
         <EmptyState
           icon={<Clock className="w-12 h-12 text-gray-300" />}
           description="NO SCHEDULES CONFIGURED"
           variant="dashed"
           className="border-0 bg-transparent p-0"
         />
       </td>
     </tr>
     ```

**검증 기준**:
- [ ] `pnpm build:frontend-next` 빌드 성공
- [ ] 5개 파일에서 인라인 EmptyState가 모두 제거됨
- [ ] 각 페이지에서 빈 상태 UI가 기존과 동일하게 렌더링됨 (아이콘, 텍스트, 버튼)

---

## Phase 3: 기존 Compound 컴포넌트 API 개선

### Task 5: 없음 (Phase 2에서 Task 5를 건너뜀 — 번호 통일을 위해 예약)

---

### Task 6: Dashboard compound 컴포넌트 개선

**선행 조건**: Task 2, 3, 4 완료

**수정 파일**: `apps/frontend-next/src/components/compound/Dashboard/index.tsx`

**실행 단계**:

1. **DashboardContext 확장**:
   - 기존: `{ isLoading: boolean; error: Error | null }`
   - 추가: `refetch?: () => void`
   - `DashboardRoot` props에 `refetch?: () => void` 추가

2. **Dashboard.Section 서브 컴포넌트 추가**:
   ```tsx
   interface SectionProps {
     title?: string;
     children: ReactNode;
     className?: string;
   }
   ```
   - `ChartsSection`과 `TableSection`의 범용 버전
   - title이 있으면 `<h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>` 표시
   - `bg-white border border-gray-200 rounded-xl p-6` 카드 레이아웃 적용
   - Context의 `isLoading` 체크: 로딩 중이면 렌더링 건너뜀

3. **Dashboard.Skeleton 유연화**:
   - 새 prop: `layout?: 'default' | 'kpi-chart' | 'kpi-only'`
   - `default`: 기존 레이아웃 (4 KPI + 2 차트 + 1 테이블) — **기존 동작 유지**
   - `kpi-chart`: KPI 4개 + 차트 2개 (테이블 없음)
   - `kpi-only`: KPI 4개만

4. **Dashboard.Error에 재시도 버튼 추가**:
   - Context의 `refetch`가 있으면 "다시 시도" 버튼 표시
   - 버튼 스타일: `px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700`

5. **Object.assign에 Dashboard.Section 추가**:
   ```tsx
   const Dashboard = Object.assign(DashboardRoot, {
     Header: DashboardHeader,
     KPISection: DashboardKPISection,
     ChartsSection: DashboardChartsSection,
     TableSection: DashboardTableSection,
     Section: DashboardSection,      // 추가
     Skeleton: DashboardSkeleton,
     Error: DashboardError,
     Empty: DashboardEmpty,
     Content: DashboardContent,
   });
   ```

**⚠️ 반드시 지킬 것**: 기존 `DashboardRoot`, `DashboardHeader`, `DashboardKPISection`, `DashboardChartsSection`, `DashboardTableSection`, `DashboardSkeleton`, `DashboardError`, `DashboardEmpty`, `DashboardContent`의 기존 동작을 **절대 변경하지 않는다**. 모든 신규 prop은 optional이며 기본값은 현재 동작과 동일.

**검증 기준**:
- [ ] `pnpm build:frontend-next` 빌드 성공
- [ ] business 페이지 (`/dashboard/business`) 정상 렌더링 (기존 코드 변경 없이)
- [ ] chatbot-quality 페이지 (`/dashboard/chatbot-quality`) 정상 렌더링 (기존 코드 변경 없이)

---

### Task 7: DataTable compound 컴포넌트 개선

**선행 조건**: Task 4 완료 (EmptyState 컴포넌트 필요)

**수정 파일**: `apps/frontend-next/src/components/compound/DataTable/index.tsx`

**실행 단계**:

1. **`variant` prop 추가 (DataTableRoot)**:
   - 새 prop: `variant?: 'default' | 'card' | 'flat'`
   - `default`: 현재 스타일 그대로 — **기존 동작 유지**
   - `card`: 모니터링용 (`bg-white border border-gray-200 rounded-xl p-6`, 셀 패딩 `py-3 px-4`, 헤더 `text-gray-500 font-medium`)
   - `flat`: CRUD 관리용 (`bg-gray-50 border border-gray-200`, 셀 패딩 `px-6 py-4`, 헤더 `text-xs font-semibold uppercase tracking-wider`)
   - Context에 variant를 추가하여 하위 컴포넌트들이 스타일을 분기할 수 있게 함

2. **`rowKey` prop 추가 (DataTableRoot)**:
   - 새 prop: `rowKey?: keyof T | ((row: T) => string | number)`
   - Body 렌더링 시 `row[rowKey]` 또는 `rowKey(row)`를 React key로 사용
   - 미제공 시 기존처럼 index 사용

3. **DataTable.Pagination 서브 컴포넌트 추가**:
   ```tsx
   interface PaginationProps {
     pageSize?: number;           // 기본: 10
     pageSizeOptions?: number[];  // 기본: [10, 20, 50]
     className?: string;
   }
   ```
   - 클라이언트사이드 페이지네이션
   - Context에 `currentPage`, `setCurrentPage`, `pageSize`, `setPageSize`, `totalPages` 추가
   - DataTable.Body에서 현재 페이지의 데이터만 렌더링
   - Pagination UI: `<< < 1 2 3 > >>` 패턴 + "10건 / 페이지" 셀렉트
   - **Pagination이 없으면 기존처럼 전체 데이터 렌더링** (기존 동작 보존)

4. **DataTable.Body의 emptyState 개선**:
   - 기존 `emptyMessage: string` prop은 유지
   - 새 prop 추가: `emptyIcon?: ReactNode`
   - `emptyIcon`과 `emptyMessage`가 함께 제공되면 `EmptyState` 컴포넌트 패턴으로 렌더링
   - `emptyMessage`만 있으면 기존처럼 단순 텍스트 표시

5. **Object.assign에 Pagination 추가**:
   ```tsx
   const DataTable = Object.assign(DataTableRoot, {
     Toolbar: DataTableToolbar,
     Search: DataTableSearch,
     Content: DataTableContent,
     Header: DataTableHeader,
     Body: DataTableBody,
     Footer: DataTableFooter,
     Pagination: DataTablePagination,  // 추가
   });
   ```

**⚠️ 반드시 지킬 것**: `variant` 기본값은 `'default'`로 현재 스타일 유지. `rowKey` 미제공 시 index 사용. `Pagination` 미사용 시 전체 데이터 렌더링. **기존 business, chatbot-quality 페이지의 코드를 수정하지 않는다.**

**검증 기준**:
- [ ] `pnpm build:frontend-next` 빌드 성공
- [ ] business 페이지의 DataTable 정상 렌더링 (기존 코드 변경 없이)
- [ ] chatbot-quality 페이지의 DataTable 정상 렌더링 (기존 코드 변경 없이)

---

### Task 8: Chart compound 컴포넌트 정비

**선행 조건**: 없음 (독립)

**수정 파일**: `apps/frontend-next/src/components/compound/Chart/index.tsx`

**실행 단계**:

1. **ChartRoot의 children 타입 완화**:
   - 기존: `children: ReactElement` (단일 ReactElement만 허용)
   - 변경: `children: ReactNode` (다중 차트 요소 허용)
   - `ResponsiveContainer` 내부에 children을 직접 렌더링

2. **Chart.Loading 개선**:
   - height prop 기본값을 부모 ChartRoot의 height과 동기화
   - height prop 미제공 시 `256` 유지 (기존 동작)

**⚠️ 주의**: 현재 이 컴포넌트를 사용하는 곳이 0곳이므로 기존 호환성 이슈는 없음. 그러나 변경 사항은 최소한으로 유지.

**검증 기준**:
- [ ] `pnpm build:frontend-next` 빌드 성공
- [ ] 기존 동작에 영향 없음 (사용처 0곳이므로 빌드 성공이면 OK)

---

## Phase 4: 페이지 마이그레이션

### Task 9: ETL 페이지 마이그레이션 (Wind + Minkabu)

**선행 조건**: Task 1, 2, 6, 7, 8 완료

**대상 파일**:
- `apps/frontend-next/src/app/dashboard/etl/wind/page.tsx` (~457줄)
- `apps/frontend-next/src/app/dashboard/etl/minkabu/page.tsx` (~460줄)

**Wind ETL 마이그레이션 단계**:

1. **import 정리**:
   - 추가: `import { Dashboard } from '@/components/compound/Dashboard'`
   - 추가: `import { DataTable, Column } from '@/components/compound/DataTable'`
   - 추가: `import { Chart, CHART_COLORS } from '@/components/compound/Chart'`
   - 추가: `import { StatusBadge } from '@/components/ui/StatusBadge'`
   - 추가: `import { useQuery } from '@tanstack/react-query'`
   - 제거: recharts 직접 import (AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend)

2. **데이터 fetch를 react-query로 전환**:
   - 기존의 `useState` + `useEffect` + `AbortController` + `setInterval` 패턴을 `useQuery`로 교체
   - 예시:
     ```tsx
     const { data: kpiData, isLoading, error, refetch } = useQuery({
       queryKey: ['wind-etl-kpi', dateRange],
       queryFn: () => windEtlApi.getKPI(dateRange),
       refetchInterval: 5 * 60 * 1000, // 5분 자동 새로고침
     });
     ```
   - KPI, 차트 데이터, 최근 실행 기록 각각 별도 useQuery 사용

3. **레이아웃을 Dashboard compound로 전환**:
   ```tsx
   <Dashboard isLoading={isLoading} error={error as Error | null} refetch={refetch}>
     <Dashboard.Header title="Wind ETL 모니터링" rightContent={<DateRangeFilter ... />} />
     <Dashboard.Skeleton layout="kpi-chart" />
     <Dashboard.Error />
     <Dashboard.Content>
       <Dashboard.KPISection columns={4}>
         <KPICard ... /> {/* 기존 4개 KPI 유지 */}
       </Dashboard.KPISection>
       {/* 차트 섹션 */}
       {/* 테이블 섹션 */}
     </Dashboard.Content>
   </Dashboard>
   ```

4. **인라인 recharts → Chart compound 래퍼**:
   ```tsx
   <Dashboard.ChartsSection columns={2}>
     <Chart title="실행 추이" height={300}>
       <AreaChart data={trendData}>...</AreaChart>
     </Chart>
     <Chart title="카테고리별 현황" height={300}>
       <BarChart data={categoryData}>...</BarChart>
     </Chart>
   </Dashboard.ChartsSection>
   ```
   - recharts 컴포넌트(AreaChart, BarChart 등)의 import는 Chart 컴포넌트 내부에서 하지 않음
   - 페이지에서 직접 recharts를 import하되, `Chart` 래퍼로 감싸서 일관된 카드 레이아웃 적용

5. **인라인 최근 실행 테이블 → DataTable**:
   ```tsx
   <Dashboard.Section title="최근 실행 기록">
     <DataTable
       data={recentRuns}
       columns={runColumns}
       variant="card"
       rowKey="id"
     >
       <DataTable.Content>
         <DataTable.Header />
         <DataTable.Body emptyMessage="실행 기록이 없습니다" />
       </DataTable.Content>
     </DataTable>
   </Dashboard.Section>
   ```
   - 컬럼 정의 배열을 별도 상수로 추출
   - status 컬럼의 render에서 `StatusBadge` 사용

6. **인라인 getStatusBadgeClass → StatusBadge** (Task 2에서 이미 완료했을 수 있음. 중복 확인)

7. **시스템 상태 Footer, 에러 분석 섹션**:
   - 이들은 페이지 고유 UI이므로 인라인 유지 가능
   - 단, `Dashboard.Section`으로 감싸서 일관된 카드 레이아웃 적용

**Minkabu ETL 마이그레이션 단계**:
- Wind ETL과 동일한 단계를 수행
- 차이점: API 서비스명 (`minkabuEtlApi`), 일부 필드명, 아이콘
- Wind를 먼저 완성한 후, 그 패턴을 복사하여 Minkabu에 적용

**예상 코드 감소**: 각 ~457줄 → ~150-180줄

**검증 기준**:
- [ ] `pnpm build:frontend-next` 빌드 성공
- [ ] Wind ETL 페이지: KPI 4개 + 차트 2개 + 최근 실행 테이블 정상 렌더링
- [ ] Wind ETL 페이지: 기간 필터 변경 시 데이터 갱신
- [ ] Minkabu ETL 페이지: 동일 검증
- [ ] 배지 색상(SUCCESS=green, FAILED=red, RUNNING=amber) 정상

---

### Task 10: CRUD 관리 페이지 마이그레이션

**선행 조건**: Task 1, 3, 4, 7 완료

**대상 파일** (5개):
- `apps/frontend-next/src/app/dashboard/admin/users/page.tsx`
- `apps/frontend-next/src/app/dashboard/admin/roles/page.tsx`
- `apps/frontend-next/src/app/dashboard/admin/filters/page.tsx`
- `apps/frontend-next/src/app/dashboard/admin/analysis/page.tsx`
- `apps/frontend-next/src/app/dashboard/admin/batch-analysis/schedules/page.tsx`

**공통 마이그레이션 단계 (각 파일에 적용)**:

1. **인라인 Stats Footer → StatsFooter** (Task 3에서 이미 완료했을 수 있음. 중복 확인)

2. **인라인 EmptyState → EmptyState** (Task 4에서 이미 완료했을 수 있음. 중복 확인)

3. **인라인 테이블 → DataTable (variant='flat')** — users, schedules만 해당:

   **users 페이지**:
   - 컬럼 정의 배열 추출:
     ```tsx
     const userColumns: Column<User>[] = [
       { key: 'isActive', header: 'Status', render: (val) => /* 기존 active/inactive 배지 */ },
       { key: 'email', header: 'Email' },
       { key: 'name', header: 'Name' },
       { key: 'roleName', header: 'Role' },
       { key: 'createdAt', header: 'Created' },
       { key: 'actions', header: '', align: 'right', render: (_, user) => /* Edit/Delete 버튼 */ },
     ];
     ```
   - 인라인 `<table>` → `<DataTable>` 교체:
     ```tsx
     <DataTable data={filteredUsers} columns={userColumns} variant="flat" rowKey="id">
       <DataTable.Content>
         <DataTable.Header />
         <DataTable.Body emptyMessage={searchQuery ? 'NO RESULTS FOUND' : 'NO USERS IN SYSTEM'} />
       </DataTable.Content>
     </DataTable>
     ```

   **schedules 페이지**: users와 동일한 패턴으로 마이그레이션

4. **데이터 fetch를 react-query로 전환**:
   - 목록 조회: `useQuery({ queryKey: ['admin-users'], queryFn: ... })`
   - 생성/수정/삭제: `useMutation` + `queryClient.invalidateQueries`
   - 예시:
     ```tsx
     const { data: users = [], isLoading } = useQuery({
       queryKey: ['admin-users'],
       queryFn: () => adminApi.getUsers(),
     });

     const deleteMutation = useMutation({
       mutationFn: (id: string) => adminApi.deleteUser(id),
       onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
     });
     ```

**검증 기준**:
- [ ] `pnpm build:frontend-next` 빌드 성공
- [ ] Users 페이지: 사용자 목록 표시, 검색, 생성, 수정, 삭제 정상
- [ ] Roles 페이지: 역할 카드 표시, 검색, CRUD 정상
- [ ] Filters 페이지: 필터 카드 표시, 검색, CRUD 정상
- [ ] Analysis 페이지: 세션 카드 표시, 검색, 생성, 삭제 정상
- [ ] Schedules 페이지: 스케줄 테이블, 토글, CRUD 정상
- [ ] 각 페이지 하단 StatsFooter 정상 표시
- [ ] 각 페이지 데이터 없을 때 EmptyState 정상 표시

---

### Task 11: 모니터링 대시보드 페이지 마이그레이션

**선행 조건**: Task 1, 6, 7 완료

**대상 파일** (4개):
- `apps/frontend-next/src/app/dashboard/operations/page.tsx`
- `apps/frontend-next/src/app/dashboard/quality/page.tsx`
- `apps/frontend-next/src/app/dashboard/ai-performance/page.tsx`
- `apps/frontend-next/src/app/dashboard/user-analytics/page.tsx`

**공통 마이그레이션 단계 (각 파일에 적용)**:

1. **인라인 로딩/에러 → Dashboard compound 패턴**:
   - 각 페이지의 기존 로딩 스피너/에러 메시지 인라인 코드를 제거
   - `Dashboard` 래퍼로 감싸기:
     ```tsx
     <Dashboard isLoading={isLoading} error={error as Error | null} refetch={refetch}>
       <Dashboard.Header title="..." rightContent={<DateRangeFilter ... />} />
       <Dashboard.Skeleton />
       <Dashboard.Error />
       <Dashboard.Content>
         {/* 기존 KPI + 차트 + 테이블 내용 */}
       </Dashboard.Content>
     </Dashboard>
     ```

2. **데이터 fetch를 react-query로 전환**:
   - 각 페이지의 `useState` + `useEffect` + `AbortController` + `setInterval` → `useQuery`
   - `refetchInterval` 사용으로 자동 새로고침 대체

3. **ai-performance 페이지 추가 작업**:
   - 인라인 이상 탐지 테이블 → `DataTable` (variant='card') 교체
   - 컬럼 정의 배열 추출

4. **user-analytics 페이지 주의사항**:
   - 탭 UI(users/problematic)는 인라인 유지 (향후 TabGroup 컴포넌트 추출 시 교체)
   - 규칙 필터 칩도 인라인 유지
   - Dashboard compound는 전체 레이아웃 래퍼로만 사용

**검증 기준**:
- [ ] `pnpm build:frontend-next` 빌드 성공
- [ ] Operations: 실시간 KPI + 트래픽 차트 + 에러 게이지 정상
- [ ] Quality: KPI + 효율성 차트 + 산점도 + 반복 쿼리 + FAQ 분석 정상
- [ ] AI Performance: KPI + 토큰 산점도 + 이상 탐지 테이블 정상
- [ ] User Analytics: KPI + 사용자 테이블 + 문제성 채팅 + 탭 전환 정상
- [ ] 각 페이지에서 기간 필터 변경 시 데이터 자동 갱신

---

### Task 12: report-monitoring 페이지 마이그레이션

**선행 조건**: Task 1, 2, 4, 6, 7 완료

**대상 파일**: `apps/frontend-next/src/app/dashboard/report-monitoring/page.tsx` (~600줄)

**마이그레이션 단계**:

1. **Dashboard compound 적용**: 로딩/에러 상태 관리

2. **인라인 getStatusBadge → StatusBadge** (Task 2에서 이미 완료 확인)

3. **인라인 EmptyState → EmptyState 컴포넌트** (Task 4에서 이미 완료 확인)

4. **인라인 리포트 상태 테이블 → DataTable (variant='card')**:
   - 컬럼 정의 배열 추출
   - 행 조건부 스타일: `rowClassName={(row) => row.hasCriticalIssues ? 'bg-rose-50' : ''}`

5. **react-query 전환**:
   - 체크 실행: `useMutation`
   - 결과 조회: `useQuery`

6. **인라인 유지 항목** (이번 범위에서 교체하지 않음):
   - 이슈 상세 접기/펼치기 UI (향후 Accordion 컴포넌트 필요)
   - 시스템 상태 Footer (페이지 고유 UI)

**검증 기준**:
- [ ] `pnpm build:frontend-next` 빌드 성공
- [ ] 체크 실행 → 결과 테이블 표시 정상
- [ ] 이슈가 있는 행 빨간색 배경 정상
- [ ] 이슈 상세 접기/펼치기 정상
- [ ] EmptyState (체크 미실행 시) 정상

---

### Task 13: chatbot-quality 페이지 마이그레이션

**선행 조건**: Task 1, 2 완료

**대상 파일**: `apps/frontend-next/src/app/dashboard/chatbot-quality/page.tsx`

**마이그레이션 단계**:

1. **인라인 Badge → StatusBadge** (Task 2에서 이미 완료 확인)

2. **react-query 글로벌화** (Task 1에서 이미 완료 확인):
   - 페이지 자체의 QueryClient 생성 코드가 있다면 제거
   - 글로벌 QueryProvider 사용

3. **이 페이지는 이미 Dashboard compound + DataTable compound를 사용 중**이므로 추가 마이그레이션 최소화

**검증 기준**:
- [ ] `pnpm build:frontend-next` 빌드 성공
- [ ] chatbot-quality 페이지 정상 렌더링 (기존 기능 모두 유지)
- [ ] Badge 색상/모양 기존과 동일

---

## Phase 5: 최종 검증

### Task 14: 전체 빌드 및 린트

```bash
pnpm build:frontend-next
cd apps/frontend-next && pnpm lint
```

### Task 15: 전체 페이지 기능 확인 체크리스트

- [ ] `/dashboard` — 메인 대시보드 정상
- [ ] `/dashboard/operations` — 운영 메트릭 정상
- [ ] `/dashboard/business` — 비즈니스 메트릭 정상 (기존 compound 유지)
- [ ] `/dashboard/quality` — 품질 분석 정상
- [ ] `/dashboard/ai-performance` — AI 성능 + 이상 탐지 테이블 정상
- [ ] `/dashboard/chatbot-quality` — 챗봇 품질 정상 (기존 compound 유지)
- [ ] `/dashboard/user-analytics` — 유저 분석 + 문제성 채팅 정상
- [ ] `/dashboard/user-analytics/[userId]` — 유저 상세 정상 (변경 없음)
- [ ] `/dashboard/report-monitoring` — 리포트 모니터링 정상
- [ ] `/dashboard/etl/wind` — Wind ETL 정상
- [ ] `/dashboard/etl/minkabu` — Minkabu ETL 정상
- [ ] `/dashboard/admin/users` — 사용자 CRUD 정상
- [ ] `/dashboard/admin/roles` — 역할 CRUD 정상
- [ ] `/dashboard/admin/filters` — 필터 CRUD 정상
- [ ] `/dashboard/admin/analysis` — 분석 세션 관리 정상
- [ ] `/dashboard/admin/batch-analysis/schedules` — 스케줄 CRUD 정상
- [ ] `/dashboard/admin/batch-analysis` — 배치 분석 탭 정상 (변경 없음)
- [ ] `/dashboard/admin/problematic-rules` — 문제성 규칙 정상 (변경 없음)

---

## 이번 범위에서 의도적으로 제외한 항목

| 항목 | 이유 | 향후 작업 시기 |
|------|------|--------------|
| CRUD 템플릿 컴포넌트 | 미래 도메인 불확실, 과도한 추상화 | 3개 이상 유사 CRUD 추가 시 |
| ETL 전용 제네릭 페이지 | 소형 블록 조합으로 충분 | 3개 이상 ETL 도메인 추가 시 |
| problematic-rules 분리 (1100줄) | 복잡도 높음, 별도 작업 필요 | 별도 Task로 분리 |
| batch-analysis/[id] 분리 (850줄) | 복잡도 높음, 별도 작업 필요 | 별도 Task로 분리 |
| TabGroup 컴포넌트 | 사용처 2곳으로 ROI 낮음 | 3곳 이상 사용 시 |
| Accordion 컴포넌트 | 사용처 3곳이지만 구현 복잡 | Phase 4 이후 |
| KPICard 개선 (className, isInverse 등) | 현재 동작에 문제 없음 | 필요 시 |
