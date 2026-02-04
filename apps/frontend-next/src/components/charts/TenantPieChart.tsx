'use client';

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
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

const TenantPieChart: React.FC<TenantPieChartProps> = ({
  data,
  title = '테넌트별 사용량',
  dataKey = 'total_tokens',
}) => {
  const total = data.reduce((sum, item) => sum + item[dataKey], 0);

  const chartData = data.map((item, index) => ({
    name: item.tenant_id,
    value: item[dataKey],
    percentage: ((item[dataKey] / total) * 100).toFixed(1),
    fill: COLORS[index % COLORS.length],
  }));

  const formatValue = (value: number): string => {
    if (dataKey === 'total_tokens') {
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  };

  return (
    <Chart.Wrapper title={title}>
      <div className="h-[300px] w-full">
        <PieChart width={800} height={300}>
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
            formatter={(value) => {
              const numValue = typeof value === 'number' ? value : 0;
              return [formatValue(numValue), dataKey === 'total_tokens' ? '토큰' : '요청'];
            }}
          />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            formatter={(value) => (
              <span className="text-gray-600 text-sm">{value}</span>
            )}
          />
        </PieChart>
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
};

export default TenantPieChart;
