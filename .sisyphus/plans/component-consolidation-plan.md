# UI 컴포넌트 통합 작업 계획

> 생성일: 2026-02-04 | 단계: 3 | PR: 3 | 영향받는 예상 페이지 수: 26
> 참고: `.sisyphus/plans/component-audit.md`

---

## 1. 배경

### 1.1 원본 요청

`apps/frontend-next/` 전체에서 중복된 UI 컴포넌트를 통합하여 코드 중복을 줄이고, UX 일관성을 개선하며, 재사용 가능한 컴포넌트 라이브러리를 생성합니다. 감사 결과 30개 이상의 중복된 유틸리티 정의, 10개의 중복된 테이블 구현, 5개의 중복된 모달 오버레이, 15개 이상의 반복된 인라인 UI 패턴이 확인되었습니다.

### 1.2 인터뷰 요약

| 결정 사항 | 선택 |
|----------|--------|
| 범위 | 1-3단계 (4단계: 채팅 통합 + 차트 compound 제외) |
| PR 전략 | 단계별 1개 PR (총 3개 PR) |
| 접근법 | 실용적: 단순 추출은 적극적, 복잡한 것은 보수적 |
| 테스트 | 단계별 E2E 브라우저 기반 검증 |
| 시각적 검증 | 수동 브라우저 검사 필요 |

### 1.3 주요 발견: `lib/formatters.ts` 이미 존재

`apps/frontend-next/src/lib/formatters.ts` 파일이 이미 종합적인 `formatters` 객체를 포함하고 있습니다: `tokens`, `currency`, `percentage`, `date`, `dateFull`, `dateTime`, `time`, `number`, `bytes`, `duration`, `truncate`. 그러나 **8개 이상의 컴포넌트 파일에서 여전히 자체 로컬 버전의** `formatDate`, `formatNumber`, `truncateText`, `formatTokens`를 정의하고 있습니다. 1단계는 주로 처음부터 생성하는 것이 아니라 기존 유틸리티로의 마이그레이션입니다.

### 1.4 주요 발견: `chart-theme.ts`에 이미 공유 색상 포함

`apps/frontend-next/src/components/charts/chart-theme.ts` 파일이 `CHART_COLORS`와 `TOOLTIP_STYLE`을 export합니다. 그러나 파이/도넛 차트 `COLORS` 배열은 `TenantPieChart.tsx`, `UserTokensPieChart.tsx`, `CategoryDistribution.tsx`, `issue-frequency/page.tsx`에서 독립적으로 정의되어 있습니다.

---

## 2. 작업 목표

### 2.1 핵심 목표

공유 primitives를 추출하고, 기존 compound 컴포넌트를 확장하며, admin/ETL 페이지용 아키텍처 패턴을 생성하여 프론트엔드 전체에서 UI 코드 중복을 제거합니다.

### 2.2 산출물

| # | 산출물 | 단계 |
|---|------------|-------|
| D1 | 모든 인라인 `formatDate`/`formatNumber`/`truncateText`를 `lib/formatters.ts`로 교체 | 1 |
| D2 | `PIE_COLORS` 팔레트를 `chart-theme.ts`에 추가하고 모든 파이/도넛 차트에서 사용 | 1 |
| D3 | `Badge` 컴포넌트 (`ui/Badge.tsx`) | 1 |
| D4 | `PageHeader` 컴포넌트 (`ui/PageHeader.tsx`) | 1 |
| D5 | `LoadingSpinner` 컴포넌트 (`ui/LoadingSpinner.tsx`) | 1 |
| D6 | `ErrorAlert` 컴포넌트 (`ui/ErrorAlert.tsx`) | 1 |
| D7 | `EmptyState` 컴포넌트 (`ui/EmptyState.tsx`) | 1 |
| D8 | `BackButton` 컴포넌트 (`ui/BackButton.tsx`) | 1 |
| D9 | footer 슬롯과 `full` 크기로 `Modal` 확장 | 2 |
| D10 | 내장 pagination 하위 컴포넌트로 `DataTable` 확장 | 2 |
| D11 | `TabBar` 컴포넌트 (`ui/TabBar.tsx`) | 2 |
| D12 | `Accordion` 컴포넌트 (`ui/Accordion.tsx`) | 2 |
| D13 | `ToggleSwitch` 컴포넌트 (`ui/ToggleSwitch.tsx`) | 2 |
| D14 | `StatsFooter` 컴포넌트 (`ui/StatsFooter.tsx`) | 2 |
| D15 | `useAdminCRUD` hook + `AdminPageLayout` 컴포넌트 | 3 |
| D16 | `ETLMonitoringPage` 매개변수화된 컴포넌트 | 3 |
| D17 | Operations, Quality, AI Performance용 Dashboard compound 마이그레이션 | 3 |
| D18 | 단계별 시각적 검증을 위한 E2E 테스트 suite (Playwright) | 1-3 |

### 2.3 완료 정의

- [ ] `pnpm build:frontend-next`가 에러 없이 통과
- [ ] 모든 E2E 테스트 통과
- [ ] 수동 브라우저 검증으로 시각적 회귀 없음 확인
- [ ] 중복된 유틸리티 함수 정의가 남아있지 않음 (1단계)
- [ ] `Modal` 컴포넌트 외부에 인라인 모달 오버레이가 남아있지 않음 (2단계)
- [ ] Admin CRUD 페이지가 공유 레이아웃 사용 (3단계)
- [ ] ETL 페이지가 단일 매개변수화된 컴포넌트로 통합 (3단계)

---

## 3. 가드레일

### 3.1 필수 사항

- 추출된 모든 컴포넌트는 **완전 호환 대체**여야 함 (동일한 시각적 출력)
- 컴포넌트 확장 시 기존 Props 인터페이스는 하위 호환성 유지
- `lib/formatters.ts` 사용 시 인라인 정의와 **동일한 출력** 생성 (엣지 케이스 검증)
- 각 단계는 독립적으로 병합 가능해야 함 (단계 간 의존성 없음)
- E2E 테스트는 최소한 각 단계의 검증 체크리스트에 나열된 페이지를 커버해야 함

### 3.2 금지 사항

- 백엔드 코드 변경 금지
- 비즈니스 로직이나 데이터 페칭 패턴 변경 금지 (3단계 `useAdminCRUD` 제외)
- 새로운 npm 의존성 금지 (기존 사용: Tailwind, lucide-react, Recharts)
- 라우팅 구조 변경 금지
- Chat 시스템 변경 금지 (4단계, 명시적으로 제외됨)
- Chart compound 마이그레이션 금지 (4단계, 명시적으로 제외됨)
- 디자인 시스템 전면 개편 금지 -- 기존 Tailwind 클래스 그대로 유지

---

## 4. 1단계: 유틸리티 추출 + UI Primitives

**위험 수준**: 낮음 | **접근법**: 적극적 (직접 교체)
**브랜치**: `refactor/phase1-primitives`

### 4.1 Playwright E2E 설정

**TODO 1.0**: E2E 테스트를 위한 Playwright 설정

생성:
- `apps/frontend-next/playwright.config.ts`
- `apps/frontend-next/e2e/` 디렉토리

