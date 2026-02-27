'use client';

import { useState } from 'react';
import { Activity, Timer, Users } from 'lucide-react';
import { useServiceContext } from '@/hooks/useServiceContext';
import {
  useHanaMtsApiKPI,
  useHanaMtsHourlyTraffic,
  useHanaMtsEndpoints,
  useHanaMtsSlowRequests,
} from '@/hooks/queries/use-hana-mts';
import { Dashboard } from '@/components/compound/Dashboard';
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
} from 'recharts';

export default function ServiceApiTrafficPage() {
  const ctx = useServiceContext();

  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    return kst.toISOString().split('T')[0];
  });

  const kpiQuery = useHanaMtsApiKPI(selectedDate);
  const hourlyQuery = useHanaMtsHourlyTraffic(selectedDate);
  const endpointsQuery = useHanaMtsEndpoints(selectedDate);
  const slowQuery = useHanaMtsSlowRequests(selectedDate, 20);

  if (!ctx) {
    return (
      <div className="p-8 h-full overflow-y-auto bg-gray-50">
        <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl">
          <p className="text-rose-600">서비스 컨텍스트를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const isLoading = kpiQuery.isLoading || hourlyQuery.isLoading;
  const error = kpiQuery.error || hourlyQuery.error;

  const kpiData = kpiQuery.data;
  const hourlyTraffic = hourlyQuery.data ?? [];
  const endpoints = endpointsQuery.data ?? [];
  const slowRequests = slowQuery.data ?? [];

  return (
    <Dashboard isLoading={isLoading} error={error as Error | null} refetch={kpiQuery.refetch}>
      <Dashboard.Header
        title="API 트래픽 모니터링"
        rightContent={
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        }
      />

      <Dashboard.Skeleton layout="kpi-chart" />
      <Dashboard.Error />

      <Dashboard.Content>
        <Dashboard.KPISection columns={4}>
          <KPICard
            title="총 요청"
            value={kpiData?.totalRequests ?? 0}
            format="number"
            icon={<Activity className="w-5 h-5" />}
            status="neutral"
          />
          <KPICard
            title="에러율"
            value={kpiData?.errorRate ?? 0}
            format="percentage"
            status={
              (kpiData?.errorRate ?? 0) > 5
                ? 'error'
                : (kpiData?.errorRate ?? 0) > 1
                  ? 'warning'
                  : 'success'
            }
            subtitle="임계값: 5%"
          />
          <KPICard
            title="P95 응답시간"
            value={kpiData?.p95DurationMs ?? 0}
            format="number"
            icon={<Timer className="w-5 h-5" />}
            status="neutral"
            subtitle="ms"
          />
          <KPICard
            title="고유 클라이언트"
            value={kpiData?.uniqueClients ?? 0}
            format="number"
            icon={<Users className="w-5 h-5" />}
            status="neutral"
          />
        </Dashboard.KPISection>

        <Dashboard.ChartsSection columns={2}>
          <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">시간별 트래픽</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={hourlyTraffic}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="hourKst" tickFormatter={(h) => `${h}시`} />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="requestCount"
                  name="요청 수"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                  stroke="#3b82f6"
                />
                <Area
                  type="monotone"
                  dataKey="errorCount"
                  name="에러 수"
                  fill="#ef4444"
                  fillOpacity={0.3}
                  stroke="#ef4444"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">시간별 평균 응답시간</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hourlyTraffic}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="hourKst" tickFormatter={(h) => `${h}시`} />
                <YAxis unit="ms" />
                <Tooltip formatter={(value) => [`${value}ms`]} />
                <Bar
                  dataKey="avgDurationMs"
                  name="평균 응답시간"
                  fill="#8b5cf6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Dashboard.ChartsSection>

        {endpoints.length > 0 && (
          <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">엔드포인트별 통계</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="pb-3 font-medium">메서드</th>
                    <th className="pb-3 font-medium">경로</th>
                    <th className="pb-3 font-medium text-right">요청 수</th>
                    <th className="pb-3 font-medium text-right">에러율</th>
                    <th className="pb-3 font-medium text-right">평균 응답</th>
                    <th className="pb-3 font-medium text-right">P95 응답</th>
                  </tr>
                </thead>
                <tbody>
                  {endpoints.map((ep, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-mono">
                          {ep.method}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-gray-700">{ep.path}</td>
                      <td className="py-3 text-right">{ep.requestCount.toLocaleString()}</td>
                      <td className="py-3 text-right">
                        <span
                          className={
                            ep.errorRate > 5 ? 'text-red-600 font-semibold' : 'text-gray-600'
                          }
                        >
                          {ep.errorRate}%
                        </span>
                      </td>
                      <td className="py-3 text-right text-gray-600">{ep.avgDurationMs}ms</td>
                      <td className="py-3 text-right text-gray-600">{ep.p95DurationMs}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {slowRequests.length > 0 && (
          <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">느린 요청 Top 20</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="pb-3 font-medium">시각</th>
                    <th className="pb-3 font-medium">메서드</th>
                    <th className="pb-3 font-medium">경로</th>
                    <th className="pb-3 font-medium text-right">상태</th>
                    <th className="pb-3 font-medium text-right">응답시간</th>
                    <th className="pb-3 font-medium">클라이언트</th>
                  </tr>
                </thead>
                <tbody>
                  {slowRequests.map((req, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-3 text-gray-500 text-xs">{req.timestamp}</td>
                      <td className="py-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-mono">
                          {req.method}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-gray-700 text-xs">
                        {req.path}
                        {req.query ? `?${req.query}` : ''}
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className={
                            req.status >= 400
                              ? 'text-red-600 font-semibold'
                              : 'text-emerald-600'
                          }
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3 text-right font-semibold text-amber-600">
                        {req.durationMs.toFixed(0)}ms
                      </td>
                      <td className="py-3 text-gray-500 text-xs font-mono">{req.clientIp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Dashboard.Content>
    </Dashboard>
  );
}
