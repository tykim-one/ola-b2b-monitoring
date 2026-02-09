'use client';

import { useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Activity, AlertTriangle, Zap, Users } from 'lucide-react';
import { useOperationsDashboard } from '@/hooks/queries/use-dashboard';
import { Dashboard } from '@/components/compound/Dashboard';
import KPICard from '@/components/kpi/KPICard';
import DateRangeFilter, { type DateRange } from '@/components/ui/DateRangeFilter';
import { PROJECT_ID } from '@/lib/config';

const RealtimeTrafficChart = dynamic(
  () => import('@/components/charts/RealtimeTrafficChart'),
  { ssr: false, loading: () => <div className="h-[300px] bg-slate-800/50 rounded-lg animate-pulse" /> }
);

const ErrorGauge = dynamic(
  () => import('@/components/charts/ErrorGauge'),
  { ssr: false, loading: () => <div className="h-[200px] bg-slate-800/50 rounded-lg animate-pulse" /> }
);

export default function OperationsPage() {
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: '', endDate: '', days: 1 });

  const { realtimeKPI, hourlyTraffic, kpis, isLoading, error, refetch } =
    useOperationsDashboard(PROJECT_ID, dateRange.days);

  const daysLabel = dateRange.days === 1 ? '24h' : `${dateRange.days}일`;

  return (
    <Dashboard isLoading={isLoading} error={error as Error | null} refetch={refetch}>
      <Dashboard.Header
        title="운영 모니터링"
        rightContent={
          <DateRangeFilter
            defaultPreset="day"
            onChange={(range) => setDateRange(range)}
          />
        }
      />

      <Dashboard.Skeleton layout="kpi-chart" />
      <Dashboard.Error />

      <Dashboard.Content>
        {/* KPI Cards */}
        <Dashboard.KPISection columns={4}>
          <KPICard
            title={`총 요청 (${daysLabel})`}
            value={kpis.totalRequests}
            format="number"
            icon={<Activity className="w-5 h-5" />}
            status="neutral"
          />
          <KPICard
            title="에러율"
            value={kpis.errorRate}
            format="percentage"
            icon={<AlertTriangle className="w-5 h-5" />}
            status={kpis.errorRate > 1 ? 'error' : 'success'}
            subtitle="임계값: 1%"
          />
          <KPICard
            title="평균 토큰"
            value={Math.round(kpis.avgTokens)}
            format="number"
            icon={<Zap className="w-5 h-5" />}
            status="neutral"
          />
          <KPICard
            title="활성 테넌트"
            value={kpis.activeTenants}
            format="number"
            icon={<Users className="w-5 h-5" />}
            status="neutral"
          />
        </Dashboard.KPISection>

        {/* Charts */}
        <Suspense fallback={<div className="h-[300px] bg-slate-800/50 rounded-lg animate-pulse" />}>
          <Dashboard.ChartsSection columns={2}>
            <RealtimeTrafficChart
              data={hourlyTraffic}
              title={`시간별 트래픽 (${daysLabel})`}
            />
            <ErrorGauge
              errorRate={realtimeKPI?.error_rate || 0}
              threshold={1}
              title="서비스 가용성"
            />
          </Dashboard.ChartsSection>
        </Suspense>

        {/* System Health */}
        <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">시스템 상태</h3>
          <div className="flex gap-6 items-center text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              BigQuery
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              NestJS API
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              In-Memory Cache
            </div>
          </div>
        </div>
      </Dashboard.Content>
    </Dashboard>
  );
}