완료 기준:
- Playwright가 devDependency로 설치됨
- Config가 `http://localhost:3001`을 타겟팅함
- 기본 smoke 테스트가 로그인 페이지로 이동하고 제목 렌더링 검증
- `pnpm --filter frontend-next test:e2e` 스크립트가 package.json에 추가됨

### 4.2 인라인 Formatters를 `lib/formatters.ts`로 마이그레이션

**TODO 1.1**: 모든 인라인 `formatDate`, `formatNumber`, `truncateText`, `formatTokens`를 `formatters.*`로 교체

수정할 파일 (로컬 정의 제거, `import { formatters } from '@/lib/formatters'` 추가):

| 파일 | 제거할 함수 | 대체 |
|------|-------------------|-------------|
| `components/charts/CostTrendChart.tsx` | `formatDate` (32번 줄) | `formatters.date` |
| `components/charts/UserPatternsTable.tsx` | `formatDate` (13번 줄) | `formatters.date` |
| `components/charts/ProblematicChatTable.tsx` | `truncateText` (58번 줄) | `formatters.truncate` |
| `components/charts/UserListTable.tsx` | `formatDate` (30번 줄), `formatNumber` (49번 줄) | `formatters.date`, `formatters.number` |
| `components/charts/RepeatedQueriesTable.tsx` | `formatDate` (21번 줄) | `formatters.date` |
| `components/charts/TokenEfficiencyTrendChart.tsx` | `formatDate` (33번 줄) | `formatters.date` |
| `components/charts/UserActivityDialog.tsx` | `formatDateTime` (31번 줄), `truncateText` (46번 줄), `formatNumber` (52번 줄) | `formatters.dateTime`, `formatters.truncate`, `formatters.number` |
| `components/user-profiling/UserProfileSummary.tsx` | `formatDate` (10번 줄) | `formatters.date` |
| `components/analysis/SessionList.tsx` | `formatDate` (36번 줄) | `formatters.dateTime` |
| `app/dashboard/report-monitoring/page.tsx` | `formatDateTime` (140번 줄) | `formatters.dateTime` |
| `app/dashboard/etl/wind/page.tsx` | `formatDateTime` (172번 줄) | `formatters.dateTime` |

**중요**: `formatters.date` 출력이 각 파일의 로컬 `formatDate`와 일치하는지 확인하세요. 일부는 `M/DD` 형식을 사용하고, 다른 일부는 한국어 로케일을 사용합니다. 불일치하는 경우, 인라인으로 남겨두지 말고 `formatters`에 변형을 추가하세요 (예: `formatters.dateShort`).

완료 기준:
- 컴포넌트 파일에 로컬 `formatDate`, `formatNumber`, `truncateText` 정의 없음
- 모든 11개 파일이 `@/lib/formatters`에서 import
- `pnpm build:frontend-next` 성공
- 시각적 출력이 동일함 (E2E 스냅샷 또는 수동 확인으로 검증)

### 4.3 PIE_COLORS 팔레트 통합

**TODO 1.2**: `chart-theme.ts`에 `PIE_COLORS` 추가하고 모든 파이 차트 색상 배열 마이그레이션

수정할 파일: `apps/frontend-next/src/components/charts/chart-theme.ts`

추가:
```typescript
export const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e', '#06b6d4', '#84cc16', '#ec4899'];
```

수정할 파일 (로컬 `COLORS` 배열 제거, `chart-theme`에서 `PIE_COLORS` import):

| 파일 | 현재 정의 |
|------|--------------------|
| `components/charts/TenantPieChart.tsx` | `const COLORS = ['#3b82f6', ...]` (19번 줄) |
| `components/charts/UserTokensPieChart.tsx` | `const COLORS = ['#3b82f6', ...]` (14번 줄) |
| `components/user-profiling/CategoryDistribution.tsx` | 로컬 COLORS 배열 |
| `app/dashboard/admin/batch-analysis/issue-frequency/page.tsx` | `const COLORS = [...]` (77번 줄) |

완료 기준:
- `chart-theme.ts`에 단일 `PIE_COLORS` 정의
- 차트 컴포넌트에 로컬 `COLORS` 배열 없음
- 파이 차트가 동일한 색상으로 렌더링됨

### 4.4 `Badge` 컴포넌트 추출

**TODO 1.3**: `apps/frontend-next/src/components/ui/Badge.tsx` 생성

Props 인터페이스:
```typescript
interface BadgeProps {
  children: React.ReactNode;
  variant: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'custom';
  size?: 'sm' | 'md';
  className?: string;  // custom variant 또는 오버라이드용
}
```

통합할 기존 배지 패턴 조사:
- **상태 배지** (Admin Users: active/inactive): 녹색/빨간색 배경
- **역할 배지** (Admin Users/Roles): 역할 이름이 있는 색상 span
- **감정 배지** (Batch Analysis): positive/negative/neutral
- **심각도 배지** (Report Monitoring): success/warning/error
- **점수 배지** (Chatbot Quality): 인라인 색상 span

마이그레이션할 파일 (인라인 배지 마크업을 `<Badge>`로 교체):

| 파일 | 배지 사용 |
|------|-------------|
| `app/dashboard/admin/users/page.tsx` | Active/inactive 상태, 역할 배지 |
| `app/dashboard/admin/roles/page.tsx` | 권한 배지 |
| `app/dashboard/chatbot-quality/page.tsx` | 인라인 감정 배지 |
| `app/dashboard/report-monitoring/page.tsx` | 상태 배지 (success/fail/warning) |
| `app/dashboard/admin/batch-analysis/[id]/page.tsx` | 점수 배지 |

완료 기준:
- `Badge` 컴포넌트가 5개의 식별된 배지 패턴 모두 처리
- 마이그레이션된 파일이 인라인 span 대신 `<Badge>` 사용
- 현재와 동일한 시각적 모양

### 4.5 `PageHeader` 컴포넌트 추출

**TODO 1.4**: `apps/frontend-next/src/components/ui/PageHeader.tsx` 생성

Props 인터페이스:
```typescript
interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;  // 오른쪽 버튼
  backHref?: string;          // 선택적 뒤로 가기 네비게이션
  className?: string;
}
```

이것은 반복된 패턴을 대체합니다:
```tsx
<div className="flex justify-between items-center mb-6">
  <div>
    <h2 className="text-3xl font-bold text-gray-900">Title</h2>
    <p className="text-gray-500 mt-1">Description</p>
  </div>
  <div>{/* action buttons */}</div>
</div>
```

마이그레이션할 파일 (15개 이상 페이지):

| 파일 | 현재 패턴 |
|------|----------------|
| `app/dashboard/operations/page.tsx` | 인라인 헤더 + DateRangeFilter |
| `app/dashboard/quality/page.tsx` | 인라인 헤더 + DateRangeFilter |
| `app/dashboard/ai-performance/page.tsx` | 인라인 헤더 + DateRangeFilter |
| `app/dashboard/user-analytics/page.tsx` | 인라인 헤더 + DateRangeFilter |
| `app/dashboard/report-monitoring/page.tsx` | 인라인 헤더 |
| `app/dashboard/admin/users/page.tsx` | 인라인 헤더 + "Add" 버튼 |
| `app/dashboard/admin/roles/page.tsx` | 인라인 헤더 + "Add" 버튼 |
| `app/dashboard/admin/filters/page.tsx` | 인라인 헤더 + "Add" 버튼 |
| `app/dashboard/admin/analysis/page.tsx` | 인라인 헤더 + "New Session" 버튼 |
| `app/dashboard/admin/batch-analysis/page.tsx` | 인라인 헤더 + "Create Job" 버튼 |
| `app/dashboard/admin/batch-analysis/prompts/page.tsx` | 인라인 헤더 |
| `app/dashboard/admin/batch-analysis/schedules/page.tsx` | 인라인 헤더 |
| `app/dashboard/admin/problematic-rules/page.tsx` | 인라인 헤더 |
| `app/dashboard/etl/minkabu/page.tsx` | 인라인 헤더 |
| `app/dashboard/etl/wind/page.tsx` | 인라인 헤더 |

