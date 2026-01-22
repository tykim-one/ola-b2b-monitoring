'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Activity,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  Database,
} from 'lucide-react';
import KPICard from '@/components/kpi/KPICard';
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
import {
  windEtlApi,
  type WindETLRun,
  type WindETLSummary,
  type WindETLTrend,
  type WindETLError,
  type WindETLFileStats,
  type HealthCheckResponse,
} from '@/services/windEtlService';
import DateRangeFilter, { type DateRange } from '@/components/ui/DateRangeFilter';

export default function WindETLMonitoringPage() {
  const [summary, setSummary] = useState<WindETLSummary | null>(null);
  const [recentRuns, setRecentRuns] = useState<WindETLRun[]>([]);
  const [dailyTrend, setDailyTrend] = useState<WindETLTrend[]>([]);
  const [fileStats, setFileStats] = useState<WindETLFileStats[]>([]);
  const [errors, setErrors] = useState<WindETLError[]>([]);
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: '', endDate: '', days: 7 });

  // 중복 호출 방지를 위한 ref
  const prevDaysRef = useRef<number>(0);
  const isFetchingRef = useRef<boolean>(false);
  const initialLoadDone = useRef<boolean>(false);

  const fetchData = useCallback(async () => {
    // 이미 fetch 중이면 스킵
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      setLoading(true);
      const [
        summaryData,
        runsData,
        trendData,
        fileStatsData,
        errorsData,
        healthData,
      ] = await Promise.all([
        windEtlApi.getSummary(dateRange.days),
        windEtlApi.getRecentRuns(10),
        windEtlApi.getDailyTrend(dateRange.days),
        windEtlApi.getFileStats(dateRange.days),
        windEtlApi.getErrorAnalysis(dateRange.days),
        windEtlApi.healthCheck(),
      ]);

      setSummary(summaryData);
      setRecentRuns(runsData);
      setDailyTrend(trendData);
      setFileStats(fileStatsData);
      setErrors(errorsData);
      setHealth(healthData);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [dateRange.days]);

  // 초기 로드 및 날짜 범위 변경 시 데이터 재조회
  useEffect(() => {
    // 초기 로드 또는 days 변경 시
    if (!initialLoadDone.current || dateRange.days !== prevDaysRef.current) {
      initialLoadDone.current = true;
      prevDaysRef.current = dateRange.days;
      fetchData();
    }
  }, [dateRange.days, fetchData]);

  // 5분마다 자동 새로고침
  useEffect(() => {
    const interval = setInterval(() => {
      if (dateRange.days > 0) {
        fetchData();
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [dateRange.days, fetchData]);

  // 초기 로드 중에만 로딩 표시 (summary가 없을 때)
  if (loading && !summary) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-slate-400">데이터 로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-rose-900/20 border border-rose-800 rounded-lg p-4 text-rose-400">
          오류: {error}
        </div>
      </div>
    );
  }

  // 성공률에 따른 상태 계산
  const getSuccessRateStatus = (rate: number): 'success' | 'warning' | 'error' => {
    if (rate >= 95) return 'success';
    if (rate >= 90) return 'warning';
    return 'error';
  };

  // 상태별 색상 매핑
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'bg-emerald-500';
      case 'FAILED':
        return 'bg-rose-500';
      case 'RUNNING':
        return 'bg-amber-500';
      default:
        return 'bg-slate-500';
    }
  };

  // 상태별 배지 색상
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'bg-emerald-900/50 text-emerald-400 border-emerald-700';
      case 'FAILED':
        return 'bg-rose-900/50 text-rose-400 border-rose-700';
      case 'RUNNING':
        return 'bg-amber-900/50 text-amber-400 border-amber-700';
      default:
        return 'bg-slate-900/50 text-slate-400 border-slate-700';
    }
  };

  // 소요시간 포맷 (ms -> 초)
  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    return `${(ms / 1000).toFixed(2)}초`;
  };

  // 날짜 포맷
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-8 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white">Wind ETL 모니터링</h2>
        <div className="text-slate-400 text-sm">
          마지막 갱신: {lastRefresh.toLocaleTimeString('ko-KR')}
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="mb-6">
        <DateRangeFilter
          defaultPreset="week"
          onChange={(range) => setDateRange(range)}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
          value={summary?.avgDurationMs ? (summary.avgDurationMs / 1000).toFixed(2) : 0}
          format="number"
          suffix="초"
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
            summary?.lastRunAt
              ? formatDateTime(summary.lastRunAt)
              : '실행 기록 없음'
          }
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Daily Trend Chart */}
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-4">
            일별 실행 트렌드 ({dateRange.days}일)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis
                dataKey="period"
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8' }}
              />
              <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#f8fafc' }}
                itemStyle={{ color: '#94a3b8' }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="runCount"
                name="실행 수"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="successRate"
                name="성공률 (%)"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* File Processing Stats */}
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-4">
            파일 처리 통계 ({dateRange.days}일)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={fileStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis
                dataKey="date"
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8' }}
              />
              <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#f8fafc' }}
                itemStyle={{ color: '#94a3b8' }}
              />
              <Legend />
              <Bar
                dataKey="totalFilesProcessed"
                name="처리 완료"
                fill="#3b82f6"
              />
              <Bar
                dataKey="totalFilesSkipped"
                name="스킵됨"
                fill="#8b5cf6"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Runs Table */}
      <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl mb-8">
        <h3 className="text-lg font-semibold text-white mb-4">
          최근 실행 기록 (10개)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-700">
                <th className="pb-3 text-slate-400 font-medium">ID</th>
                <th className="pb-3 text-slate-400 font-medium">시작시간</th>
                <th className="pb-3 text-slate-400 font-medium">상태</th>
                <th className="pb-3 text-slate-400 font-medium text-right">
                  파일 (처리/발견)
                </th>
                <th className="pb-3 text-slate-400 font-medium text-right">
                  레코드 (삽입)
                </th>
                <th className="pb-3 text-slate-400 font-medium text-right">
                  에러수
                </th>
                <th className="pb-3 text-slate-400 font-medium text-right">
                  소요시간
                </th>
              </tr>
            </thead>
            <tbody>
              {recentRuns.map((run) => (
                <tr
                  key={run.id}
                  className="border-b border-slate-700/50 hover:bg-slate-700/30"
                >
                  <td className="py-3 text-white">{run.id}</td>
                  <td className="py-3 text-slate-300">
                    {formatDateTime(run.startedAt)}
                  </td>
                  <td className="py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs border ${getStatusBadgeClass(run.status)}`}
                    >
                      {run.status}
                    </span>
                  </td>
                  <td className="py-3 text-slate-300 text-right">
                    {run.filesProcessed}/{run.filesFound}
                  </td>
                  <td className="py-3 text-slate-300 text-right">
                    {run.recordsInserted.toLocaleString()}
                  </td>
                  <td className="py-3 text-right">
                    {run.errorCount > 0 ? (
                      <span className="text-rose-400 font-medium">
                        {run.errorCount}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="py-3 text-slate-300 text-right">
                    {formatDuration(run.durationMs)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Error Analysis Section */}
      {errors.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl mb-8">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <h3 className="text-lg font-semibold text-white">
              에러 분석 ({dateRange.days}일)
            </h3>
          </div>
          <div className="space-y-3">
            {errors.map((error, idx) => (
              <div
                key={idx}
                className="bg-rose-900/10 border border-rose-800/30 rounded-lg p-4"
              >
                <div className="flex justify-between items-start mb-2">
                  <p className="text-rose-300 text-sm font-medium flex-1">
                    {error.errorMessage}
                  </p>
                  <span className="text-rose-400 text-xs font-semibold ml-4">
                    {error.occurrenceCount}회
                  </span>
                </div>
                <div className="flex gap-4 text-xs text-slate-400">
                  <span>최초: {formatDateTime(error.firstSeen)}</span>
                  <span>최근: {formatDateTime(error.lastSeen)}</span>
                  <span>
                    영향받은 실행: {error.affectedRuns.length}개
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Status Footer */}
      <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Database className="w-5 h-5" />
          시스템 상태
        </h3>
        <div className="flex gap-6 items-center text-sm text-slate-400">
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
            <FileText className="w-4 h-4 text-slate-400" />
            <span>
              DataSource: {health?.datasource || 'PostgreSQL'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
