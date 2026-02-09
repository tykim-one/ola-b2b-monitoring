<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-09 | Updated: 2026-02-09 -->

# ai-performance/

## Purpose
서비스별 AI 성능 모니터링 페이지. 실시간 KPI (총 요청, 에러율, 평균 토큰, 활성 테넌트), 시간별 트래픽 차트, 에러 게이지, 시스템 상태를 표시합니다.

## Key Files
| File | Description |
|------|-------------|
| `page.tsx` | AI 성능 대시보드 - KPI 카드, RealtimeTrafficChart, ErrorGauge, 시스템 상태 |

## For AI Agents
### Working In This Directory
- **데이터 소스**: `useOperationsDashboard(projectId, days)` 훅 사용
  - `realtimeKPI`: 실시간 KPI (error_rate 등)
  - `hourlyTraffic`: 시간별 트래픽 데이터
  - `kpis`: 집계된 KPI (totalRequests, errorRate, avgTokens, activeTenants)
- **날짜 범위**: `DateRangeFilter` 컴포넌트로 1일/7일/30일 선택 (기본값: 1일)
- **KPI 임계값**:
  - 에러율 > 1% → 빨간색 상태 (`status="error"`)
  - 에러율 ≤ 1% → 녹색 상태 (`status="success"`)
- **시스템 상태 표시**: BigQuery, NestJS API, In-Memory Cache (모두 `animate-pulse` 녹색 점)

### Layout Structure
```tsx
<Dashboard>
  <Dashboard.Header title="AI 성능 모니터링" rightContent={<DateRangeFilter />} />
  <Dashboard.Content>
    <Dashboard.KPISection columns={4}> {/* 4개 KPI 카드 */}
    <Dashboard.ChartsSection columns={2}> {/* RealtimeTrafficChart, ErrorGauge */}
    {/* 시스템 상태 패널 */}
  </Dashboard.Content>
</Dashboard>
```

### Common Patterns
```tsx
// 서비스 컨텍스트 확인
const ctx = useServiceContext();
if (!ctx) return <ErrorMessage />;

// 데이터 로딩
const { realtimeKPI, hourlyTraffic, kpis, isLoading, error, refetch } =
  useOperationsDashboard(ctx.projectId, dateRange.days);

// KPI 상태 조건부 렌더링
<KPICard
  status={kpis.errorRate > 1 ? 'error' : 'success'}
  subtitle="임계값: 1%"
/>
```

## Dependencies
### Internal
- `@/hooks/useServiceContext` - 서비스 컨텍스트 (projectId, serviceId, config)
- `@/hooks/queries/use-dashboard` - `useOperationsDashboard` 훅
- `@/components/compound/Dashboard` - Dashboard 컴포넌트
- `@/components/kpi/KPICard` - KPI 카드
- `@/components/charts/RealtimeTrafficChart` - 시간별 트래픽 차트
- `@/components/charts/ErrorGauge` - 에러율 게이지 차트
- `@/components/ui/DateRangeFilter` - 날짜 범위 선택기

### External
- `lucide-react` - 아이콘 (Activity, AlertTriangle, Zap, Users)