완료 기준:
- 모든 15개 페이지가 인라인 헤더 마크업 대신 `<PageHeader>` 사용
- compound Dashboard의 `Dashboard.Header`는 건드리지 않음 (compound 패턴 내에서 다른 목적으로 사용됨)
- 레이아웃/간격 동일

### 4.6 `LoadingSpinner` 컴포넌트 추출

**TODO 1.5**: `apps/frontend-next/src/components/ui/LoadingSpinner.tsx` 생성

Props 인터페이스:
```typescript
interface LoadingSpinnerProps {
  message?: string;  // 기본값: "Loading..."
  fullPage?: boolean; // 뷰포트 중앙 정렬 (기본값: true)
  size?: 'sm' | 'md' | 'lg';
}
```

마이그레이션할 파일 (`animate-spin` 로딩 패턴이 있는 모든 파일 -- 49개 파일 식별됨):
- 우선순위 대상 (전체 페이지 스피너): 모든 dashboard page.tsx 파일, 모든 admin page.tsx 파일
- 낮은 우선순위 (버튼/폼 내 인라인 스피너): 모달, 폼 컴포넌트

완료 기준:
- 모든 전체 페이지 로딩 상태가 `<LoadingSpinner fullPage />` 사용
- 버튼/폼 로딩 상태는 `<LoadingSpinner size="sm" />` 인라인 사용 가능
- 동일한 시각적 모양

### 4.7 `ErrorAlert` 컴포넌트 추출

**TODO 1.6**: `apps/frontend-next/src/components/ui/ErrorAlert.tsx` 생성

Props 인터페이스:
```typescript
interface ErrorAlertProps {
  message: string;
  title?: string;  // 기본값: "An error occurred"
  onRetry?: () => void;
  className?: string;
}
```

마이그레이션할 파일 (`bg-rose-50` 에러 패턴이 있는 12개 파일):

| 파일 |
|------|
| `app/dashboard/operations/page.tsx` |
| `app/dashboard/quality/page.tsx` |
| `app/dashboard/ai-performance/page.tsx` |
| `app/dashboard/user-analytics/page.tsx` |
| `app/dashboard/chatbot-quality/page.tsx` |
| `app/dashboard/report-monitoring/page.tsx` |
| `app/dashboard/etl/minkabu/page.tsx` |
| `app/dashboard/etl/wind/page.tsx` |
| `app/dashboard/admin/problematic-rules/page.tsx` |
| `components/faq-analysis/FAQAnalysisSection.tsx` |
| `app/(auth)/login/page.tsx` |
| `app/dashboard/user-analytics/[userId]/page.tsx` |

완료 기준:
- 모든 12개 파일이 인라인 rose/red 에러 div 대신 `<ErrorAlert>` 사용
- `onRetry` 제공 시 선택적 재시도 버튼 렌더링
- 동일한 시각적 모양

### 4.8 `EmptyState` 컴포넌트 추출

**TODO 1.7**: `apps/frontend-next/src/components/ui/EmptyState.tsx` 생성

Props 인터페이스:
```typescript
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}
```

이것은 admin 페이지와 데이터 테이블 전체에서 발견되는 인라인 "데이터 없음" / "결과 없음" 패턴을 대체합니다.

완료 기준:
- 페이지 전체에서 일관된 empty state 표시

### 4.9 `BackButton` 컴포넌트 추출

**TODO 1.8**: `apps/frontend-next/src/components/ui/BackButton.tsx` 생성

Props 인터페이스:
```typescript
interface BackButtonProps {
  href?: string;  // 생략 시 router.back() 사용
  label?: string; // 기본값: "Back"
}
```

마이그레이션할 파일 (뒤로 가기 버튼이 있는 7개 이상 페이지):

| 파일 |
|------|
| `app/dashboard/admin/analysis/[id]/page.tsx` |
| `app/dashboard/admin/batch-analysis/[id]/page.tsx` |
| `app/dashboard/admin/batch-analysis/faq/[id]/page.tsx` |
| `app/dashboard/admin/batch-analysis/issue-frequency/page.tsx` |
| `app/dashboard/user-analytics/[userId]/page.tsx` |

완료 기준:
- 모든 상세/하위 페이지가 인라인 구현 대신 `<BackButton>` 사용
- 네비게이션 동작 유지

### 4.10 1단계 E2E 테스트

**TODO 1.9**: 1단계 시각적 검증을 위한 E2E 테스트 작성

생성: `apps/frontend-next/e2e/phase1-primitives.spec.ts`

테스트 케이스:
1. **대시보드 페이지 에러 없이 렌더링**: Operations, Quality, AI Performance, Business
2. **Admin 페이지 렌더링**: Users, Roles, Filters, Analysis
3. **ETL 페이지 렌더링**: Minkabu, Wind
4. **에러 상태 올바르게 표시**: API 에러 모킹, `ErrorAlert` 렌더링 검증
5. **로딩 상태 올바르게 표시**: 데이터 로드 전 스피너 표시 검증
6. **배지가 올바른 색상으로 렌더링**: Users 페이지 이동, 상태 배지 검증
7. **페이지 헤더가 action과 함께 렌더링**: admin 페이지에서 제목 + 버튼 레이아웃 검증
8. **Report Monitoring 페이지**: 날짜 형식 검증

완료 기준:
- 실행 중인 dev 서버에 대해 모든 테스트 통과
- `pnpm --filter frontend-next test:e2e`로 테스트 실행 가능

### 4.11 1단계 검증 체크리스트

PR 병합 전:
- [ ] `pnpm build:frontend-next` 통과
- [ ] 모든 1단계 E2E 테스트 통과
- [ ] 다음 페이지의 수동 브라우저 검증:
  - [ ] `/dashboard/operations` -- 로딩, 에러, 헤더, KPI 카드
  - [ ] `/dashboard/quality` -- 차트 렌더링, 날짜 형식
  - [ ] `/dashboard/user-analytics` -- 사용자 목록 테이블, formatNumber
  - [ ] `/dashboard/admin/users` -- 배지, 검색, CRUD
  - [ ] `/dashboard/admin/roles` -- 배지, 검색
  - [ ] `/dashboard/report-monitoring` -- 상태 배지, 날짜 형식
  - [ ] `/dashboard/etl/minkabu` -- 차트, 파이 색상
  - [ ] `/dashboard/etl/wind` -- minkabu와 동일한 레이아웃
  - [ ] `/dashboard/admin/batch-analysis` -- 이슈 빈도 파이 차트
