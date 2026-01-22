'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Activity, AlertTriangle, Zap, Users } from 'lucide-react';
import KPICard from '@/components/kpi/KPICard';
import RealtimeTrafficChart from '@/components/charts/RealtimeTrafficChart';
import ErrorGauge from '@/components/charts/ErrorGauge';
import DateRangeFilter, { type DateRange } from '@/components/ui/DateRangeFilter';

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/projects/ibks/api`;

interface KPIData {
  total_requests: number;
  success_count: number;
  fail_count: number;
  error_rate: number;
  total_tokens: number;
  avg_tokens: number;
  active_tenants: number;
}

interface HourlyData {
  hour: string;
  request_count: number;
  success_count: number;
  fail_count: number;
  total_tokens: number;
  avg_tokens: number;
}

export default function OperationsPage() {
  const [kpi, setKpi] = useState<KPIData | null>(null);
  const [hourlyTraffic, setHourlyTraffic] = useState<HourlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: '', endDate: '', days: 1 });
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // AbortController를 사용한 요청 취소 관리
  const abortControllerRef = useRef<AbortController | null>(null);

  // 5분마다 자동 새로고침을 위한 트리거
  const [refreshKey, setRefreshKey] = useState(0);

  // 날짜 범위 변경 또는 새로고침 시 데이터 재조회
  useEffect(() => {
    // 이전 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [kpiRes, hourlyRes] = await Promise.all([
          fetch(`${API_BASE}/metrics/realtime?days=${dateRange.days}`),
          fetch(`${API_BASE}/metrics/hourly?days=${dateRange.days}`),
        ]);

        if (!kpiRes.ok || !hourlyRes.ok) {
          throw new Error('API 요청 실패');
        }

        const kpiData = await kpiRes.json();
        const hourlyData = await hourlyRes.json();

        // 요청이 취소되지 않았을 때만 상태 업데이트
        if (!controller.signal.aborted) {
          setKpi(kpiData.data);
          setHourlyTraffic(hourlyData.data || []);
          setError(null);
          setLastRefresh(new Date());
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      controller.abort();
    };
  }, [dateRange.days, refreshKey]);

  // 5분마다 자동 새로고침
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey((prev) => prev + 1);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 h-full overflow-y-auto">
      {/* Header - 항상 렌더링하여 DateRangeFilter가 unmount되지 않도록 함 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-white">운영 모니터링</h2>
          <p className="text-slate-400 text-sm mt-1">
            마지막 갱신: {lastRefresh.toLocaleTimeString('ko-KR')}
          </p>
        </div>
        <DateRangeFilter
          defaultPreset="day"
          onChange={(range) => setDateRange(range)}
        />
      </div>

      {/* 로딩 상태 */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-slate-400">데이터 로딩 중...</div>
        </div>
      )}

      {/* 에러 상태 */}
      {error && !loading && (
        <div className="py-8">
          <div className="bg-rose-900/20 border border-rose-800 rounded-lg p-4 text-rose-400">
            오류: {error}
          </div>
        </div>
      )}

      {/* 정상 콘텐츠 */}
      {!loading && !error && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <KPICard
              title={`총 요청 (${dateRange.days === 1 ? '24h' : `${dateRange.days}일`})`}
              value={kpi?.total_requests || 0}
              format="number"
              icon={<Activity className="w-5 h-5" />}
              status="neutral"
            />
            <KPICard
              title="에러율"
              value={kpi?.error_rate || 0}
              format="percentage"
              icon={<AlertTriangle className="w-5 h-5" />}
              status={kpi && kpi.error_rate > 1 ? 'error' : 'success'}
              subtitle="임계값: 1%"
            />
            <KPICard
              title="평균 토큰"
              value={Math.round(kpi?.avg_tokens || 0)}
              format="number"
              icon={<Zap className="w-5 h-5" />}
              status="neutral"
            />
            <KPICard
              title="활성 테넌트"
              value={kpi?.active_tenants || 0}
              format="number"
              icon={<Users className="w-5 h-5" />}
              status="neutral"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <RealtimeTrafficChart
              data={hourlyTraffic}
              title={`시간별 트래픽 (${dateRange.days === 1 ? '24h' : `${dateRange.days}일`})`}
            />
            <ErrorGauge
              errorRate={kpi?.error_rate || 0}
              threshold={1}
              title="서비스 가용성"
            />
          </div>

          {/* System Health */}
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
            <h3 className="text-lg font-semibold text-white mb-4">시스템 상태</h3>
            <div className="flex gap-6 items-center text-sm text-slate-400">
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
        </>
      )}
    </div>
  );
}
