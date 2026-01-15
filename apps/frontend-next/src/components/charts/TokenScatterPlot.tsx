'use client';

import React from 'react';
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

interface TokenData {
  tenant_id: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  efficiency_ratio: number;
  success: string;
}

interface TokenScatterPlotProps {
  data: TokenData[];
  title?: string;
}

const TENANT_COLORS: Record<string, string> = {
  ibks: '#3b82f6',
  default: '#10b981',
};

const TokenScatterPlot: React.FC<TokenScatterPlotProps> = ({
  data,
  title = '토큰 효율성 분석',
}) => {
  // 테넌트별로 데이터 그룹화
  const tenantGroups = data.reduce(
    (acc, item) => {
      const tenant = item.tenant_id || 'unknown';
      if (!acc[tenant]) acc[tenant] = [];
      acc[tenant].push(item);
      return acc;
    },
    {} as Record<string, TokenData[]>
  );

  const tenants = Object.keys(tenantGroups);

  // 효율성 통계 계산
  const avgEfficiency =
    data.length > 0
      ? data.reduce((sum, d) => sum + (d.efficiency_ratio || 0), 0) / data.length
      : 0;

  return (
    <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <div className="text-right">
          <div className="text-slate-400 text-xs">평균 효율성 비율</div>
          <div className="text-blue-400 font-bold">{avgEfficiency.toFixed(3)}</div>
        </div>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              type="number"
              dataKey="input_tokens"
              name="입력 토큰"
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
              label={{
                value: '입력 토큰',
                position: 'insideBottom',
                offset: -10,
                fill: '#64748b',
                fontSize: 11,
              }}
            />
            <YAxis
              type="number"
              dataKey="output_tokens"
              name="출력 토큰"
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
              label={{
                value: '출력 토큰',
                angle: -90,
                position: 'insideLeft',
                fill: '#64748b',
                fontSize: 11,
              }}
            />
            <ZAxis type="number" dataKey="total_tokens" range={[20, 200]} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '8px',
              }}
              formatter={(value, name) => {
                const numValue = typeof value === 'number' ? value : 0;
                return [numValue.toLocaleString(), String(name)];
              }}
              labelFormatter={() => ''}
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
      <div className="flex gap-4 mt-4 pt-4 border-t border-slate-700">
        {tenants.map((tenant) => (
          <div key={tenant} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor: TENANT_COLORS[tenant] || TENANT_COLORS.default,
              }}
            />
            <span className="text-slate-400 text-sm">{tenant}</span>
            <span className="text-slate-500 text-xs">({tenantGroups[tenant].length}건)</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TokenScatterPlot;