- [ ] 로컬 `formatDate`/`formatNumber`/`truncateText` 정의 없음 (grep 검증)
- [ ] 차트 파일에 로컬 `COLORS` 배열 없음 (grep 검증)

---

## 5. 2단계: Modal + Table 확장 + 중간 Primitives

**위험 수준**: 중간 | **접근법**: 보수적 (점진적 마이그레이션)
**브랜치**: `refactor/phase2-modal-table`
**의존성**: 1단계 병합됨

### 5.1 Footer와 Full 크기로 `Modal` 확장

**TODO 2.1**: `apps/frontend-next/src/components/ui/Modal.tsx` 수정

현재 Modal Props: `isOpen, onClose, title, children, size`
확장된 Props:
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';  // 'full' 추가
  footer?: React.ReactNode;                       // footer 슬롯 추가
  closeOnBackdrop?: boolean;                       // 추가 (기본값: true)
  className?: string;                              // 컨텐츠 영역용 추가
}
```

변경 사항:
- `full` 크기 클래스 추가: `'full': 'max-w-[95vw] max-h-[95vh]'`
- 컨텐츠 아래에 `border-t`가 있는 선택적 footer 섹션 추가
- `closeOnBackdrop` prop 추가 (일부 모달은 이것을 비활성화해야 함)

확장된 `Modal`을 사용하도록 커스텀 모달 오버레이 마이그레이션:

| 파일 | 현재 오버레이 | 마이그레이션 접근법 |
|------|----------------|-------------------|
| `components/charts/UserActivityDialog.tsx` | 커스텀 `fixed inset-0` 오버레이 | 오버레이를 `<Modal size="xl">`로 교체, 내부 컨텐츠 유지 |
| `components/session-analysis/SessionTimelineModal.tsx` | 커스텀 `fixed inset-0` 오버레이 | 오버레이를 `<Modal size="lg">`로 교체 |
| `components/charts/ProblematicChatDialog.tsx` | 커스텀 `fixed inset-0` 오버레이 | 오버레이를 `<Modal size="lg">`로 교체 |
| `app/dashboard/admin/problematic-rules/page.tsx` | 커스텀 인라인 모달 | 오버레이를 `<Modal size="lg">`로 교체, 내부 컨텐츠 추출 |

**보수적 접근법**: 다이얼로그를 한 번에 하나씩 마이그레이션합니다. 각 마이그레이션 후 E2E 테스트를 실행하여 검증합니다. 다이얼로그가 크게 다른 동작을 가지고 있다면 (예: 다단계 wizard), 커스텀으로 유지하되 Modal을 기본 래퍼로 사용합니다.

완료 기준:
- `Modal`이 `footer`, `full` 크기, `closeOnBackdrop` 지원
- 기존 Modal 사용 (`QueryResponseScatterPlot`)이 여전히 작동 (하위 호환)
- 4개의 커스텀 오버레이가 `Modal` 사용으로 마이그레이션됨
- 다이얼로그별로 배경 클릭 동작 유지

### 5.2 Pagination으로 `DataTable` 확장

**TODO 2.2**: `apps/frontend-next/src/components/compound/DataTable/index.tsx`에 `DataTable.Pagination` 하위 컴포넌트 추가

DataTableContext에 추가:
```typescript
// 컨텍스트에 추가
currentPage: number;
pageSize: number;
setCurrentPage: (page: number) => void;
setPageSize: (size: number) => void;
totalPages: number;
paginatedData: T[];  // Body 렌더링에서 filteredData 대체
```

새로운 하위 컴포넌트:
```typescript
function DataTablePagination({
  pageSizeOptions?: number[];  // 기본값: [10, 25, 50]
  className?: string;
})
```

**중요**: Pagination은 **선택적**이어야 합니다. `DataTable.Pagination`이 자식으로 렌더링되지 않으면, 모든 데이터가 pagination 없이 표시됩니다 (현재 동작 유지). Root 컴포넌트는 ref/state 플래그를 통해 pagination이 마운트되었는지 감지합니다.

점진적으로 마이그레이션할 파일:

| 파일 | 현재 Pagination | 우선순위 |
|------|-------------------|----------|
| `components/charts/UserListTable.tsx` | 커스텀 pagination 로직 | 높음 - 가장 복잡 |
| `components/charts/ProblematicChatTable.tsx` | 커스텀 pagination 로직 | 높음 |
| `app/dashboard/admin/users/page.tsx` | pagination 없음 (모든 행) | 중간 |
| `app/dashboard/admin/roles/page.tsx` | pagination 없음 (모든 행) | 중간 |
| `app/dashboard/admin/batch-analysis/schedules/page.tsx` | 인라인 테이블 | 낮음 |

**보수적 접근법**: 먼저 기존 사용을 깨뜨리지 않고 DataTable에 pagination을 추가합니다. 그런 다음 `UserListTable`을 증명으로 마이그레이션합니다. 다른 테이블은 각각 마이그레이션 후 E2E 검증을 수행하며 하나씩 마이그레이션합니다.

완료 기준:
- `DataTable.Pagination`이 페이지 컨트롤 렌더링 (이전/다음, 페이지 번호, 페이지 크기 선택기)
- 기존 DataTable 사용 (Business, Chatbot Quality 페이지)이 pagination 없이 작동
- `UserListTable`과 `ProblematicChatTable`이 성공적으로 마이그레이션됨
- Pagination 상태가 검색/정렬과 동기화됨 (검색 시 1페이지로 리셋)

### 5.3 `TabBar` 컴포넌트 추출

**TODO 2.3**: `apps/frontend-next/src/components/ui/TabBar.tsx` 생성

Props 인터페이스:
```typescript
interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'underline' | 'pills';  // 기본값: 'underline'
  className?: string;
}
```

마이그레이션할 파일:

| 파일 | 현재 Tab 구현 |
|------|---------------------------|
| `app/dashboard/admin/batch-analysis/page.tsx` | 인라인 탭 (ChatQualityTab, FAQTab, SessionTab) |
| `app/dashboard/user-analytics/page.tsx` | 인라인 탭 네비게이션 |

완료 기준:
- 두 페이지 모두 일관된 스타일로 `<TabBar>` 사용
- 탭 전환 동작 유지
- 활성 탭 인디케이터가 현재 디자인과 일치

### 5.4 `Accordion` 컴포넌트 추출

**TODO 2.4**: `apps/frontend-next/src/components/ui/Accordion.tsx` 생성

Props 인터페이스:
```typescript
interface AccordionItem {
  id: string;
  title: React.ReactNode;
  content: React.ReactNode;
  defaultOpen?: boolean;
}

