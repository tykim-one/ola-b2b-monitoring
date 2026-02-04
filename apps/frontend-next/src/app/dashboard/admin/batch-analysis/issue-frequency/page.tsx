'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  batchAnalysisApi,
  IssueFrequencyResponse,
  IssueFrequencyItem,
  TenantInfo,
} from '@/services/batchAnalysisService';

export default function IssueFrequencyPage() {
  const [data, setData] = useState<IssueFrequencyResponse | null>(null);
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [tenantId, setTenantId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [limit, setLimit] = useState<number>(10);

  // Expanded issues
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { limit };
      if (tenantId) params.tenantId = tenantId;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await batchAnalysisApi.getIssueFrequency(params);
      setData(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch issue frequency data');
    } finally {
      setLoading(false);
    }
  }, [tenantId, startDate, endDate, limit]);

  const fetchTenants = async () => {
    try {
      const response = await batchAnalysisApi.getAvailableTenants(90);
      setTenants(response.tenants);
    } catch (err) {
      console.error('Failed to fetch tenants:', err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchTenants();
  }, [fetchData]);

  const handleResetFilters = () => {
    setTenantId('');
    setStartDate('');
    setEndDate('');
    setLimit(10);
  };

  // Chart colors
  const COLORS = [
    '#ef4444', // red-500
    '#f97316', // orange-500
    '#eab308', // yellow-500
    '#22c55e', // green-500
    '#3b82f6', // blue-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#06b6d4', // cyan-500
    '#f59e0b', // amber-500
    '#10b981', // emerald-500
  ];

  const chartData = data?.issues.map((item, index) => ({
    name: item.issue.length > 30 ? item.issue.substring(0, 30) + '...' : item.issue,
    fullName: item.issue,
    count: item.count,
    percentage: item.percentage,
    color: COLORS[index % COLORS.length],
  })) || [];

  return (
    <div className="p-6 bg-white min-h-screen text-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/admin/batch-analysis"
            className="text-gray-500 hover:text-gray-900 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold">이슈 빈도 리포트</h1>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
        >
          {loading ? '로딩 중...' : '새로고침'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm text-gray-500 mb-1">테넌트</label>
            <select
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-900"
            >
              <option value="">전체 테넌트</option>
              {tenants.map((t) => (
                <option key={t.tenant_id} value={t.tenant_id}>
                  {t.tenant_id} ({t.chat_count}건)
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm text-gray-500 mb-1">시작 날짜</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-900"
            />
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm text-gray-500 mb-1">종료 날짜</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-900"
            />
          </div>

          <div className="w-[100px]">
            <label className="block text-sm text-gray-500 mb-1">표시 개수</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-900"
            >
              <option value={5}>5개</option>
              <option value={10}>10개</option>
              <option value={20}>20개</option>
              <option value={50}>50개</option>
            </select>
          </div>

          <button
            onClick={handleResetFilters}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-300 rounded-lg transition"
          >
            초기화
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6 text-red-200">
          {error}
        </div>
      )}

      {/* Summary Stats */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4">
            <div className="text-gray-500 text-sm">총 이슈 수</div>
            <div className="text-2xl font-bold text-red-400">{data.totalIssues.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="text-gray-500 text-sm">분석된 결과 수</div>
            <div className="text-2xl font-bold text-blue-400">{data.totalResults.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="text-gray-500 text-sm">고유 이슈 유형</div>
            <div className="text-2xl font-bold text-yellow-400">{data.issues.length}</div>
          </div>
        </div>
      )}

      {/* Chart */}
      {data && data.issues.length > 0 && (
        <div className="bg-white rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4">이슈 빈도 차트</h2>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#9ca3af" />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#9ca3af"
                  width={200}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value, _name, props) => [
                    `${value}회 (${(props as any).payload.percentage}%)`,
                    (props as any).payload.fullName,
                  ]}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Issue List */}
      {data && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">이슈 상세 목록</h2>
          </div>

          {data.issues.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              분석된 이슈가 없습니다.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {data.issues.map((item, index) => (
                <IssueRow
                  key={item.issue}
                  item={item}
                  index={index}
                  color={COLORS[index % COLORS.length]}
                  isExpanded={expandedIssue === item.issue}
                  onToggle={() =>
                    setExpandedIssue(expandedIssue === item.issue ? null : item.issue)
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && !data && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  );
}

// Issue Row Component
function IssueRow({
  item,
  index,
  color,
  isExpanded,
  onToggle,
}: {
  item: IssueFrequencyItem;
  index: number;
  color: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-white">
      {/* Issue Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-4 hover:bg-gray-100 transition text-left"
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-900 font-bold text-sm flex-shrink-0"
          style={{ backgroundColor: color }}
        >
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-gray-900 font-medium truncate">{item.issue}</div>
          <div className="text-gray-500 text-sm">
            {item.count}회 발생 ({item.percentage}%)
          </div>
        </div>
        <div className="flex-shrink-0">
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Issue Details (Expanded) */}
      {isExpanded && item.sampleResults.length > 0 && (
        <div className="px-4 pb-4">
          <div className="bg-white rounded-lg p-3">
            <div className="text-sm text-gray-500 mb-2">샘플 결과 ({item.sampleResults.length}개)</div>
            <div className="space-y-2">
              {item.sampleResults.map((sample) => (
                <Link
                  key={sample.id}
                  href={`/dashboard/admin/batch-analysis/results/${sample.id}`}
                  className="block p-2 bg-white rounded hover:bg-gray-100 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-900 truncate">{sample.userInput}</div>
                      <div className="text-xs text-gray-500">
                        테넌트: {sample.tenantId}
                        {sample.avgScore !== null && (
                          <span className="ml-2">
                            평균 점수:{' '}
                            <span
                              className={
                                sample.avgScore >= 8
                                  ? 'text-green-400'
                                  : sample.avgScore >= 6
                                  ? 'text-yellow-400'
                                  : 'text-red-400'
                              }
                            >
                              {sample.avgScore.toFixed(1)}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
