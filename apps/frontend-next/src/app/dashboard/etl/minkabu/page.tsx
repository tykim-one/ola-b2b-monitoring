'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Activity,
  CheckCircle,
  Clock,
  AlertTriangle,
  Newspaper,
  Database,
} from 'lucide-react';
import KPICard from '@/components/kpi/KPICard';
import DateRangeFilter, { type DateRange } from '@/components/ui/DateRangeFilter';
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
} from 'recharts';
import {
  minkabuEtlApi,
  MinkabuETLRun,
  MinkabuETLSummary,
  MinkabuETLTrend,
  MinkabuETLError,
  MinkabuETLHeadlineStats,
  HealthCheckResponse,
} from '@/services/minkabuEtlService';

export default function MinkabuETLPage() {
  const [summary, setSummary] = useState<MinkabuETLSummary | null>(null);
  const [recentRuns, setRecentRuns] = useState<MinkabuETLRun[]>([]);
  const [dailyTrend, setDailyTrend] = useState<MinkabuETLTrend[]>([]);
  const [headlineStats, setHeadlineStats] = useState<MinkabuETLHeadlineStats[]>([]);
  const [errors, setErrors] = useState<MinkabuETLError[]>([]);
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
        headlineData,
        errorsData,
        healthData,
      ] = await Promise.all([
        minkabuEtlApi.getSummary(dateRange.days),
        minkabuEtlApi.getRecentRuns(10),
        minkabuEtlApi.getDailyTrend(dateRange.days),
        minkabuEtlApi.getHeadlineStats(dateRange.days),
        minkabuEtlApi.getErrorAnalysis(dateRange.days),
        minkabuEtlApi.healthCheck(),
      ]);

      setSummary(summaryData);
      setRecentRuns(runsData);
      setDailyTrend(trendData);
      setHeadlineStats(headlineData);
      setErrors(errorsData);
      setHealth(healthData);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
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

  // Helper function to format status badge
  const getStatusBadge = (status: string) => {
    const colors = {
      SUCCESS: 'bg-emerald-900/30 text-emerald-400 border-emerald-700',
      FAILED: 'bg-rose-900/30 text-rose-400 border-rose-700',
      RUNNING: 'bg-amber-900/30 text-amber-400 border-amber-700',
    };
    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded border ${
          colors[status as keyof typeof colors] || 'bg-slate-700 text-slate-400'
        }`}
      >
        {status}
      </span>
    );
  };

  // Helper function to get status indicator dot
  const getStatusDot = (status: string | null) => {
    const colors = {
      SUCCESS: 'bg-emerald-500',
      FAILED: 'bg-rose-500',
      RUNNING: 'bg-amber-500',
    };
    return (
      <span
        className={`w-3 h-3 rounded-full ${
          colors[status as keyof typeof colors] || 'bg-slate-500'
        } animate-pulse`}
      />
    );
  };

  // Helper function to format duration
  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}분 ${seconds % 60}초`;
    }
    return `${seconds}초`;
  };

  // Helper function to format date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('ko-KR', {
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
        <h2 className="text-3xl font-bold text-white">Minkabu ETL 모니터링</h2>
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
          status={
            summary && summary.successRate >= 95
              ? 'success'
              : summary && summary.successRate < 90
              ? 'error'
              : 'warning'
          }
          subtitle={`성공: ${summary?.successCount || 0} / 실패: ${
            summary?.failureCount || 0
          }`}
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
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="period"
                stroke="#94a3b8"
                tick={{ fontSize: 12 }}
              />
              <YAxis yAxisId="left" stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#94a3b8"
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#f1f5f9' }}
              />
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
          </ResponsiveContainer>
        </div>

        {/* Headline Collection Stats */}
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-4">
            헤드라인 수집 통계 ({dateRange.days}일)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={headlineStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="date"
                stroke="#94a3b8"
                tick={{ fontSize: 12 }}
              />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#f1f5f9' }}
              />
              <Bar
                dataKey="totalTodayHeadlines"
                fill="#8b5cf6"
                name="오늘 헤드라인"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="totalArticlesFetched"
                fill="#3b82f6"
                name="기사 수집"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Runs Table */}
      <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl mb-8">
        <h3 className="text-lg font-semibold text-white mb-4">
          최근 실행 내역 (최대 10개)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase border-b border-slate-700">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">시작 시간</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">헤드라인 (오늘/어제)</th>
                <th className="px-4 py-3">기사 수집</th>
                <th className="px-4 py-3">인덱스</th>
                <th className="px-4 py-3">에러 수</th>
                <th className="px-4 py-3">소요 시간</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {recentRuns.map((run) => (
                <tr key={run.id} className="text-slate-300 hover:bg-slate-700/50">
                  <td className="px-4 py-3 font-medium">{run.id}</td>
                  <td className="px-4 py-3">{formatDate(run.startedAt)}</td>
                  <td className="px-4 py-3">{getStatusBadge(run.status)}</td>
                  <td className="px-4 py-3">
                    {run.todayHeadlines} / {run.yesterdayHeadlines}
                  </td>
                  <td className="px-4 py-3">{run.articlesFetched}</td>
                  <td className="px-4 py-3">{run.indexCount}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        run.errorCount > 0 ? 'text-rose-400 font-semibold' : ''
                      }
                    >
                      {run.errorCount}
                    </span>
                  </td>
                  <td className="px-4 py-3">{formatDuration(run.durationMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentRuns.length === 0 && (
            <div className="text-center text-slate-400 py-8">
              실행 내역이 없습니다.
            </div>
          )}
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
          <div className="space-y-4">
            {errors.map((error, index) => (
              <div
                key={index}
                className="bg-rose-900/10 border border-rose-800/50 rounded-lg p-4"
              >
                <div className="flex justify-between items-start mb-2">
                  <p className="text-rose-300 font-medium">
                    {error.errorMessage}
                  </p>
                  <span className="bg-rose-900/50 text-rose-300 text-xs px-2 py-1 rounded">
                    {error.occurrenceCount}회 발생
                  </span>
                </div>
                <div className="text-xs text-slate-400 space-y-1">
                  <div>
                    첫 발생: {new Date(error.firstSeen).toLocaleString('ko-KR')}
                  </div>
                  <div>
                    마지막 발생:{' '}
                    {new Date(error.lastSeen).toLocaleString('ko-KR')}
                  </div>
                  <div>영향받은 실행: {error.affectedRuns.join(', ')}</div>
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
              className={`w-3 h-3 rounded-full ${
                health?.healthy ? 'bg-emerald-500' : 'bg-rose-500'
              } animate-pulse`}
            />
            PostgreSQL ({health?.datasource || 'Unknown'})
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            NestJS API
          </div>
          <div className="text-slate-500">
            테이블: {health?.table || 'minkabu_etl_runs'}
          </div>
        </div>
      </div>
    </div>
  );
}