interface AccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;  // 기본값: true
  className?: string;
}
```

마이그레이션할 파일:

| 파일 | 현재 확장/축소 패턴 |
|------|---------------------------------|
| `app/dashboard/admin/batch-analysis/[id]/page.tsx` | 분석 결과용 인라인 accordion |
| `app/dashboard/admin/batch-analysis/faq/[id]/page.tsx` | FAQ 클러스터용 인라인 accordion |
| `app/dashboard/report-monitoring/page.tsx` | 인라인 접을 수 있는 섹션 |
| `app/dashboard/admin/batch-analysis/issue-frequency/page.tsx` | 인라인 확장 가능 행 |

완료 기준:
- 일관된 확장/축소 애니메이션
- 열기/닫기 시 chevron 아이콘 회전
- 기본적으로 여러 항목이 동시에 열릴 수 있음

### 5.5 `ToggleSwitch` 컴포넌트 추출

**TODO 2.5**: `apps/frontend-next/src/components/ui/ToggleSwitch.tsx` 생성

Props 인터페이스:
```typescript
interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}
```

마이그레이션할 파일:

| 파일 | 현재 토글 |
|------|---------------|
| `app/dashboard/admin/batch-analysis/schedules/page.tsx` | 스케줄 활성화/비활성화용 인라인 토글 |
| `app/dashboard/admin/problematic-rules/page.tsx` | 규칙 활성화/비활성화용 인라인 토글 |

완료 기준:
- 부드러운 전환 애니메이션
- 접근성 (키보드 조작 가능, aria-checked)
- 비활성화 상태가 시각적으로 구분됨

### 5.6 `StatsFooter` 컴포넌트 추출

**TODO 2.6**: `apps/frontend-next/src/components/ui/StatsFooter.tsx` 생성

Props 인터페이스:
```typescript
interface StatItem {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}

interface StatsFooterProps {
  stats: StatItem[];
  className?: string;
}
```

마이그레이션할 파일 (동일한 3열 통계 footer가 있는 6개 admin 페이지):

| 파일 |
|------|
| `app/dashboard/admin/users/page.tsx` |
| `app/dashboard/admin/roles/page.tsx` |
| `app/dashboard/admin/filters/page.tsx` |
| `app/dashboard/admin/analysis/page.tsx` |
| `app/dashboard/admin/batch-analysis/schedules/page.tsx` |
| `app/dashboard/admin/batch-analysis/prompts/page.tsx` |

완료 기준:
- 모든 6개 admin 페이지가 `<StatsFooter>` 사용
- 일관된 3열 그리드 레이아웃
- 동일한 시각적 모양

### 5.7 2단계 E2E 테스트

**TODO 2.7**: 2단계를 위한 E2E 테스트 작성

생성: `apps/frontend-next/e2e/phase2-modal-table.spec.ts`

테스트 케이스:
1. **모달 열기 및 닫기**: UserFormModal 열기, 배경 검증, X 버튼으로 닫기
2. **배경 클릭으로 모달 닫기**: UserActivityDialog에서 배경 클릭, 닫힘 검증
3. **DataTable pagination**: User Analytics로 이동, 페이지 컨트롤 검증
4. **DataTable 정렬 + 검색 + 페이지네이션**: 작업 결합, 올바른 데이터 검증
5. **TabBar 전환**: Batch Analysis로 이동, 각 탭 클릭, 컨텐츠 변경 검증
6. **Accordion 확장/축소**: batch analysis 상세로 이동, 섹션 확장/축소
7. **토글 스위치**: 스케줄로 이동, 스케줄 토글, 상태 변경 검증
8. **통계 footer**: admin users 페이지에서 3열 레이아웃 검증

완료 기준:
- 모든 테스트 통과
- 불안정한 테스트 없음 (적절한 wait-for 선택자)

### 5.8 2단계 검증 체크리스트

PR 병합 전:
- [ ] `pnpm build:frontend-next` 통과
- [ ] 모든 1단계 + 2단계 E2E 테스트 통과
- [ ] 수동 브라우저 검증:
  - [ ] `/dashboard/admin/users` -- 생성 모달, 편집 모달, 삭제 확인 열기
  - [ ] `/dashboard/user-analytics` -- 사용자 행 클릭, UserActivityDialog 모달 검증
  - [ ] `/dashboard/user-analytics` -- 탭 전환 작동
  - [ ] `/dashboard/admin/batch-analysis` -- 탭 전환
  - [ ] `/dashboard/admin/batch-analysis/{id}` -- accordion 확장/축소
  - [ ] `/dashboard/admin/batch-analysis/schedules` -- 토글 스위치
  - [ ] `/dashboard/admin/problematic-rules` -- 모달 및 토글 스위치
  - [ ] `/dashboard/report-monitoring` -- 접을 수 있는 섹션
  - [ ] `/dashboard/quality` -- 세션 타임라인 모달 (해당되는 경우)
- [ ] `QueryResponseScatterPlot`의 기존 Modal 사용이 여전히 작동
- [ ] Business/Chatbot Quality 페이지의 기존 DataTable 사용이 여전히 작동

---

## 6. 3단계: 아키텍처 패턴

**위험 수준**: 중간-높음 | **접근법**: 보수적 (패턴 생성, 점진적 마이그레이션)
**브랜치**: `refactor/phase3-architecture`
**의존성**: 2단계 병합됨

### 6.1 `useAdminCRUD` Hook 생성

**TODO 3.1**: `apps/frontend-next/src/hooks/useAdminCRUD.ts` 생성

이 hook은 Users, Roles, Filters, Analysis Sessions 페이지에서 발견되는 동일한 CRUD 패턴을 추출합니다.

인터페이스:
```typescript
interface UseAdminCRUDOptions<T extends { id: string | number }> {
  fetchFn: () => Promise<T[]>;
  deleteFn: (id: string | number) => Promise<void>;
  entityName: string;  // 에러 메시지용
}

interface UseAdminCRUDReturn<T> {
  items: T[];
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  loading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedItem: T | null;
  isFormOpen: boolean;
  isDeleteDialogOpen: boolean;
  itemToDelete: T | null;
  isDeleting: boolean;
  handleCreate: () => void;
  handleEdit: (item: T) => void;
  handleDeleteClick: (item: T) => void;
  handleDeleteConfirm: () => Promise<void>;
  handleFormSuccess: (item: T) => void;
  closeForm: () => void;
  closeDeleteDialog: () => void;
  refresh: () => Promise<void>;
}
```

이 hook은 admin 페이지당 ~60줄의 동일한 상태 관리 보일러플레이트를 대체합니다.

완료 기준:
- Hook이 제네릭으로 완전히 타입 지정됨
- 로딩, 에러, 검색, CRUD 상태 처리
- `handleFormSuccess`가 생성 vs. 업데이트를 올바르게 구분 (`selectedItem`을 통해)

### 6.2 `AdminPageLayout` 컴포넌트 생성

**TODO 3.2**: `apps/frontend-next/src/components/admin/AdminPageLayout.tsx` 생성

Props 인터페이스:
```typescript
interface AdminPageLayoutProps {
  title: string;
  description?: string;
  createButtonLabel: string;
  onCreate: () => void;
  loading: boolean;
  error: string | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchPlaceholder?: string;
  statsFooter?: StatItem[];
  children: React.ReactNode;  // 메인 컨텐츠 (테이블/카드)
}
```

이것은 `PageHeader`, `SearchInput`, `LoadingSpinner`, `ErrorAlert`, `StatsFooter`를 표준 admin 페이지 레이아웃으로 구성합니다:
```
[제목 + 생성 버튼이 있는 PageHeader]
[SearchInput]
[컨텐츠 영역 (children)]
[StatsFooter]
```

마이그레이션할 파일:

| 파일 | 현재 줄 수 | 예상 후 |
|------|--------------|----------------|
| `app/dashboard/admin/users/page.tsx` | ~250 | ~120 |
| `app/dashboard/admin/roles/page.tsx` | ~230 | ~110 |
| `app/dashboard/admin/filters/page.tsx` | ~200 | ~100 |
| `app/dashboard/admin/analysis/page.tsx` | ~220 | ~110 |

완료 기준:
- 모든 4개 admin CRUD 페이지가 `useAdminCRUD` + `AdminPageLayout` 사용
- 페이지별 렌더링 (카드 레이아웃 vs. 테이블 레이아웃)은 페이지 파일에 남아있음
- 총 코드 감소: 4개 페이지에서 ~400-500줄

### 6.3 ETL 페이지 통합

**TODO 3.3**: `apps/frontend-next/src/components/etl/ETLMonitoringPage.tsx` 생성

Minkabu와 Wind ETL 페이지는 구조적으로 동일합니다 (검증됨: 1-50줄이 거의 문자 대 문자로 일치). 차이점을 매개변수화합니다.

Props 인터페이스:
```typescript
interface ETLConfig {
  name: string;                    // "Minkabu" | "Wind"
  icon: React.ReactNode;          // Newspaper | FileText
  api: {
    getSummary: (days: number) => Promise<ETLSummary>;
    getRecentRuns: (days: number) => Promise<ETLRun[]>;
    getDailyTrend: (days: number) => Promise<ETLTrend[]>;
    getDetailStats: (days: number) => Promise<DetailStats[]>; // headlineStats | fileStats
    getErrors: (days: number) => Promise<ETLError[]>;
    getHealth: () => Promise<HealthCheckResponse>;
    triggerRun?: () => Promise<void>;
  };
  detailStatsTitle: string;        // "Headline Statistics" | "File Statistics"
  detailStatsColumns: Column[];    // 테이블 열 정의
  charts: {
    areaChartConfig: AreaChartConfig;
    barChartConfig: BarChartConfig;
  };
}

