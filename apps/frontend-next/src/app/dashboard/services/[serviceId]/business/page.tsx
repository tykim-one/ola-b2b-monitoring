'use client';

import { useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { DollarSign, TrendingUp, Users, BarChart3 } from 'lucide-react';
import { useBusinessDashboard } from '@/hooks/queries/use-dashboard';
import { useServiceContext } from '@/hooks/useServiceContext';
import { Dashboard } from '@/components/compound/Dashboard';
import { DataTable, Column } from '@/components/compound/DataTable';
import KPICard from '@/components/kpi/KPICard';
import DateRangeFilter, { type DateRange } from '@/components/ui/DateRangeFilter';
import type { TenantUsage } from '@ola/shared-types';

const TenantPieChart = dynamic(
  () => import('@/components/charts/TenantPieChart'),
  { ssr: false, loading: () => <div className="h-[300px] bg-slate-800/50 rounded-lg animate-pulse" /> }
);

const CostTrendChart = dynamic(
  () => import('@/components/charts/CostTrendChart'),
  { ssr: false, loading: () => <div className="h-[300px] bg-slate-800/50 rounded-lg animate-pulse" /> }
);

const UsageHeatmap = dynamic(
  () => import('@/components/charts/UsageHeatmap'),
  { ssr: false, loading: () => <div className="h-64 bg-slate-800/50 rounded-lg animate-pulse" /> }
);

// 테넌트 테이블 컬럼 정의
const tenantColumns: Column<TenantUsage>[] = [
  {
    key: 'tenant_id',
    header: '테넌트',
    sortable: true,
    render: (value) => (
      <span className="font-medium text-gray-900">{String(value)}</span>
    ),
  },
  {
    key: 'request_count',
    header: '요청 수',
    sortable: true,
    align: 'right',
    render: (value) => Number(value).toLocaleString(),
  },
  {
    key: 'total_tokens',
    header: '총 토큰',
    sortable: true,
    align: 'right',
    render: (value) => Number(value).toLocaleString(),
  },
  {
    key: 'avg_tokens',
    header: '평균 토큰',
    sortable: true,
    align: 'right',
    render: (value) => Math.round(Number(value)).toLocaleString(),
  },
  {
    key: 'error_rate',
    header: '에러율',
    sortable: true,
    align: 'right',
    render: (value) => {
      const rate = Number(value);
      return (
        <span className={rate > 1 ? 'text-rose-400' : 'text-emerald-400'}>
          {rate.toFixed(2)}%
        </span>
      );
    },
  },
];

export default function ServiceBusinessPage() {
  const ctx = useServiceContext();
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: '', endDate: '', days: 30 });

  if (!ctx) {
    return (
      <div className="p-8 h-full overflow-y-auto bg-gray-50">
        <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl">
          <p className="text-rose-600">서비스 컨텍스트를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const {
    tenantUsage,
    costTrend,
    heatmap,
    kpis,
    isLoading,
    error,
  } = useBusinessDashboard(ctx.projectId, dateRange.days);

  return (
    <Dashboard isLoading={isLoading} error={error as Error | null}>
      <Dashboard.Header
        title={`${ctx.config?.name || ctx.serviceId} 비즈니스 분석`}
        rightContent={
          <DateRangeFilter
            defaultPreset="month"
            onChange={(range) => setDateRange(range)}
          />
        }
      />

      <Dashboard.Skeleton />
      <Dashboard.Error />

      <Dashboard.Content>
        {/* KPI Cards */}
        <Dashboard.KPISection columns={4}>
          <KPICard title="총 토큰 사용량" value={kpis.totalTokens} format="tokens" icon={<BarChart3 className="w-5 h-5" />} status="neutral" />
          <KPICard title="예상 비용" value={kpis.totalCost} format="currency" icon={<DollarSign className="w-5 h-5" />} status="neutral" />
          <KPICard title="총 요청 수" value={kpis.totalRequests} format="number" icon={<TrendingUp className="w-5 h-5" />} status="neutral" />
          <KPICard title="활성 테넌트" value={kpis.tenantCount} format="number" icon={<Users className="w-5 h-5" />} status="neutral" />
        </Dashboard.KPISection>

        {/* Charts Row */}
        <Suspense fallback={<div className="h-[300px] bg-slate-800/50 rounded-lg animate-pulse" />}>
          <Dashboard.ChartsSection columns={2}>
            <TenantPieChart data={tenantUsage} title="테넌트별 토큰 사용량" dataKey="total_tokens" />
            <CostTrendChart data={costTrend} title="일별 비용 트렌드" />
          </Dashboard.ChartsSection>
        </Suspense>

        {/* Heatmap */}
        <Suspense fallback={<div className="h-64 bg-slate-800/50 rounded-lg animate-pulse" />}>
          <div className="mb-8">
            <UsageHeatmap data={heatmap} title={`시간대별 사용량 히트맵 (최근 ${dateRange.days}일)`} />
          </div>
        </Suspense>

        {/* Tenant Table */}
        <Dashboard.TableSection title="테넌트별 상세 현황">
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
        </Dashboard.TableSection>
      </Dashboard.Content>
    </Dashboard>
  );
}
