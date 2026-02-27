'use client';

import { useState } from 'react';
import { RefreshCw, Timer, Database } from 'lucide-react';
import { useServiceContext } from '@/hooks/useServiceContext';
import {
  useHanaMtsBatchSummary,
  useHanaMtsBatchRuns,
  useHanaMtsBatchTrend,
} from '@/hooks/queries/use-hana-mts';
import { Dashboard } from '@/components/compound/Dashboard';
import KPICard from '@/components/kpi/KPICard';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function ServiceBatchPage() {
  const ctx = useServiceContext();

  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    return kst.toISOString().split('T')[0];
  });
  const [trendDays, setTrendDays] = useState(14);

  const summaryQuery = useHanaMtsBatchSummary(selectedDate);
  const runsQuery = useHanaMtsBatchRuns(selectedDate);
  const trendQuery = useHanaMtsBatchTrend(trendDays);

  const isLoading = summaryQuery.isLoading || runsQuery.isLoading || trendQuery.isLoading;
  const error = summaryQuery.error || runsQuery.error || trendQuery.error;
  const refetch = () => {
    summaryQuery.refetch();
    runsQuery.refetch();
    trendQuery.refetch();
  };

  const summary = summaryQuery.data;
  const batchRuns = runsQuery.data ?? [];
  const batchTrend = trendQuery.data ?? [];

  if (!ctx) {
    return (
      <div className="p-8 h-full overflow-y-auto bg-gray-50">
        <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl">
          <p className="text-rose-600">서비스 컨텍스트를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <Dashboard isLoading={isLoading} error={error as Error | null} refetch={refetch}>
      <Dashboard.Header
        title="배치 동기화 모니터링"
        rightContent={
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => setTrendDays(d)}
                  className={`px-3 py-1 rounded-md text-sm ${
                    trendDays === d
                      ? 'bg-white shadow font-medium'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {d}일
                </button>
              ))}
            </div>
          </div>
        }
      />

      <Dashboard.Skeleton layout="kpi-chart" />
      <Dashboard.Error />

      <Dashboard.Content>
        <Dashboard.KPISection columns={4}>
          <KPICard
            title="실행 횟수"
            value={summary?.totalRuns ?? 0}
            format="number"
            icon={<RefreshCw className="w-5 h-5" />}
            status="neutral"
          />
          <KPICard
            title="평균 소요시간"
            value={summary?.avgDurationSec ?? 0}
            format="number"
            icon={<Timer className="w-5 h-5" />}
            status="neutral"
            subtitle="초"
          />
          <KPICard
            title="Wind 데이터"
            value={summary?.lastWindCount ?? 0}
            format="number"
            icon={<Database className="w-5 h-5" />}
            status="neutral"
          />
          <KPICard
            title="Minkabu 데이터"
            value={summary?.lastMinkabuCount ?? 0}
            format="number"
            icon={<Database className="w-5 h-5" />}
            status="neutral"
          />
        </Dashboard.KPISection>

        <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">배치 실행 이력</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-3 font-medium">시각</th>
                  <th className="pb-3 font-medium">이벤트</th>
                  <th className="pb-3 font-medium text-right">소요시간</th>
                  <th className="pb-3 font-medium text-right">Wind 건수</th>
                  <th className="pb-3 font-medium text-right">Minkabu 건수</th>
                </tr>
              </thead>
              <tbody>
                {batchRuns.map((run, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-3 text-gray-500 text-xs">{run.timestamp}</td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          run.message === 'batch sync completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : run.message === 'starting batch sync'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {run.message}
                      </span>
                    </td>
                    <td className="py-3 text-right text-gray-600">
                      {run.durationSec != null ? `${run.durationSec.toFixed(1)}초` : '-'}
                    </td>
                    <td className="py-3 text-right text-gray-600">
                      {run.cnWindCount != null ? run.cnWindCount.toLocaleString() : '-'}
                    </td>
                    <td className="py-3 text-right text-gray-600">
                      {run.jpMinkabuCount != null ? run.jpMinkabuCount.toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {batchRuns.length === 0 && (
              <p className="text-center text-gray-400 py-8">배치 실행 이력이 없습니다</p>
            )}
          </div>
        </div>

        <Dashboard.ChartsSection columns={2}>
          <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">소요시간 트렌드</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={batchTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="dateKst" tickFormatter={(d) => d.slice(5)} />
                <YAxis unit="초" />
                <Tooltip formatter={(v) => [`${v}초`]} />
                <Line
                  type="monotone"
                  dataKey="avgDurationSec"
                  name="평균 소요시간"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">데이터 건수 트렌드</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={batchTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="dateKst" tickFormatter={(d) => d.slice(5)} />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="totalWindCount"
                  name="Wind"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                  stroke="#3b82f6"
                  stackId="1"
                />
                <Area
                  type="monotone"
                  dataKey="totalMinkabuCount"
                  name="Minkabu"
                  fill="#8b5cf6"
                  fillOpacity={0.3}
                  stroke="#8b5cf6"
                  stackId="1"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Dashboard.ChartsSection>
      </Dashboard.Content>
    </Dashboard>
  );
}
