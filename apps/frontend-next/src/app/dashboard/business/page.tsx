'use client';

import { useState } from 'react';
import { DollarSign, TrendingUp, Users, BarChart3 } from 'lucide-react';
import { useBusinessDashboard } from '@/hooks/queries/use-dashboard';
import { Dashboard } from '@/components/compound/Dashboard';
import { DataTable, Column } from '@/components/compound/DataTable';
import KPICard from '@/components/kpi/KPICard';
import TenantPieChart from '@/components/charts/TenantPieChart';
import CostTrendChart from '@/components/charts/CostTrendChart';
import UsageHeatmap from '@/components/charts/UsageHeatmap';
import DateRangeFilter, { type DateRange } from '@/components/ui/DateRangeFilter';
import type { TenantUsage } from '@ola/shared-types';

// 현재 projectId - 추후 동적으로 변경 가능
const PROJECT_ID = 'ibks';

// 테넌트 테이블 컬럼 정의
const tenantColumns: Column<TenantUsage>[] = [
  {
    key: 'tenant_id',
    header: '테넌트',
    sortable: true,
    render: (value) => (
      <span className="font-medium text-white">{String(value)}</span>
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

export default function BusinessPage() {
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: '', endDate: '', days: 30 });

  const {
    tenantUsage,
    costTrend,
    heatmap,
    kpis,
    isLoading,
    error,
  } = useBusinessDashboard(PROJECT_ID, dateRange.days);

  return (
    <Dashboard isLoading={isLoading} error={error as Error | null}>
      <Dashboard.Header
        title="비즈니스 분석"
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
          <KPICard
            title="총 토큰 사용량"
            value={kpis.totalTokens}
            format="tokens"
            icon={<BarChart3 className="w-5 h-5" />}
            status="neutral"
          />
          <KPICard
            title="예상 비용"
            value={kpis.totalCost}
            format="currency"
            icon={<DollarSign className="w-5 h-5" />}
            status="neutral"
          />
          <KPICard
            title="총 요청 수"
            value={kpis.totalRequests}
            format="number"
            icon={<TrendingUp className="w-5 h-5" />}
            status="neutral"
          />
          <KPICard
            title="활성 테넌트"
            value={kpis.tenantCount}
            format="number"
            icon={<Users className="w-5 h-5" />}
            status="neutral"
          />
        </Dashboard.KPISection>

        {/* Charts Row */}
        <Dashboard.ChartsSection columns={2}>
          <TenantPieChart
            data={tenantUsage}
            title="테넌트별 토큰 사용량"
            dataKey="total_tokens"
          />
          <CostTrendChart
            data={costTrend}
            title="일별 비용 트렌드"
          />
        </Dashboard.ChartsSection>

        {/* Heatmap */}
        <div className="mb-8">
          <UsageHeatmap
            data={heatmap}
            title={`시간대별 사용량 히트맵 (최근 ${dateRange.days}일)`}
          />
        </div>

        {/* Tenant Table */}
        <Dashboard.TableSection title="테넌트별 상세 현황">
          <DataTable
            data={tenantUsage}
            columns={tenantColumns}
            searchFields={['tenant_id']}
          >
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
