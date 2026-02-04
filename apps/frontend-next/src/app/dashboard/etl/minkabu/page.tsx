'use client';

import { useState } from 'react';
import {
  Activity,
  CheckCircle,
  Newspaper,
  AlertTriangle,
  Database,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { useMinkabuETLDashboard } from '@/hooks/queries/use-etl';
import { Dashboard } from '@/components/compound/Dashboard';
import { Chart } from '@/components/compound/Chart';
import { DataTable, Column } from '@/components/compound/DataTable';
import KPICard from '@/components/kpi/KPICard';
import { StatusBadge, type BadgeVariant } from '@/components/ui/StatusBadge';
import DateRangeFilter, { type DateRange } from '@/components/ui/DateRangeFilter';
import { CHART_COLORS, TOOLTIP_STYLE } from '@/components/charts/chart-theme';
import type { MinkabuETLRun } from '@/services/minkabuEtlService';

// Status variant mapping
const statusVariantMap: Record<string, BadgeVariant> = {
  SUCCESS: 'success',
  FAILED: 'error',
  RUNNING: 'warning',
};

// Helper: format duration
const formatDuration = (ms: number | null) => {
  if (!ms) return '-';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes > 0) return `${minutes}분 ${seconds % 60}초`;
  return `${seconds}초`;
};

// Helper: format date
const formatDate = (date: string) =>
  new Date(date).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

// Helper: status dot
const getStatusDot = (status: string | null) => {
  const colors: Record<string, string> = {
    SUCCESS: 'bg-emerald-500',
    FAILED: 'bg-rose-500',
    RUNNING: 'bg-amber-500',
  };
  return (
    <span
      className={`w-3 h-3 rounded-full ${colors[status || ''] || 'bg-gray-400'} animate-pulse`}
    />
  );
};

// Recent runs table columns
const runsColumns: Column<MinkabuETLRun>[] = [
  { key: 'id', header: 'ID', sortable: true },
  {
    key: 'startedAt',
    header: '시작 시간',
    sortable: true,
    render: (v) => formatDate(String(v)),
  },
  {
    key: 'status',
    header: '상태',
    render: (v) => (
      <StatusBadge variant={statusVariantMap[String(v)] || 'neutral'} label={String(v)} />
    ),
  },
  {
    key: 'todayHeadlines',
    header: '헤드라인 (오늘/어제)',
    render: (_v, row) => `${row.todayHeadlines} / ${row.yesterdayHeadlines}`,
  },
  {
    key: 'articlesFetched',
    header: '기사 수집',
    sortable: true,
    render: (v) => String(v),
  },
  {
    key: 'indexCount',
    header: '인덱스',
    render: (v) => String(v),
  },
  {
    key: 'errorCount',
    header: '에러 수',
    align: 'right',
    sortable: true,
    render: (v) => {
      const count = Number(v);
      return count > 0
        ? <span className="text-rose-400 font-semibold">{count}</span>
        : <span>{count}</span>;
    },
  },
  {
    key: 'durationMs',
    header: '소요 시간',
    align: 'right',
    render: (v) => formatDuration(v as number | null),
  },
];

