'use client';

import React, { useEffect, useState } from 'react';
import { Brain, Zap, TrendingUp, AlertCircle } from 'lucide-react';
import KPICard from '@/components/kpi/KPICard';
import TokenScatterPlot from '@/components/charts/TokenScatterPlot';

const API_BASE = 'http://192.168.1.42:3000/projects/ibks/api';

interface TokenEfficiencyData {
  tenant_id: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  efficiency_ratio: number;
  success: boolean;
  timestamp: string;
}

interface AnomalyStats {
  tenant_id: string;
  avg_tokens: number;
  stddev_tokens: number;
  avg_input_tokens: number;
  stddev_input_tokens: number;
  sample_count: number;
  p99_tokens: number;
}

export default function AIPerformancePage() {
  const [tokenEfficiency, setTokenEfficiency] = useState<TokenEfficiencyData[]>([]);
  const [anomalyStats, setAnomalyStats] = useState<AnomalyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [efficiencyRes, anomalyRes] = await Promise.all([
        fetch(`${API_BASE}/ai/token-efficiency`),
        fetch(`${API_BASE}/ai/anomaly-stats`),
      ]);

      if (!efficiencyRes.ok || !anomalyRes.ok) {
        throw new Error('API 요청 실패');
      }

      const efficiencyData = await efficiencyRes.json();
      const anomalyData = await anomalyRes.json();

      setTokenEfficiency(efficiencyData.data || []);
      setAnomalyStats(anomalyData.data || []);
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
  const avgEfficiency =
    tokenEfficiency.length > 0
      ? tokenEfficiency.reduce((sum, t) => sum + (t.efficiency_ratio || 0), 0) / tokenEfficiency.length
      : 0;

  const avgTokens =
    tokenEfficiency.length > 0
      ? tokenEfficiency.reduce((sum, t) => sum + t.total_tokens, 0) / tokenEfficiency.length
      : 0;

  const successCount = tokenEfficiency.filter((t) => t.success === true).length;
  const successRate = tokenEfficiency.length > 0 ? (successCount / tokenEfficiency.length) * 100 : 0;

  const totalP99 = anomalyStats.reduce((max, s) => Math.max(max, s.p99_tokens || 0), 0);

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
        <h2 className="text-3xl font-bold text-white">AI 성능 분석</h2>
        <div className="text-slate-400 text-sm">
          분석 기간: 최근 7일
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="평균 효율성 비율"
          value={avgEfficiency.toFixed(3)}
          icon={<Brain className="w-5 h-5" />}
          status="neutral"
          subtitle="출력/입력 토큰 비율"
        />
        <KPICard
          title="평균 토큰/요청"
          value={Math.round(avgTokens)}
          format="number"
          icon={<Zap className="w-5 h-5" />}
          status="neutral"
        />
        <KPICard
          title="응답 성공률"
          value={successRate}
          format="percentage"
          icon={<TrendingUp className="w-5 h-5" />}
          status={successRate >= 95 ? 'success' : successRate >= 90 ? 'warning' : 'error'}
        />
        <KPICard
          title="P99 토큰"
          value={totalP99}
          format="tokens"
          icon={<AlertCircle className="w-5 h-5" />}
          status="neutral"
          subtitle="99번째 백분위수"
        />
      </div>

      {/* Token Scatter Plot */}
      <div className="mb-8">
        <TokenScatterPlot
          data={tokenEfficiency}
          title="토큰 입출력 분포"
        />
      </div>

      {/* Anomaly Stats Table */}
      <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl mb-8">
        <h3 className="text-lg font-semibold text-white mb-4">테넌트별 이상 탐지 통계</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-slate-700">
                <th className="text-left py-3 px-4">테넌트</th>
                <th className="text-right py-3 px-4">평균 토큰</th>
                <th className="text-right py-3 px-4">표준편차</th>
                <th className="text-right py-3 px-4">P99 토큰</th>
                <th className="text-right py-3 px-4">샘플 수</th>
                <th className="text-right py-3 px-4">이상 임계값</th>
              </tr>
            </thead>
            <tbody>
              {anomalyStats.map((stat) => {
                const threshold = Math.round(stat.avg_tokens + 3 * stat.stddev_tokens);
                return (
                  <tr
                    key={stat.tenant_id}
                    className="border-b border-slate-700/50 hover:bg-slate-700/30"
                  >
                    <td className="py-3 px-4 text-white font-medium">
                      {stat.tenant_id}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300">
                      {Math.round(stat.avg_tokens).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300">
                      {Math.round(stat.stddev_tokens).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300">
                      {stat.p99_tokens?.toLocaleString() || '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300">
                      {stat.sample_count.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-yellow-400">
                      {threshold.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-xs text-slate-500">
          * 이상 임계값 = 평균 + 3×표준편차 (Z-Score 기반)
        </div>
      </div>

      {/* AI Model Recommendations */}
      <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
        <h3 className="text-lg font-semibold text-white mb-4">AI 모델 추천</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
            <div className="text-blue-400 font-medium mb-2">이상 탐지</div>
            <div className="text-slate-400 text-sm mb-2">
              Z-Score 및 Isolation Forest 알고리즘으로 비정상 토큰 사용 패턴 탐지
            </div>
            <div className="text-slate-500 text-xs">권장: 실시간 모니터링</div>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
            <div className="text-emerald-400 font-medium mb-2">사용량 예측</div>
            <div className="text-slate-400 text-sm mb-2">
              Prophet/ARIMA로 향후 7-30일 토큰 사용량 및 비용 예측
            </div>
            <div className="text-slate-500 text-xs">권장: 용량 계획</div>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
            <div className="text-purple-400 font-medium mb-2">사용자 분류</div>
            <div className="text-slate-400 text-sm mb-2">
              K-Means 클러스터링으로 사용 패턴 기반 사용자 세그먼트 분류
            </div>
            <div className="text-slate-500 text-xs">권장: 맞춤형 서비스</div>
          </div>
        </div>
      </div>
    </div>
  );
}