interface ETLMonitoringPageProps {
  config: ETLConfig;
}
```

공유 구조 (두 페이지 모두):
1. 제목 + 마지막 새로고침 + 트리거 버튼이 있는 헤더
2. 4개 KPICards (총 실행, 성공률, 평균 기간, 총 항목)
3. Area 차트 (일일 트렌드)
4. Bar 차트 (상세 분석)
5. 최근 실행 테이블
6. 에러 테이블
7. 시스템 상태 섹션

수정할 파일:
- 생성: `apps/frontend-next/src/components/etl/ETLMonitoringPage.tsx`
- 생성: `apps/frontend-next/src/components/etl/types.ts` (공유 ETL 타입)
- 수정: `app/dashboard/etl/minkabu/page.tsx` -- config + `<ETLMonitoringPage config={minkabuConfig} />`로 축소
- 수정: `app/dashboard/etl/wind/page.tsx` -- config + `<ETLMonitoringPage config={windConfig} />`로 축소

완료 기준:
- 두 ETL 페이지 모두 현재와 동일하게 렌더링
- 각 page.tsx 파일이 80줄 미만 (config 정의 + 렌더링만)
- 세 번째 ETL 소스 추가 시 새로운 config 객체만 필요
- 공유 컴포넌트는 ~300줄 (현재 페이지당 ~500+ 줄 대비)

### 6.4 Dashboard Compound 마이그레이션

**TODO 3.4**: Operations, Quality, AI Performance 페이지를 `Dashboard` compound 컴포넌트 사용으로 마이그레이션

이 3개 페이지는 현재 자체 로딩/에러/레이아웃 보일러플레이트를 구현하고 있습니다. `Dashboard` compound는 이미 `Header`, `KPISection`, `ChartsSection`, `TableSection`, `Skeleton`, `Error`, `Empty`, `Content`를 제공합니다.

페이지별 마이그레이션 패턴:
```tsx
// 이전 (각 페이지):
if (loading) return <div className="animate-spin...">Loading...</div>
if (error) return <div className="bg-rose-50...">Error</div>
return (
  <div className="p-8 bg-gray-50">
    <div className="flex justify-between...">header</div>
    <div className="grid grid-cols-4...">KPIs</div>
    <div className="grid grid-cols-2...">Charts</div>
  </div>
)

