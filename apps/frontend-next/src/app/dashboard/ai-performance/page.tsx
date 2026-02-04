'use client';

import { useState } from 'react';
import { Brain, Zap, TrendingUp, AlertCircle } from 'lucide-react';
import { useAIPerformanceDashboard } from '@/hooks/queries/use-dashboard';
import { Dashboard } from '@/components/compound/Dashboard';
import { DataTable, type Column } from '@/components/compound/DataTable';
import KPICard from '@/components/kpi/KPICard';
import TokenScatterPlot from '@/components/charts/TokenScatterPlot';
import DateRangeFilter, { type DateRange } from '@/components/ui/DateRangeFilter';
import type { AnomalyStats } from '@ola/shared-types';

const PROJECT_ID = 'ibks';

// Anomaly stats table column definitions
const anomalyColumns: Column<AnomalyStats>[] = [
  {
    key: 'tenant_id',
    header: '테넌트',
    sortable: true,
    render: (value) => (
      <span className="text-gray-900 font-medium">{String(value)}</span>
    ),
  },
  {
    key: 'avg_tokens',
    header: '평균 토큰',
    sortable: true,
    align: 'right',
    render: (value) => Math.round(Number(value)).toLocaleString(),
  },
  {
    key: 'stddev_tokens',
    header: '표준편차',
    sortable: true,
    align: 'right',
    render: (value) => Math.round(Number(value)).toLocaleString(),
  },
  {
    key: 'p99_tokens',
    header: 'P99 토큰',
    sortable: true,
    align: 'right',
    render: (value) => (value != null ? Number(value).toLocaleString() : '-'),
  },
  {
    key: 'sample_count',
    header: '샘플 수',
    sortable: true,
    align: 'right',
    render: (value) => Number(value).toLocaleString(),
  },
  {
    key: 'threshold',
    header: '이상 임계값',
    align: 'right',
    className: 'text-yellow-400',
    render: (_value, row) => {
      const threshold = Math.round(row.avg_tokens + 3 * row.stddev_tokens);
      return threshold.toLocaleString();
    },
  },
];

export default function AIPerformancePage() {
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: '', endDate: '', days: 7 });

  const { anomalyStats, tokenEfficiency, kpis, isLoading, error, refetch } =
    useAIPerformanceDashboard(PROJECT_ID, dateRange.days);

  const daysLabel = dateRange.days === 1 ? '24h' : `${dateRange.days}일`;

  return (
    <Dashboard isLoading={isLoading} error={error as Error | null} refetch={refetch}>
      <Dashboard.Header
        title="AI 성능 분석"
        rightContent={
          <DateRangeFilter
            defaultPreset="week"
            onChange={(range) => setDateRange(range)}
          />
        }
      />

      <Dashboard.Skeleton layout="kpi-chart" />
      <Dashboard.Error />

      <Dashboard.Content>
        {/* KPI Cards */}
        <Dashboard.KPISection columns={4}>
          <KPICard
            title={`평균 효율성 비율 (${daysLabel})`}
            value={kpis.avgEfficiency.toFixed(3)}
            icon={<Brain className="w-5 h-5" />}
            status="neutral"
            subtitle="출력/입력 토큰 비율"
          />
          <KPICard
            title={`평균 토큰/요청 (${daysLabel})`}
            value={Math.round(kpis.avgTokens)}
            format="number"
            icon={<Zap className="w-5 h-5" />}
            status="neutral"
          />
          <KPICard
            title={`응답 성공률 (${daysLabel})`}
            value={kpis.successRate}
            format="percentage"
            icon={<TrendingUp className="w-5 h-5" />}
            status={kpis.successRate >= 95 ? 'success' : kpis.successRate >= 90 ? 'warning' : 'error'}
          />
          <KPICard
            title={`P99 토큰 (${daysLabel})`}
            value={kpis.totalP99}
            format="tokens"
            icon={<AlertCircle className="w-5 h-5" />}
            status="neutral"
            subtitle="99번째 백분위수"
          />
        </Dashboard.KPISection>

        {/* Token Scatter Plot */}
        <div className="mb-8">
          <TokenScatterPlot
            data={tokenEfficiency}
            title={`토큰 입출력 분포 (${daysLabel})`}
          />
        </div>

        {/* Anomaly Stats Table */}
        <Dashboard.Section title={`테넌트별 이상 탐지 통계 (${daysLabel})`}>
          <DataTable data={anomalyStats} columns={anomalyColumns} variant="card" rowKey="tenant_id">
            <DataTable.Content>
              <DataTable.Header />
              <DataTable.Body emptyMessage="이상 탐지 데이터가 없습니다" />
            </DataTable.Content>
          </DataTable>
          <div className="mt-4 text-xs text-gray-400">
            * 이상 임계값 = 평균 + 3x표준편차 (Z-Score 기반)
          </div>
        </Dashboard.Section>

        {/* AI Model Recommendations */}
        <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">AI 모델 추천</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="text-blue-400 font-medium mb-2">이상 탐지</div>
              <div className="text-gray-500 text-sm mb-2">
                Z-Score 및 Isolation Forest 알고리즘으로 비정상 토큰 사용 패턴 탐지
              </div>
              <div className="text-gray-400 text-xs">권장: 실시간 모니터링</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="text-emerald-400 font-medium mb-2">사용량 예측</div>
              <div className="text-gray-500 text-sm mb-2">
                Prophet/ARIMA로 향후 7-30일 토큰 사용량 및 비용 예측
              </div>
              <div className="text-gray-400 text-xs">권장: 용량 계획</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="text-purple-400 font-medium mb-2">사용자 분류</div>
              <div className="text-gray-500 text-sm mb-2">
                K-Means 클러스터링으로 사용 패턴 기반 사용자 세그먼트 분류
              </div>
              <div className="text-gray-400 text-xs">권장: 맞춤형 서비스</div>
            </div>
          </div>
        </div>
      </Dashboard.Content>
    </Dashboard>
  );
}
