'use client';

import React, { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
} from 'recharts';
import { Chart } from '@/components/compound/Chart';
import { CHART_COLORS, TOOLTIP_STYLE } from './chart-theme';

interface TokenData {
  tenant_id: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  efficiency_ratio: number;
  success: boolean;
}

interface TokenScatterPlotProps {
  data: TokenData[];
  title?: string;
}

const TENANT_COLORS: Record<string, string> = {
  ibks: '#3b82f6',
  default: '#10b981',
};

const xAxisTickFormatter = (v: number) => `${(v / 1000).toFixed(0)}K`;
const yAxisTickFormatter = (v: number) => `${(v / 1000).toFixed(0)}K`;

const tooltipFormatter = (value: unknown, name: unknown): [string, string] => {
  const numValue = typeof value === 'number' ? value : 0;
  return [numValue.toLocaleString(), String(name)];
};

const tooltipLabelFormatter = () => '';

const TokenScatterPlot: React.FC<TokenScatterPlotProps> = React.memo(({
  data,
  title = '토큰 효율성 분석',
}) => {
  // 테넌트별로 데이터 그룹화
  const tenantGroups = useMemo(() =>
    data.reduce(
      (acc, item) => {
        const tenant = item.tenant_id || 'unknown';
        if (!acc[tenant]) acc[tenant] = [];
        acc[tenant].push(item);
        return acc;
      },
      {} as Record<string, TokenData[]>
    ), [data]);

  const tenants = useMemo(() => Object.keys(tenantGroups), [tenantGroups]);

  // 효율성 통계 계산
  const avgEfficiency = useMemo(() =>
    data.length > 0
      ? data.reduce((sum, d) => sum + (d.efficiency_ratio || 0), 0) / data.length
      : 0,
    [data]);

  return (
    <Chart.Wrapper title={title}>
      <div className="flex justify-end mb-4">
        <div className="text-right">
          <div className="text-gray-500 text-xs">평균 효율성 비율</div>
          <div className="text-blue-400 font-bold">{avgEfficiency.toFixed(3)}</div>
        </div>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis
              type="number"
              dataKey="input_tokens"
              name="입력 토큰"
              stroke={CHART_COLORS.axis}
              fontSize={12}
              tickLine={false}
              tickFormatter={xAxisTickFormatter}
              label={{
                value: '입력 토큰',
                position: 'insideBottom',
                offset: -10,
                fill: CHART_COLORS.axisText,
                fontSize: 11,
              }}
            />
            <YAxis
              type="number"
              dataKey="output_tokens"
              name="출력 토큰"
              stroke={CHART_COLORS.axis}
              fontSize={12}
              tickLine={false}
              tickFormatter={yAxisTickFormatter}
              label={{
                value: '출력 토큰',
                angle: -90,
                position: 'insideLeft',
                fill: CHART_COLORS.axisText,
                fontSize: 11,
              }}
            />
            <ZAxis type="number" dataKey="total_tokens" range={[20, 200]} />
            <Tooltip
              contentStyle={{
                ...TOOLTIP_STYLE,
                borderRadius: '8px',
              }}
              formatter={tooltipFormatter}
              labelFormatter={tooltipLabelFormatter}
            />
            {tenants.map((tenant) => (
              <Scatter
                key={tenant}
                name={tenant}
                data={tenantGroups[tenant]}
                fill={TENANT_COLORS[tenant] || TENANT_COLORS.default}
                fillOpacity={0.6}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-4 pt-4 border-t border-gray-200">
        {tenants.map((tenant) => (
          <div key={tenant} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor: TENANT_COLORS[tenant] || TENANT_COLORS.default,
              }}
            />
            <span className="text-gray-500 text-sm">{tenant}</span>
            <span className="text-gray-400 text-xs">({tenantGroups[tenant].length}건)</span>
          </div>
        ))}
      </div>
    </Chart.Wrapper>
  );
});

export default TokenScatterPlot;