// 이후:
return (
  <Dashboard isLoading={loading} error={error}>
    <Dashboard.Skeleton />
    <Dashboard.Error />
    <Dashboard.Content>
      <Dashboard.Header title="..." rightContent={<DateRangeFilter />} />
      <Dashboard.KPISection>{/* KPI 카드 */}</Dashboard.KPISection>
      <Dashboard.ChartsSection>{/* 차트 */}</Dashboard.ChartsSection>
    </Dashboard.Content>
  </Dashboard>
)
```

마이그레이션할 파일:

| 파일 | 현재 보일러플레이트 줄 수 | 예상 감소 |
|------|--------------------------|-------------------|
| `app/dashboard/operations/page.tsx` | ~30줄 로딩/에러/레이아웃 | -20줄 |
| `app/dashboard/quality/page.tsx` | ~30줄 로딩/에러/레이아웃 | -20줄 |
| `app/dashboard/ai-performance/page.tsx` | ~30줄 로딩/에러/레이아웃 | -20줄 |

**참고**: Business와 Chatbot Quality 페이지는 이미 Dashboard compound를 사용함 -- 변경 불필요.

완료 기준:
- 3개 페이지가 Dashboard compound로 마이그레이션됨
- 데이터 페치 중 로딩 skeleton 표시
- 에러 상태가 올바르게 렌더링
- 레이아웃 그리드 간격이 현재 디자인과 일치

### 6.5 3단계 E2E 테스트

**TODO 3.5**: 3단계를 위한 E2E 테스트 작성

생성: `apps/frontend-next/e2e/phase3-architecture.spec.ts`

테스트 케이스:
1. **Admin CRUD 플로우**: Users 페이지 -- 사용자 생성, 사용자 편집, 사용자 삭제 (전체 플로우)
2. **Admin CRUD 플로우**: Roles 페이지 -- 역할 생성, 권한 검증
3. **ETL Minkabu**: 전체 페이지 렌더링, KPI 카드, 차트, 테이블, 상태 섹션
4. **ETL Wind**: 전체 페이지 렌더링, Minkabu와 동일한 구조 검증
5. **Dashboard compound**: Operations 페이지 -- 로드 시 skeleton, 로드 후 컨텐츠 검증
6. **Dashboard compound**: Quality 페이지 -- 에러 상태 검증 (API 실패 모킹)
7. **Admin 레이아웃 일관성**: Users, Roles, Filters 간 이동 -- 일관된 레이아웃 검증

완료 기준:
- 모든 테스트 통과
- ETL 테스트가 공유 컴포넌트에도 불구하고 두 페이지 모두 올바른 데이터별 컨텐츠 표시 검증

### 6.6 3단계 검증 체크리스트

PR 병합 전:
- [ ] `pnpm build:frontend-next` 통과
- [ ] 모든 E2E 테스트 (1단계 + 2단계 + 3단계) 통과
- [ ] 수동 브라우저 검증:
  - [ ] `/dashboard/admin/users` -- `useAdminCRUD`로 전체 CRUD 플로우
  - [ ] `/dashboard/admin/roles` -- 전체 CRUD 플로우
  - [ ] `/dashboard/admin/filters` -- 전체 CRUD 플로우
  - [ ] `/dashboard/admin/analysis` -- `AdminPageLayout`으로 세션 목록
  - [ ] `/dashboard/etl/minkabu` -- 전체 페이지 렌더링, ETL 트리거, 차트, 상태
  - [ ] `/dashboard/etl/wind` -- 전체 페이지 렌더링, 동일한 레이아웃 검증
  - [ ] `/dashboard/operations` -- Dashboard compound: 로딩, 에러, 컨텐츠
  - [ ] `/dashboard/quality` -- Dashboard compound
  - [ ] `/dashboard/ai-performance` -- Dashboard compound
- [ ] Admin 페이지 코드 감소 검증 (제거된 보일러플레이트 grep)
- [ ] ETL page.tsx 파일이 각각 80줄 미만

---

## 7. 위험 식별 및 완화

| # | 위험 | 가능성 | 영향 | 완화 |
|---|------|-----------|--------|------------|
| R1 | 일부 파일에서 `formatters.date` 출력이 로컬 `formatDate`와 다름 | 높음 | 낮음 | 교체 전 각 파일의 출력 비교. 필요시 `formatters`에 형식 변형 추가. |
| R2 | 다이얼로그 간 모달 배경 클릭 동작이 다름 | 중간 | 중간 | 각 다이얼로그를 개별적으로 테스트. `closeOnBackdrop` prop 추가. |
| R3 | DataTable pagination이 기존 검색/정렬을 깨뜨림 | 중간 | 높음 | Pagination은 opt-in (`DataTable.Pagination` 자식이 렌더링될 때만 활성화). 기존 사용 영향 없음. |
| R4 | Admin CRUD hook이 엣지 케이스를 커버하지 못함 (예: Filters 페이지에 추가 상태 있음) | 중간 | 중간 | Hook이 수동 상태 관리용 `setItems` 반환. 페이지가 hook과 함께 추가 상태 추가 가능. |
| R5 | ETL 페이지에 감사에서 발견되지 않은 미묘한 차이가 있음 | 낮음 | 중간 | 통합 전 두 ETL 페이지 파일을 줄별로 비교. 모든 차이점 문서화. |
| R6 | Dashboard compound 마이그레이션이 간격/패딩 변경 | 낮음 | 낮음 | 이전/이후 스크린샷을 픽셀 단위로 비교. 필요시 compound 스타일 조정. |
| R7 | 데이터 로딩 타이밍으로 인한 불안정한 E2E 테스트 | 중간 | 낮음 | `waitForSelector` 및 `networkidle` 전략 사용. 결정적인 테스트를 위해 API 응답 모킹. |

---

## 8. 커밋 전략

### 1단계 커밋 (브랜치: `refactor/phase1-primitives`)

```
1. chore: Playwright E2E 테스트 설정 추가
2. refactor: 인라인 formatters를 lib/formatters.ts로 마이그레이션
3. refactor: PIE_COLORS를 chart-theme.ts로 통합
4. feat: Badge 컴포넌트 추출 (ui/Badge.tsx)
5. feat: PageHeader 컴포넌트 추출 (ui/PageHeader.tsx)
6. feat: LoadingSpinner 컴포넌트 추출 (ui/LoadingSpinner.tsx)
7. feat: ErrorAlert 컴포넌트 추출 (ui/ErrorAlert.tsx)
8. feat: EmptyState 및 BackButton 컴포넌트 추출
9. test: primitives를 위한 1단계 E2E 테스트 추가
```

### 2단계 커밋 (브랜치: `refactor/phase2-modal-table`)

```
1. feat: footer, full 크기, closeOnBackdrop으로 Modal 확장
2. refactor: UserActivityDialog를 Modal 컴포넌트로 마이그레이션
3. refactor: SessionTimelineModal을 Modal 컴포넌트로 마이그레이션
4. refactor: ProblematicChatDialog를 Modal 컴포넌트로 마이그레이션
5. refactor: ProblematicRules 인라인 모달을 Modal 컴포넌트로 마이그레이션
6. feat: DataTable.Pagination 하위 컴포넌트 추가
7. refactor: UserListTable을 pagination이 있는 DataTable로 마이그레이션
8. refactor: ProblematicChatTable을 pagination이 있는 DataTable로 마이그레이션
9. feat: TabBar 컴포넌트 추출 (ui/TabBar.tsx)
10. feat: Accordion 컴포넌트 추출 (ui/Accordion.tsx)
11. feat: ToggleSwitch 및 StatsFooter 컴포넌트 추출
12. test: 2단계 E2E 테스트 추가
```

### 3단계 커밋 (브랜치: `refactor/phase3-architecture`)

```
1. feat: useAdminCRUD hook 생성
2. feat: AdminPageLayout 컴포넌트 생성
3. refactor: Users 페이지를 useAdminCRUD + AdminPageLayout으로 마이그레이션
4. refactor: Roles 페이지를 useAdminCRUD + AdminPageLayout으로 마이그레이션
5. refactor: Filters 및 Analysis 페이지를 admin 패턴으로 마이그레이션
6. feat: ETLMonitoringPage 매개변수화된 컴포넌트 생성
7. refactor: Minkabu 및 Wind ETL 페이지 통합
8. refactor: Operations, Quality, AI Performance를 Dashboard compound로 마이그레이션
9. test: 3단계 E2E 테스트 추가
```

---

## 9. PR 설명 템플릿

### PR 1: 1단계 -- 유틸리티 추출 + UI Primitives

```markdown
## 요약

- Playwright E2E 테스트 인프라 설정
- 모든 인라인 formatDate/formatNumber/truncateText를 중앙 집중식 lib/formatters.ts로 마이그레이션 (11개 파일)
- PIE_COLORS 팔레트를 chart-theme.ts로 통합 (4개 파일)
- 6개의 새로운 UI primitive 컴포넌트 추출: Badge, PageHeader, LoadingSpinner, ErrorAlert, EmptyState, BackButton
- 15개 이상 페이지를 공유 primitives 사용으로 마이그레이션

## 동기

프론트엔드에 30개 이상의 중복된 유틸리티 함수 정의와 26개 페이지에 걸쳐 반복된 인라인 UI 패턴이 있었습니다. 이 PR은 동일한 시각적 출력을 유지하면서 중복을 제거합니다.

## 테스트 계획

- [x] `pnpm build:frontend-next` 통과
- [x] E2E 테스트 통과 (e2e/phase1-primitives.spec.ts)
- [x] 영향받는 모든 페이지의 수동 브라우저 검증
- [x] Grep 검증: 남아있는 인라인 formatter 정의 없음
- [x] Grep 검증: 남아있는 로컬 COLORS 배열 없음
```

### PR 2: 2단계 -- Modal/Table 확장 + 중간 Primitives

```markdown
## 요약

- footer 슬롯, full 크기, closeOnBackdrop으로 Modal 컴포넌트 확장
- 4개의 커스텀 모달 오버레이를 공유 Modal 사용으로 마이그레이션
- DataTable.Pagination 하위 컴포넌트 추가 (opt-in, 하위 호환)
- UserListTable 및 ProblematicChatTable을 DataTable로 마이그레이션
- 4개의 새로운 컴포넌트 추출: TabBar, Accordion, ToggleSwitch, StatsFooter
- 탭 네비게이션 (2개 페이지), accordions (4개 페이지), 토글 (2개 페이지), 통계 footers (6개 페이지) 마이그레이션

