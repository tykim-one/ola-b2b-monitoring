'use client';

import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, Zap, Users } from 'lucide-react';
import KPICard from '@/components/kpi/KPICard';
import RealtimeTrafficChart from '@/components/charts/RealtimeTrafficChart';
import ErrorGauge from '@/components/charts/ErrorGauge';

const API_BASE = 'http://localhost:3000/projects/ibks/bigquery';

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

  const fetchData = async () => {
    try {
      const [kpiRes, hourlyRes] = await Promise.all([
        fetch(`${API_BASE}/metrics/realtime`),
        fetch(`${API_BASE}/metrics/hourly`),
      ]);

      if (!kpiRes.ok || !hourlyRes.ok) {
        throw new Error('API 요청 실패');
      }

      const kpiData = await kpiRes.json();
      const hourlyData = await hourlyRes.json();

      setKpi(kpiData.data);
      setHourlyTraffic(hourlyData.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // 5분마다 자동 새로고침
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
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

  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white">운영 모니터링</h2>
        <div className="text-slate-400 text-sm">
          마지막 갱신: {new Date().toLocaleTimeString('ko-KR')}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="총 요청 (24h)"
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
          title="시간별 트래픽 (24h)"
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
    </div>
  );
}
