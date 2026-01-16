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
  Legend,
} from 'recharts';

interface CorrelationData {
  tenant_id: string;
  query_length: number;
  response_length: number;
  input_tokens: number;
  output_tokens: number;
  efficiency_ratio: number;
  timestamp: string;
}

interface QueryResponseScatterPlotProps {
  data: CorrelationData[];
  title?: string;
}

const QueryResponseScatterPlot: React.FC<QueryResponseScatterPlotProps> = ({
  data,
  title = '질문-응답 길이 상관관계',
}) => {
  // 효율성 비율에 따른 색상 분류
  const highEfficiency = data.filter((d) => d.efficiency_ratio >= 2);
  const normalEfficiency = data.filter(
    (d) => d.efficiency_ratio >= 0.5 && d.efficiency_ratio < 2
  );
  const lowEfficiency = data.filter((d) => d.efficiency_ratio < 0.5);

  // 상관계수 계산 (피어슨)
  const calcCorrelation = () => {
    if (data.length < 2) return 0;
    const n = data.length;
    const sumX = data.reduce((s, d) => s + d.query_length, 0);
    const sumY = data.reduce((s, d) => s + d.response_length, 0);
    const sumXY = data.reduce((s, d) => s + d.query_length * d.response_length, 0);
    const sumX2 = data.reduce((s, d) => s + d.query_length * d.query_length, 0);
    const sumY2 = data.reduce((s, d) => s + d.response_length * d.response_length, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
    );
    return denominator === 0 ? 0 : numerator / denominator;
  };

  const correlation = calcCorrelation();

  return (
    <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <div className="text-right">
          <div className="text-slate-400 text-xs">상관계수</div>
          <div
            className={`font-bold ${
              correlation > 0.5
                ? 'text-emerald-400'
                : correlation > 0
                ? 'text-yellow-400'
                : 'text-rose-400'
            }`}
          >
            r = {correlation.toFixed(3)}
          </div>
        </div>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              type="number"
              dataKey="query_length"
              name="질문 길이"
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v)}
              label={{
                value: '질문 길이 (문자)',
                position: 'insideBottom',
                offset: -10,
                fill: '#64748b',
                fontSize: 11,
              }}
            />
            <YAxis
              type="number"
              dataKey="response_length"
              name="응답 길이"
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v)}
              label={{
                value: '응답 길이 (문자)',
                angle: -90,
                position: 'insideLeft',
                fill: '#64748b',
                fontSize: 11,
              }}
            />
            <ZAxis
              type="number"
              dataKey="efficiency_ratio"
              range={[30, 150]}
              name="효율성"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '8px',
              }}
              cursor={{ strokeDasharray: '3 3' }}
              formatter={(value, name) => {
                const labels: Record<string, string> = {
                  query_length: '질문 길이',
                  response_length: '응답 길이',
                  efficiency_ratio: '효율성',
                };
                return [value, labels[String(name)] || String(name)];
              }}
              labelFormatter={(_, payload) => {
                if (payload && payload[0]) {
                  const item = payload[0].payload as CorrelationData;
                  return `${item.tenant_id}`;
                }
                return '';
              }}
            />
            <Legend
              formatter={(value) => {
                const labels: Record<string, string> = {
                  high: '높은 효율성 (2x+)',
                  normal: '정상 (0.5-2x)',
                  low: '낮은 효율성 (<0.5x)',
                };
                return <span className="text-slate-400 text-xs">{labels[value] || value}</span>;
              }}
            />
            <Scatter name="high" data={highEfficiency} fill="#10b981" />
            <Scatter name="normal" data={normalEfficiency} fill="#3b82f6" />
            <Scatter name="low" data={lowEfficiency} fill="#f43f5e" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default QueryResponseScatterPlot;
