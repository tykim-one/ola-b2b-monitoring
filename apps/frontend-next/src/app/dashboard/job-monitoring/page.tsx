'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from '@/lib/recharts';
import { useJobMonitoringDashboard } from '@/hooks/queries/use-job-monitoring';
import { Dashboard } from '@/components/compound/Dashboard';
import { Chart } from '@/components/compound/Chart';
import { DataTable, Column } from '@/components/compound/DataTable';
import KPICard from '@/components/kpi/KPICard';
import DateRangeFilter, { type DateRange } from '@/components/ui/DateRangeFilter';
import type { JobExecutionLog, JobConfigSummary } from '@/services/jobMonitoringService';

// Helper: format duration (ms -> seconds)
const formatDuration = (ms: number | null) => {
  if (!ms) return '-';
  return `${(ms / 1000).toFixed(2)}s`;
};

// Helper: format date
const formatDateTime = (dateString: string) =>
  new Date(dateString).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

// Helper: success rate status
const getSuccessRateStatus = (rate: number): 'success' | 'warning' | 'error' => {
  if (rate >= 95) return 'success';
  if (rate >= 90) return 'warning';
  return 'error';
};

// Custom Tooltip for Config BarChart
function ConfigTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ payload: JobConfigSummary }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-md text-sm">
      <p className="font-semibold text-gray-900 mb-2">{label}</p>
      <div className="space-y-1">
        <p className="text-gray-600">총 실행: <span className="font-medium text-gray-900">{data.totalRuns}회</span></p>
        <p className="text-emerald-600">성공: <span className="font-medium">{data.successCount}회</span></p>
        <p className="text-rose-500">실패: <span className="font-medium">{data.failureCount}회</span></p>
        <p className="text-gray-600">성공률: <span className="font-medium text-gray-900">{data.successRate}%</span></p>
        <p className="text-gray-600">평균 소요: <span className="font-medium text-gray-900">{formatDuration(data.avgDurationMs)}</span></p>
      </div>
    </div>
  );
}

// Log table columns
const logColumns: Column<JobExecutionLog>[] = [
  { key: 'insertId', header: 'ID' },
  { key: 'configName', header: 'Config', sortable: true },
  {
    key: 'durationMs',
    header: '소요시간',
    align: 'right',
    sortable: true,
    render: (v) => <span className="text-gray-600">{formatDuration(v as number | null)}</span>,
  },
  {
    key: 'fetched',
    header: 'Fetched',
    align: 'right',
    render: (v) => <span className="text-gray-600">{v != null ? Number(v).toLocaleString() : '-'}</span>,
  },
  {
    key: 'failed',
    header: 'Failed',
    align: 'right',
    render: (v) => {
      const num = Number(v);
      return num > 0
        ? <span className="text-rose-500 font-medium">{num.toLocaleString()}</span>
        : <span className="text-gray-500">{v != null ? '0' : '-'}</span>;
    },
  },
  {
    key: 'processed',
    header: 'Processed',
    align: 'right',
    render: (v) => <span className="text-gray-600">{v != null ? Number(v).toLocaleString() : '-'}</span>,
  },
  {
    key: 'saved',
    header: 'Saved',
    align: 'right',
    render: (v) => <span className="text-gray-600">{v != null ? Number(v).toLocaleString() : '-'}</span>,
  },
  {
    key: 'successRate',
    header: '성공률',
    align: 'right',
    sortable: true,
    render: (v) => {
      const rate = Number(v);
      if (isNaN(rate)) return <span className="text-gray-500">-</span>;
      const color = rate === 100 ? 'text-emerald-500' : rate >= 90 ? 'text-yellow-500' : 'text-rose-500';
      return <span className={`font-medium ${color}`}>{rate.toFixed(1)}%</span>;
    },
  },
  { key: 'step', header: 'Step' },
  {
    key: 'message',
    header: 'Message',
    className: 'max-w-[200px] truncate',
    render: (v) => <span className="text-gray-600" title={String(v ?? '')}>{String(v ?? '-')}</span>,
  },
  {
    key: 'appTimestamp',
    header: '실행시간',
    sortable: true,
    render: (v) => <span className="text-gray-600">{formatDateTime(String(v))}</span>,
  },
  {
    key: 'logTimestamp',
    header: '로그시간',
    render: (v) => <span className="text-gray-600">{formatDateTime(String(v))}</span>,
  },
];

export default function JobMonitoringPage() {
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: '', endDate: '', days: 7 });

  const {
    summary,
    logs,
    configSummary,
    health,
    isLoading,
    error,
    refetch,
  } = useJobMonitoringDashboard(dateRange.days);

  return (
    <Dashboard isLoading={isLoading} error={error} refetch={refetch}>
      <Dashboard.Header
        title="Job 모니터링"
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
            title={`총 Job 수 (${dateRange.days}일)`}
            value={summary?.totalJobs || 0}
            format="number"
            status="neutral"
          />
          <KPICard
            title="전체 성공률"
            value={summary?.overallSuccessRate || 0}
            format="percentage"
            status={getSuccessRateStatus(summary?.overallSuccessRate || 0)}
            subtitle={`${summary?.successCount || 0}/${summary?.totalJobs || 0} 성공`}
          />
          <KPICard
            title="평균 소요시간"
            value={summary?.avgDurationMs ? (summary.avgDurationMs / 1000).toFixed(2) + 's' : '0s'}
            format="number"
            status="neutral"
          />
          <KPICard
            title="활성 Config 수"
            value={summary?.uniqueConfigs || 0}
            format="number"
            status="neutral"
            subtitle={summary?.lastRunAt ? `마지막: ${formatDateTime(summary.lastRunAt)}` : '실행 기록 없음'}
          />
        </Dashboard.KPISection>

        {/* Config Summary BarChart */}
        <Dashboard.ChartsSection columns={1}>
          <Chart title={`Config별 성공/실패 현황 (${dateRange.days}일)`} height={300}>
            <BarChart data={configSummary}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="configName" stroke="#9ca3af" tick={{ fill: '#6b7280' }} />
              <YAxis stroke="#9ca3af" tick={{ fill: '#6b7280' }} />
              <Tooltip content={<ConfigTooltip />} />
              <Legend />
              <Bar dataKey="successCount" name="성공" fill="#10b981" stackId="a" />
              <Bar dataKey="failureCount" name="실패" fill="#ef4444" stackId="a" />
            </BarChart>
          </Chart>
        </Dashboard.ChartsSection>

        {/* Logs DataTable */}
        <Dashboard.TableSection title="Job 실행 로그">
          <DataTable<JobExecutionLog>
            data={logs}
            columns={logColumns}
            variant="card"
            rowKey="insertId"
          >
            <DataTable.Content>
              <DataTable.Header />
              <DataTable.Body emptyMessage="실행 로그가 없습니다" />
            </DataTable.Content>
            <DataTable.Pagination pageSize={20} />
          </DataTable>
        </Dashboard.TableSection>

        {/* System Status Footer */}
        <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">시스템 상태</h3>
          <div className="flex gap-6 items-center text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${health?.healthy ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}
              />
              BigQuery ({health?.view || 'v_job_execution_logs'})
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              NestJS API
            </div>
            <div>
              DataSource: {health?.datasource || 'BigQuery'}
            </div>
          </div>
        </div>
      </Dashboard.Content>
    </Dashboard>
  );
}
