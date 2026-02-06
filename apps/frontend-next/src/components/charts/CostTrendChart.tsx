'use client';

import React, { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Chart } from '@/components/compound/Chart';
import { CHART_COLORS, TOOLTIP_STYLE } from './chart-theme';

interface CostData {
  date: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  input_cost: number;
  output_cost: number;
  total_cost: number;
}

interface CostTrendChartProps {
  data: CostData[];
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

const yAxisLeftTickFormatter = (v: number) => `$${v}`;
const yAxisRightTickFormatter = (v: number) => `${(v / 1000).toFixed(0)}K`;

const tooltipFormatter = (value: unknown, name: unknown): [string, string] => {
  const labels: Record<string, string> = {
    input_cost: '입력 비용',
    output_cost: '출력 비용',
    total_cost: '총 비용',
    total_tokens: '총 토큰',
  };
  const numValue = typeof value === 'number' ? value : 0;
  const strName = String(name);
  if (strName.includes('cost')) {
    return [`$${numValue.toFixed(4)}`, labels[strName] || strName];
  }
  return [numValue.toLocaleString(), labels[strName] || strName];
};

const legendFormatter = (value: string) => {
  const labels: Record<string, string> = {
    input_cost: '입력 비용',
    output_cost: '출력 비용',
    total_tokens: '총 토큰',
  };
  return <span className="text-gray-500 text-xs">{labels[value] || value}</span>;
};

const CostTrendChart: React.FC<CostTrendChartProps> = React.memo(({
  data,
  title = '일별 비용 트렌드',
}) => {
  // 날짜순 정렬 (오래된 것부터)
  const sortedData = useMemo(() =>
    [...data].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    ), [data]);

  const totalCost = useMemo(() =>
    data.reduce((sum, item) => sum + item.total_cost, 0),
    [data]);

  return (
    <Chart
      title={title}
      height={300}
      headerRight={
        <div className="text-right">
          <div className="text-gray-500 text-xs">총 비용 (30일)</div>
          <div className="text-emerald-400 font-bold">${totalCost.toFixed(2)}</div>
        </div>
      }
    >
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
          yAxisId="left"
          stroke={CHART_COLORS.axis}
          fontSize={12}
          tickLine={false}
          tickFormatter={yAxisLeftTickFormatter}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke={CHART_COLORS.axis}
          fontSize={12}
          tickLine={false}
          tickFormatter={yAxisRightTickFormatter}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelFormatter={formatDate}
          formatter={tooltipFormatter}
        />
        <Legend formatter={legendFormatter} />
        <Bar
          yAxisId="left"
          dataKey="input_cost"
          fill="#3b82f6"
          radius={[4, 4, 0, 0]}
          stackId="cost"
        />
        <Bar
          yAxisId="left"
          dataKey="output_cost"
          fill="#8b5cf6"
          radius={[4, 4, 0, 0]}
          stackId="cost"
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="total_tokens"
          stroke="#10b981"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </Chart>
  );
});

export default CostTrendChart;