## 동기

모달 다이얼로그 및 테이블 컴포넌트 전체에서 UX 불일치 감소. 각 모달이 이전에 다른 배경 동작, border-radius, 애니메이션을 가지고 있었습니다.

## 테스트 계획

- [x] `pnpm build:frontend-next` 통과
- [x] E2E 테스트 통과 (phase1 + phase2)
- [x] QueryResponseScatterPlot의 기존 Modal 사용 변경 없음
- [x] Business/Chatbot Quality의 기존 DataTable 사용 변경 없음
- [x] 모든 모달, 테이블, 탭, accordion 상호작용의 수동 브라우저 검증
```

### PR 3: 3단계 -- 아키텍처 패턴

```markdown
## 요약

- 공유 CRUD 상태 관리를 위한 useAdminCRUD hook 생성
- PageHeader + SearchInput + ErrorAlert + StatsFooter를 구성하는 AdminPageLayout 컴포넌트 생성
- 4개의 admin CRUD 페이지 (Users, Roles, Filters, Analysis) 마이그레이션 -- ~500줄 제거
- 매개변수화된 ETLMonitoringPage 컴포넌트 생성
- Minkabu 및 Wind ETL 페이지 통합 (각각 ~500줄에서 ~80줄로 감소)
- 3개의 대시보드 페이지 (Operations, Quality, AI Performance)를 Dashboard compound로 마이그레이션

## 동기

새로운 admin 페이지와 ETL 모니터링 소스 추가를 간단하게 만드는 아키텍처 패턴 확립. 이제 새로운 ETL 소스는 전체 페이지 (~500줄) 대신 config 객체 (~60줄)만 필요합니다.

## 테스트 계획

- [x] `pnpm build:frontend-next` 통과
- [x] 모든 E2E 테스트 통과 (phase1 + phase2 + phase3)
- [x] admin 페이지에서 전체 CRUD 플로우 테스트
- [x] 두 ETL 페이지 모두 공유 컴포넌트로 올바르게 렌더링
- [x] Dashboard compound 로딩/에러/컨텐츠 상태 검증
```

---

## 10. 성공 기준 (전체)

| 지표 | 이전 | 3단계 후 | 검증 |
|--------|--------|---------------|--------------|
| 중복 유틸리티 정의 | 30+ | 0 | `grep -r "const formatDate"`가 0개 결과 반환 |
| 중복 COLORS 배열 | 4 | 0 | `grep -r "const COLORS ="`가 0개 차트 결과 반환 |
| 커스텀 모달 오버레이 | 5 | 1 (Modal.tsx) | `grep -r "fixed inset-0.*z-50"`가 Modal.tsx만 반환 |
| 커스텀 테이블 구현 | 10 | 2 (도메인별) | 독립 테이블 컴포넌트 수 세기 |
| 페이지당 Admin 페이지 보일러플레이트 | ~60줄 | ~10줄 | 수동 검토 |
| 소스당 ETL 페이지 코드 | ~500줄 | ~80줄 | 페이지 파일에서 `wc -l` |
| 공유 UI 컴포넌트 | 4 | 14 | `ls components/ui/` |
| E2E 테스트 커버리지 | 0개 테스트 | 20+ 테스트 | `pnpm test:e2e` |
| 빌드 상태 | 통과 | 통과 | `pnpm build:frontend-next` |

---

## 11. 파일 목록

### 생성할 새 파일

| 파일 | 단계 | 타입 |
|------|-------|------|
| `apps/frontend-next/playwright.config.ts` | 1 | Config |
| `apps/frontend-next/e2e/phase1-primitives.spec.ts` | 1 | Test |
| `apps/frontend-next/e2e/phase2-modal-table.spec.ts` | 2 | Test |
| `apps/frontend-next/e2e/phase3-architecture.spec.ts` | 3 | Test |
| `src/components/ui/Badge.tsx` | 1 | Component |
| `src/components/ui/PageHeader.tsx` | 1 | Component |
| `src/components/ui/LoadingSpinner.tsx` | 1 | Component |
| `src/components/ui/ErrorAlert.tsx` | 1 | Component |
| `src/components/ui/EmptyState.tsx` | 1 | Component |
| `src/components/ui/BackButton.tsx` | 1 | Component |
| `src/components/ui/TabBar.tsx` | 2 | Component |
| `src/components/ui/Accordion.tsx` | 2 | Component |
| `src/components/ui/ToggleSwitch.tsx` | 2 | Component |
| `src/components/ui/StatsFooter.tsx` | 2 | Component |
| `src/hooks/useAdminCRUD.ts` | 3 | Hook |
| `src/components/admin/AdminPageLayout.tsx` | 3 | Component |
| `src/components/etl/ETLMonitoringPage.tsx` | 3 | Component |
| `src/components/etl/types.ts` | 3 | Types |

(모든 `src/` 경로는 `apps/frontend-next/`를 기준으로 함)

### 수정할 파일 (요약)

| 단계 | 수정된 파일 | 주요 변경 사항 |
|-------|---------------|----------------|
| 1 | 11개 파일 | 인라인 formatters 제거, `lib/formatters.ts`에서 import |
| 1 | 4개 파일 | 로컬 COLORS 제거, chart-theme에서 PIE_COLORS import |
| 1 | 15개 이상 파일 | 인라인 헤더를 `<PageHeader>`로 교체 |
| 1 | 12개 파일 | 인라인 에러 div를 `<ErrorAlert>`로 교체 |
| 1 | 20개 이상 파일 | 인라인 스피너를 `<LoadingSpinner>`로 교체 |
| 1 | 5개 파일 | 인라인 배지를 `<Badge>`로 교체 |
| 1 | 5개 파일 | 인라인 뒤로 가기 버튼을 `<BackButton>`으로 교체 |
| 2 | 1개 파일 | `Modal.tsx` 확장 (footer, full 크기 추가) |
| 2 | 4개 파일 | 커스텀 오버레이를 `Modal`로 마이그레이션 |
| 2 | 1개 파일 | `DataTable/index.tsx` 확장 (Pagination 추가) |
| 2 | 2개 파일 | pagination이 있는 DataTable로 테이블 마이그레이션 |
| 2 | 2개 파일 | 인라인 탭을 `<TabBar>`로 교체 |
| 2 | 4개 파일 | 인라인 accordions를 `<Accordion>`으로 교체 |
| 2 | 2개 파일 | 인라인 토글을 `<ToggleSwitch>`로 교체 |
| 2 | 6개 파일 | 인라인 통계를 `<StatsFooter>`로 교체 |
| 3 | 4개 파일 | admin 페이지를 `useAdminCRUD` + `AdminPageLayout`으로 마이그레이션 |
| 3 | 2개 파일 | ETL 페이지를 config + `<ETLMonitoringPage>`로 축소 |
| 3 | 3개 파일 | Dashboard compound로 마이그레이션 |

---

## 12. 시작하기

구현을 시작하려면 `/start-work`를 실행하고 이 계획을 참조하세요. 1단계, TODO 1.0 (Playwright 설정)부터 시작한 다음 TODO를 순차적으로 진행하세요.
