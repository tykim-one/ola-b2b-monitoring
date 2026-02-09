<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-09 | Updated: 2026-02-09 -->

# business/

## Purpose
서비스별 비즈니스 메트릭 대시보드. 토큰 사용량, 예상 비용, 요청 수, 활성 테넌트 KPI와 함께 테넌트별 사용량 차트, 일별 비용 트렌드, 시간대별 히트맵, 테넌트 상세 테이블을 제공합니다.

## Key Files
| File | Description |
|------|-------------|
| `page.tsx` | 비즈니스 대시보드 - KPI, TenantPieChart, CostTrendChart, UsageHeatmap, DataTable |

## For AI Agents
### Working In This Directory
- **데이터 소스**: `useBusinessDashboard(projectId, days)` 훅 사용
  - `tenantUsage`: 테넌트별 요청 수, 토큰, 에러율
  - `costTrend`: 일별 비용 트렌드
  - `heatmap`: 시간대별 사용량 히트맵
  - `kpis`: 집계된 KPI (totalTokens, totalCost, totalRequests, tenantCount)
- **날짜 범위**: `DateRangeFilter` 기본값 30일
- **동적 import**: 차트 컴포넌트는 `next/dynamic`으로 SSR 비활성화 (`{ ssr: false }`)
  - 이유: Recharts는 클라이언트 전용 라이브러리, SSR 시 hydration 오류 발생
- **코드 스플리팅**: 각 차트마다 로딩 플레이스홀더 제공 (`bg-slate-800/50 rounded-lg animate-pulse`)

### Layout Structure
```tsx
<Dashboard>
  <Dashboard.Header title="비즈니스 분석" rightContent={<DateRangeFilter />} />
  <Dashboard.Content>
    <Dashboard.KPISection columns={4}> {/* 4개 KPI */}
    <Suspense>
      <Dashboard.ChartsSection columns={2}> {/* TenantPieChart, CostTrendChart */}
    </Suspense>
    <Suspense>
      {/* UsageHeatmap */}
    </Suspense>
    <Dashboard.TableSection title="테넌트별 상세 현황">
      <DataTable> {/* 테넌트 테이블 */}
    </Dashboard.TableSection>
  </Dashboard.Content>
</Dashboard>
```

### DataTable Configuration
```tsx
// 컬럼 정의
const tenantColumns: Column<TenantUsage>[] = [
  { key: 'tenant_id', header: '테넌트', sortable: true },
  { key: 'request_count', header: '요청 수', sortable: true, align: 'right' },
  { key: 'total_tokens', header: '총 토큰', sortable: true, align: 'right' },
  { key: 'avg_tokens', header: '평균 토큰', sortable: true, align: 'right' },
  { key: 'error_rate', header: '에러율', sortable: true, align: 'right',
    render: (value) => /* 1% 초과 시 빨간색 */ },
];

// DataTable 사용 (검색 + 정렬 + 페이지네이션)
<DataTable data={tenantUsage} columns={tenantColumns} searchFields={['tenant_id']}>
  <DataTable.Toolbar>
    <DataTable.Search placeholder="테넌트 검색..." />
  </DataTable.Toolbar>
  <DataTable.Content>
    <DataTable.Header />
    <DataTable.Body emptyMessage="테넌트 데이터가 없습니다" />
  </DataTable.Content>
  <DataTable.Footer />
</DataTable>
```

### Performance Optimization
- **동적 import**: 차트 컴포넌트는 lazy load로 초기 번들 크기 감소
- **Suspense 경계**: 각 차트 섹션마다 독립적인 로딩 상태
- **useMemo**: 차트 데이터 변환 시 메모이제이션 권장 (프로젝트 메모리 참고)

## Dependencies
### Internal
- `@/hooks/useServiceContext` - 서비스 컨텍스트 (projectId, serviceId, config)
- `@/hooks/queries/use-dashboard` - `useBusinessDashboard` 훅
- `@/components/compound/Dashboard` - Dashboard 컴포넌트
- `@/components/compound/DataTable` - DataTable 컴포넌트
- `@/components/kpi/KPICard` - KPI 카드
- `@/components/charts/TenantPieChart` - 테넌트 파이 차트
- `@/components/charts/CostTrendChart` - 비용 트렌드 차트
- `@/components/charts/UsageHeatmap` - 사용량 히트맵
- `@/components/ui/DateRangeFilter` - 날짜 범위 선택기
- `@ola/shared-types` - `TenantUsage` 타입

### External
- `next/dynamic` - 동적 import (SSR 비활성화)
- `lucide-react` - 아이콘 (DollarSign, TrendingUp, Users, BarChart3)
