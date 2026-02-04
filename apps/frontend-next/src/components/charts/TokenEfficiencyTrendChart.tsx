'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  ComposedChart,
} from 'recharts';
import { CHART_COLORS, TOOLTIP_STYLE } from './chart-theme';

interface EfficiencyTrendData {
  date: string;
  avg_efficiency_ratio: number;
  min_efficiency_ratio: number;
  max_efficiency_ratio: number;
  total_requests: number;
  avg_input_tokens: number;
  avg_output_tokens: number;
}

interface TokenEfficiencyTrendChartProps {
  data: EfficiencyTrendData[];
  title?: string;
}

const formatDate = (date: string): string => {
  try {
    const d = new Date(date);
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  } catch {
    return date;
  }
};

const TokenEfficiencyTrendChart: React.FC<TokenEfficiencyTrendChartProps> = ({
  data,
  title = '토큰 효율성 트렌드',
}) => {
  // 날짜순 정렬 (오래된 것부터)
  const sortedData = [...data].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // 평균 효율성 계산
  const avgEfficiency =
    data.length > 0
      ? data.reduce((sum, d) => sum + (d.avg_efficiency_ratio || 0), 0) / data.length
      : 0;

  return (
    <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="text-right">
          <div className="text-gray-500 text-xs">평균 효율성 (출력/입력)</div>
          <div className="text-emerald-400 font-bold">{avgEfficiency.toFixed(2)}x</div>
        </div>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={sortedData}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis
              dataKey="date"
              stroke={CHART_COLORS.axis}
              fontSize={11}
              tickLine={false}
              tickFormatter={formatDate}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke={CHART_COLORS.axis}
              fontSize={12}
              tickLine={false}
              tickFormatter={(v) => `${v.toFixed(1)}x`}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                ...TOOLTIP_STYLE,
                borderRadius: '8px',
              }}
              labelFormatter={formatDate}
              formatter={(value, name) => {
                const labels: Record<string, string> = {
                  avg_efficiency_ratio: '평균 효율성',
                  min_efficiency_ratio: '최소 효율성',
                  max_efficiency_ratio: '최대 효율성',
                };
                const numValue = typeof value === 'number' ? value : 0;
                return [`${numValue.toFixed(3)}x`, labels[String(name)] || String(name)];
              }}
            />
            <Legend
              formatter={(value) => {
                const labels: Record<string, string> = {
                  avg_efficiency_ratio: '평균',
                  min_efficiency_ratio: '최소',
                  max_efficiency_ratio: '최대',
                };
                return <span className="text-gray-500 text-xs">{labels[value] || value}</span>;
              }}
            />
            {/* 최소-최대 영역 */}
            <Area
              type="monotone"
              dataKey="max_efficiency_ratio"
              stroke="none"
              fill="#3b82f6"
              fillOpacity={0.1}
            />
            <Area
              type="monotone"
              dataKey="min_efficiency_ratio"
              stroke="none"
              fill={CHART_COLORS.bgFill}
              fillOpacity={1}
            />
            {/* 평균 라인 */}
            <Line
              type="monotone"
              dataKey="avg_efficiency_ratio"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: '#10b981' }}
            />
            <Line
              type="monotone"
              dataKey="min_efficiency_ratio"
              stroke="#f43f5e"
              strokeWidth={1}
              strokeDasharray="3 3"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="max_efficiency_ratio"
              stroke="#3b82f6"
              strokeWidth={1}
              strokeDasharray="3 3"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TokenEfficiencyTrendChart;
