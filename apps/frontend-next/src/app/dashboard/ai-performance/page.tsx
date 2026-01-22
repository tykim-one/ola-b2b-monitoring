'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Brain, Zap, TrendingUp, AlertCircle } from 'lucide-react';
import KPICard from '@/components/kpi/KPICard';
import TokenScatterPlot from '@/components/charts/TokenScatterPlot';
import DateRangeFilter, { type DateRange } from '@/components/ui/DateRangeFilter';

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/projects/ibks/api`;

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
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: '', endDate: '', days: 7 });
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // AbortController를 사용한 요청 취소 관리
  const abortControllerRef = useRef<AbortController | null>(null);

  // 15분마다 자동 새로고침을 위한 트리거
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
        const [efficiencyRes, anomalyRes] = await Promise.all([
          fetch(`${API_BASE}/ai/token-efficiency?days=${dateRange.days}`),
          fetch(`${API_BASE}/ai/anomaly-stats?days=${dateRange.days}`),
        ]);

        if (!efficiencyRes.ok || !anomalyRes.ok) {
          throw new Error('API 요청 실패');
        }

        const efficiencyData = await efficiencyRes.json();
        const anomalyData = await anomalyRes.json();

        // 요청이 취소되지 않았을 때만 상태 업데이트
        if (!controller.signal.aborted) {
          setTokenEfficiency(efficiencyData.data || []);
          setAnomalyStats(anomalyData.data || []);
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

  // 15분마다 자동 새로고침
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey((prev) => prev + 1);
    }, 15 * 60 * 1000);
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

  return (
    <div className="p-8 h-full overflow-y-auto">
      {/* Header - 항상 렌더링하여 DateRangeFilter가 unmount되지 않도록 함 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-white">AI 성능 분석</h2>
          <p className="text-slate-400 text-sm mt-1">
            마지막 갱신: {lastRefresh.toLocaleTimeString('ko-KR')}
          </p>
        </div>
        <DateRangeFilter
          defaultPreset="week"
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
          title={`평균 효율성 비율 (${dateRange.days === 1 ? '24h' : `${dateRange.days}일`})`}
          value={avgEfficiency.toFixed(3)}
          icon={<Brain className="w-5 h-5" />}
          status="neutral"
          subtitle="출력/입력 토큰 비율"
        />
        <KPICard
          title={`평균 토큰/요청 (${dateRange.days === 1 ? '24h' : `${dateRange.days}일`})`}
          value={Math.round(avgTokens)}
          format="number"
          icon={<Zap className="w-5 h-5" />}
          status="neutral"
        />
        <KPICard
          title={`응답 성공률 (${dateRange.days === 1 ? '24h' : `${dateRange.days}일`})`}
          value={successRate}
          format="percentage"
          icon={<TrendingUp className="w-5 h-5" />}
          status={successRate >= 95 ? 'success' : successRate >= 90 ? 'warning' : 'error'}
        />
        <KPICard
          title={`P99 토큰 (${dateRange.days === 1 ? '24h' : `${dateRange.days}일`})`}
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
          title={`토큰 입출력 분포 (${dateRange.days === 1 ? '24h' : `${dateRange.days}일`})`}
        />
      </div>

      {/* Anomaly Stats Table */}
      <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl mb-8">
        <h3 className="text-lg font-semibold text-white mb-4">
          테넌트별 이상 탐지 통계 ({dateRange.days === 1 ? '24h' : `${dateRange.days}일`})
        </h3>
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
        </>
      )}
    </div>
  );
}
