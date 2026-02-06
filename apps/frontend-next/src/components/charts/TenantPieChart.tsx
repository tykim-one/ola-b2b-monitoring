'use client';

import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Chart } from '@/components/compound/Chart';
import { TOOLTIP_STYLE } from './chart-theme';

interface TenantData {
  tenant_id: string;
  total_tokens: number;
  request_count: number;
}

interface TenantPieChartProps {
  data: TenantData[];
  title?: string;
  dataKey?: 'total_tokens' | 'request_count';
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e', '#06b6d4', '#84cc16'];

const legendFormatter = (value: string) => (
  <span className="text-gray-600 text-sm">{value}</span>
);

const TenantPieChart: React.FC<TenantPieChartProps> = React.memo(({
  data,
  title = '테넌트별 사용량',
  dataKey = 'total_tokens',
}) => {
  const total = useMemo(() =>
    data.reduce((sum, item) => sum + item[dataKey], 0),
    [data, dataKey]);

  const chartData = useMemo(() =>
    data.map((item, index) => ({
      name: item.tenant_id,
      value: item[dataKey],
      percentage: ((item[dataKey] / total) * 100).toFixed(1),
      fill: COLORS[index % COLORS.length],
    })),
    [data, dataKey, total]);

  // formatValue는 dataKey에 의존하므로 컴포넌트 내부에서 useCallback 처리
  const formatValue = React.useCallback((value: number): string => {
    if (dataKey === 'total_tokens') {
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  }, [dataKey]);

  // tooltipFormatter는 dataKey에 의존하므로 컴포넌트 내부에서 useCallback 처리
  const tooltipFormatter = React.useCallback((value: unknown): [string, string] => {
    const numValue = typeof value === 'number' ? value : 0;
    return [formatValue(numValue), dataKey === 'total_tokens' ? '토큰' : '요청'];
  }, [dataKey, formatValue]);

  return (
    <Chart.Wrapper title={title}>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                ...TOOLTIP_STYLE,
                borderRadius: '8px',
              }}
              formatter={tooltipFormatter}
            />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              formatter={legendFormatter}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-gray-500 text-sm">
          총 {dataKey === 'total_tokens' ? '토큰' : '요청'}:{' '}
          <span className="text-gray-900 font-medium">{formatValue(total)}</span>
        </div>
      </div>
    </Chart.Wrapper>
  );
});

export default TenantPieChart;
