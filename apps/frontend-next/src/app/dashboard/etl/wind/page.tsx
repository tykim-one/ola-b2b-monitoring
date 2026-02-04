'use client';

import { useState } from 'react';
import {
  Activity,
  CheckCircle,
  Clock,
  AlertTriangle,
  Database,
  FileText,
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
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useWindETLDashboard } from '@/hooks/queries/use-etl';
import { Dashboard } from '@/components/compound/Dashboard';
import { DataTable, Column } from '@/components/compound/DataTable';
import KPICard from '@/components/kpi/KPICard';
import { StatusBadge, type BadgeVariant } from '@/components/ui/StatusBadge';
import DateRangeFilter, { type DateRange } from '@/components/ui/DateRangeFilter';
import type { WindETLRun } from '@/services/windEtlService';

// Status variant mapping
const statusVariantMap: Record<string, BadgeVariant> = {
  SUCCESS: 'success',
  FAILED: 'error',
  RUNNING: 'warning',
};

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

// Helper: status color dot
const getStatusColor = (status: string) => {
  switch (status) {
    case 'SUCCESS': return 'bg-emerald-500';
    case 'FAILED': return 'bg-rose-500';
    case 'RUNNING': return 'bg-amber-500';
    default: return 'bg-gray-400';
  }
};

// Recent runs table columns
const runsColumns: Column<WindETLRun>[] = [
  { key: 'id', header: 'ID', sortable: true },
  {
    key: 'startedAt',
    header: '시작시간',
    sortable: true,
    render: (v) => <span className="text-gray-600">{formatDateTime(String(v))}</span>,
  },
  {
    key: 'status',
    header: '상태',
    render: (v) => (
      <StatusBadge variant={statusVariantMap[String(v)] || 'neutral'} label={String(v)} />
    ),
  },
  {
    key: 'filesProcessed',
    header: '파일 (처리/발견)',
    align: 'right',
    render: (_v, row) => (
      <span className="text-gray-600">
        {row.filesProcessed}/{row.filesFound}
      </span>
    ),
  },
  {
    key: 'recordsInserted',
    header: '레코드 (삽입)',
    align: 'right',
    sortable: true,
    render: (v) => Number(v).toLocaleString(),
  },
  {
    key: 'errorCount',
    header: '에러수',
    align: 'right',
    sortable: true,
    render: (v) => {
      const count = Number(v);
      return count > 0
        ? <span className="text-rose-400 font-medium">{count}</span>
        : <span className="text-gray-500">0</span>;
    },
  },
  {
    key: 'durationMs',
    header: '소요시간',
    align: 'right',
    render: (v) => <span className="text-gray-600">{formatDuration(v as number | null)}</span>,
  },
];

export default function WindETLMonitoringPage() {
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: '', endDate: '', days: 7 });

  const {
    summary,
    recentRuns,
    dailyTrend,
    fileStats,
    errors,
    health,
    isLoading,
    error,
    refetch,
  } = useWindETLDashboard(dateRange.days);

  return (
    <Dashboard isLoading={isLoading} error={error} refetch={refetch}>
      <Dashboard.Header
        title="Wind ETL 모니터링"
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
            status={getSuccessRateStatus(summary?.successRate || 0)}
            subtitle={`${summary?.successCount || 0}/${summary?.totalRuns || 0} 성공`}
          />
          <KPICard
            title="평균 소요시간"
            value={summary?.avgDurationMs ? (summary.avgDurationMs / 1000).toFixed(2) + 's' : '0s'}
            format="number"
            icon={<Clock className="w-5 h-5" />}
            status="neutral"
          />
          <KPICard
            title="현재 상태"
            value={summary?.lastRunStatus || 'N/A'}
            format="number"
            icon={
              <span
                className={`w-3 h-3 rounded-full ${getStatusColor(summary?.lastRunStatus || '')} ${summary?.lastRunStatus === 'RUNNING' ? 'animate-pulse' : ''}`}
              />
            }
            status="neutral"
            subtitle={
              summary?.lastRunAt ? formatDateTime(summary.lastRunAt) : '실행 기록 없음'
            }
          />
        </Dashboard.KPISection>

        {/* Charts */}
        <Dashboard.ChartsSection columns={2}>
          <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              일별 실행 트렌드 ({dateRange.days}일)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="period" stroke="#9ca3af" tick={{ fill: '#6b7280' }} />
                <YAxis stroke="#9ca3af" tick={{ fill: '#6b7280' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#111827' }}
                  itemStyle={{ color: '#6b7280' }}
                />
                <Legend />
                <Area type="monotone" dataKey="runCount" name="실행 수" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                <Area type="monotone" dataKey="successRate" name="성공률 (%)" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              파일 처리 통계 ({dateRange.days}일)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={fileStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#9ca3af" tick={{ fill: '#6b7280' }} />
                <YAxis stroke="#9ca3af" tick={{ fill: '#6b7280' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#111827' }}
                  itemStyle={{ color: '#6b7280' }}
                />
                <Legend />
                <Bar dataKey="totalFilesProcessed" name="처리 완료" fill="#3b82f6" />
                <Bar dataKey="totalFilesSkipped" name="스킵됨" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Dashboard.ChartsSection>

        {/* Recent Runs Table */}
        <Dashboard.TableSection title="최근 실행 기록 (10개)">
          <DataTable<WindETLRun>
            data={recentRuns}
            columns={runsColumns}
            variant="card"
            rowKey="id"
          >
            <DataTable.Content>
              <DataTable.Header />
              <DataTable.Body emptyMessage="실행 기록이 없습니다" />
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
            <div className="space-y-3">
              {errors.map((err, idx) => (
                <div key={idx} className="bg-rose-50 border border-rose-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-rose-300 text-sm font-medium flex-1">
                      {err.errorMessage}
                    </p>
                    <span className="text-rose-400 text-xs font-semibold ml-4">
                      {err.occurrenceCount}회
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>최초: {formatDateTime(err.firstSeen)}</span>
                    <span>최근: {formatDateTime(err.lastSeen)}</span>
                    <span>영향받은 실행: {err.affectedRuns.length}개</span>
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
                className={`w-3 h-3 rounded-full ${health?.healthy ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}
              />
              PostgreSQL ({health?.table || 'wind_etl_runs'})
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              NestJS API
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <span>DataSource: {health?.datasource || 'PostgreSQL'}</span>
            </div>
          </div>
        </div>
      </Dashboard.Content>
    </Dashboard>
  );
}