export default function MinkabuETLPage() {
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: '', endDate: '', days: 7 });

  const {
    summary,
    recentRuns,
    dailyTrend,
    headlineStats,
    errors,
    health,
    isLoading,
    error,
    refetch,
  } = useMinkabuETLDashboard(dateRange.days);

  return (
    <Dashboard isLoading={isLoading} error={error} refetch={refetch}>
      <Dashboard.Header
        title="Minkabu ETL 모니터링"
        rightContent={
          <DateRangeFilter defaultPreset="week" onChange={(range) => setDateRange(range)} />
        }
      />

      <Dashboard.Skeleton layout="kpi-chart" />
      <Dashboard.Error />

      <Dashboard.Content>
        {/* KPI Cards */}
        <Dashboard.KPISection columns={4}>
          <KPICard
            title={`총 실행 (${dateRange.days}일)`}
            value={summary?.totalRuns || 0}
            format="number"
            icon={<Activity className="w-5 h-5" />}
            status="neutral"
          />
          <KPICard
            title="성공률"
            value={summary?.successRate || 0}
            format="percentage"
            icon={<CheckCircle className="w-5 h-5" />}
            status={
              summary && summary.successRate >= 95
                ? 'success'
                : summary && summary.successRate < 90
                ? 'error'
                : 'warning'
            }
            subtitle={`성공: ${summary?.successCount || 0} / 실패: ${summary?.failureCount || 0}`}
          />
          <KPICard
            title="평균 기사 수집"
            value={Math.round(summary?.avgArticlesFetched || 0)}
            format="number"
            icon={<Newspaper className="w-5 h-5" />}
            status="neutral"
          />
          <KPICard
            title="현재 상태"
            value={summary?.lastRunStatus || '-'}
            format="number"
            icon={getStatusDot(summary?.lastRunStatus || null)}
            status={
              summary?.lastRunStatus === 'SUCCESS'
                ? 'success'
                : summary?.lastRunStatus === 'FAILED'
                ? 'error'
                : 'warning'
            }
            subtitle={
              summary?.lastRunAt
                ? `마지막 실행: ${formatDate(summary.lastRunAt)}`
                : undefined
            }
          />
        </Dashboard.KPISection>

        {/* Charts */}
        <Dashboard.ChartsSection columns={2}>
          <Chart title={`일별 실행 트렌드 (${dateRange.days}일)`} height={300}>
            <AreaChart data={dailyTrend}>
              <defs>
                <linearGradient id="colorRunCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorSuccessRate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="period" stroke={CHART_COLORS.axis} tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" stroke={CHART_COLORS.axis} tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" stroke={CHART_COLORS.axis} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="runCount"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorRunCount)"
                name="실행 횟수"
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="successRate"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorSuccessRate)"
                name="성공률 (%)"
              />
            </AreaChart>
          </Chart>

          <Chart title={`헤드라인 수집 통계 (${dateRange.days}일)`} height={300}>
            <BarChart data={headlineStats}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="date" stroke={CHART_COLORS.axis} tick={{ fontSize: 12 }} />
              <YAxis stroke={CHART_COLORS.axis} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="totalTodayHeadlines" fill="#8b5cf6" name="오늘 헤드라인" radius={[4, 4, 0, 0]} />
              <Bar dataKey="totalArticlesFetched" fill="#3b82f6" name="기사 수집" radius={[4, 4, 0, 0]} />
            </BarChart>
          </Chart>
        </Dashboard.ChartsSection>

        {/* Recent Runs Table */}
        <Dashboard.TableSection title="최근 실행 내역 (최대 10개)">
          <DataTable<MinkabuETLRun>
            data={recentRuns}
            columns={runsColumns}
            variant="card"
            rowKey="id"
          >
            <DataTable.Content>
              <DataTable.Header />
              <DataTable.Body emptyMessage="실행 내역이 없습니다." />
            </DataTable.Content>
          </DataTable>
        </Dashboard.TableSection>

        {/* Error Analysis Section */}
        {errors.length > 0 && (
          <div className="bg-white border border-gray-200 p-6 rounded-xl mt-8">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <h3 className="text-lg font-semibold text-gray-900">
                에러 분석 ({dateRange.days}일)
              </h3>
            </div>
            <div className="space-y-4">
              {errors.map((err, index) => (
                <div key={index} className="bg-rose-50 border border-rose-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-rose-300 font-medium">{err.errorMessage}</p>
                    <span className="bg-rose-50 text-rose-300 text-xs px-2 py-1 rounded">
                      {err.occurrenceCount}회 발생
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>첫 발생: {new Date(err.firstSeen).toLocaleString('ko-KR')}</div>
                    <div>마지막 발생: {new Date(err.lastSeen).toLocaleString('ko-KR')}</div>
                    <div>영향받은 실행: {err.affectedRuns.join(', ')}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* System Status Footer */}
        <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Database className="w-5 h-5" />
            시스템 상태
          </h3>
          <div className="flex gap-6 items-center text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${health?.healthy ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`}
              />
              PostgreSQL ({health?.datasource || 'Unknown'})
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              NestJS API
            </div>
            <div className="text-gray-400">
              테이블: {health?.table || 'minkabu_etl_runs'}
            </div>
          </div>
        </div>
      </Dashboard.Content>
    </Dashboard>
  );
}
