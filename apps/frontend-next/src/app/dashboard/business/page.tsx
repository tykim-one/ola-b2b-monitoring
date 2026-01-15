'use client';

import React, { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Users, BarChart3 } from 'lucide-react';
import KPICard from '@/components/kpi/KPICard';
import TenantPieChart from '@/components/charts/TenantPieChart';
import CostTrendChart from '@/components/charts/CostTrendChart';
import UsageHeatmap from '@/components/charts/UsageHeatmap';

const API_BASE = 'http://localhost:3000/projects/ibks/bigquery';

interface TenantData {
  tenant_id: string;
  request_count: number;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  avg_tokens: number;
  fail_count: number;
  error_rate: number;
}

interface CostData {
  date: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  input_cost: number;
  output_cost: number;
  total_cost: number;
}

interface HeatmapData {
  day_of_week: number;
  hour: number;
  request_count: number;
  avg_tokens: number;
}

export default function BusinessPage() {
  const [tenantUsage, setTenantUsage] = useState<TenantData[]>([]);
  const [costTrend, setCostTrend] = useState<CostData[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [tenantRes, costRes, heatmapRes] = await Promise.all([
        fetch(`${API_BASE}/analytics/tenant-usage?days=30`),
        fetch(`${API_BASE}/analytics/cost-trend`),
        fetch(`${API_BASE}/analytics/heatmap`),
      ]);

      if (!tenantRes.ok || !costRes.ok || !heatmapRes.ok) {
        throw new Error('API 요청 실패');
      }

      const tenantData = await tenantRes.json();
      const costData = await costRes.json();
      const heatmapData = await heatmapRes.json();

      setTenantUsage(tenantData.data || []);
      setCostTrend(costData.data || []);
      setHeatmap(heatmapData.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // 집계 계산
  const totalTokens = tenantUsage.reduce((sum, t) => sum + t.total_tokens, 0);
  const totalRequests = tenantUsage.reduce((sum, t) => sum + t.request_count, 0);
  const totalCost = costTrend.reduce((sum, c) => sum + c.total_cost, 0);
  const tenantCount = tenantUsage.length;

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
        <h2 className="text-3xl font-bold text-white">비즈니스 분석</h2>
        <div className="text-slate-400 text-sm">
          기간: 최근 30일
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="총 토큰 사용량"
          value={totalTokens}
          format="tokens"
          icon={<BarChart3 className="w-5 h-5" />}
          status="neutral"
        />
        <KPICard
          title="예상 비용"
          value={totalCost}
          format="currency"
          icon={<DollarSign className="w-5 h-5" />}
          status="neutral"
        />
        <KPICard
          title="총 요청 수"
          value={totalRequests}
          format="number"
          icon={<TrendingUp className="w-5 h-5" />}
          status="neutral"
        />
        <KPICard
          title="활성 테넌트"
          value={tenantCount}
          format="number"
          icon={<Users className="w-5 h-5" />}
          status="neutral"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <TenantPieChart
          data={tenantUsage}
          title="테넌트별 토큰 사용량"
          dataKey="total_tokens"
        />
        <CostTrendChart
          data={costTrend}
          title="일별 비용 트렌드"
        />
      </div>

      {/* Heatmap */}
      <div className="mb-8">
        <UsageHeatmap
          data={heatmap}
          title="시간대별 사용량 히트맵 (최근 30일)"
        />
      </div>

      {/* Tenant Table */}
      <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
        <h3 className="text-lg font-semibold text-white mb-4">테넌트별 상세 현황</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-slate-700">
                <th className="text-left py-3 px-4">테넌트</th>
                <th className="text-right py-3 px-4">요청 수</th>
                <th className="text-right py-3 px-4">총 토큰</th>
                <th className="text-right py-3 px-4">평균 토큰</th>
                <th className="text-right py-3 px-4">에러율</th>
              </tr>
            </thead>
            <tbody>
              {tenantUsage.map((tenant) => (
                <tr
                  key={tenant.tenant_id}
                  className="border-b border-slate-700/50 hover:bg-slate-700/30"
                >
                  <td className="py-3 px-4 text-white font-medium">
                    {tenant.tenant_id}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-300">
                    {tenant.request_count.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-300">
                    {tenant.total_tokens.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-300">
                    {Math.round(tenant.avg_tokens).toLocaleString()}
                  </td>
                  <td className={`py-3 px-4 text-right ${
                    tenant.error_rate > 1 ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {tenant.error_rate.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
