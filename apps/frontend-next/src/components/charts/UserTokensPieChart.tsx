'use client';

import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from '@/lib/recharts';
import { UserTokenUsage } from '@ola/shared-types';
import { Chart } from '@/components/compound/Chart';
import { TOOLTIP_STYLE } from './chart-theme';

interface UserTokensPieChartProps {
  data: UserTokenUsage[];
  title?: string;
  maxDisplay?: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e', '#06b6d4', '#84cc16', '#ec4899'];

type TokenType = 'totalTokens' | 'inputTokens' | 'outputTokens';

const tokenTypeLabels: Record<TokenType, string> = {
  totalTokens: '전체 토큰',
  inputTokens: '입력 토큰',
  outputTokens: '출력 토큰',
};

const truncateUserId = (userId: string, maxLen: number = 10): string => {
  if (userId.length <= maxLen) return userId;
  return `${userId.substring(0, maxLen)}...`;
};

const formatValue = (value: number): string => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString();
};

const UserTokensPieChart: React.FC<UserTokensPieChartProps> = ({
  data,
  title = '유저별 토큰 사용량',
  maxDisplay = 8,
}) => {
  const [tokenType, setTokenType] = useState<TokenType>('totalTokens');

  // Top N users + "others"
  const topUsers = data.slice(0, maxDisplay);
  const othersTotal = data.slice(maxDisplay).reduce((sum, item) => sum + item[tokenType], 0);

  const total = data.reduce((sum, item) => sum + item[tokenType], 0);

  const chartData = [
    ...topUsers.map((item, index) => ({
      name: truncateUserId(item.userId),
      fullName: item.userId,
      value: item[tokenType],
      percentage: ((item[tokenType] / total) * 100).toFixed(1),
      fill: COLORS[index % COLORS.length],
      requestCount: item.requestCount,
    })),
    ...(othersTotal > 0
      ? [
          {
            name: '기타',
            fullName: `기타 ${data.length - maxDisplay}명`,
            value: othersTotal,
            percentage: ((othersTotal / total) * 100).toFixed(1),
            fill: '#64748b',
            requestCount: data.slice(maxDisplay).reduce((sum, item) => sum + item.requestCount, 0),
          },
        ]
      : []),
  ];

  return (
    <Chart.Wrapper title={title}>
      {/* Token Type Selector */}
      <div className="flex justify-end mb-4">
        <div className="flex gap-1 bg-white rounded-lg p-1">
          {(Object.keys(tokenTypeLabels) as TokenType[]).map((type) => (
            <button
              key={type}
              onClick={() => setTokenType(type)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                tokenType === type
                  ? 'bg-blue-600 text-gray-900'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {tokenTypeLabels[type]}
            </button>
          ))}
        </div>
      </div>

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
              contentStyle={TOOLTIP_STYLE}
              formatter={(value, name, props) => {
                const numValue = typeof value === 'number' ? value : 0;
                const payload = props.payload;
                return [
                  `${formatValue(numValue)} (${payload.percentage}%)`,
                  tokenTypeLabels[tokenType],
                ];
              }}
              labelFormatter={(label, payload) => {
                if (payload?.[0]?.payload?.fullName) {
                  return `유저: ${payload[0].payload.fullName}`;
                }
                return `유저: ${label}`;
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
        </ResponsiveContainer>
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between text-sm">
        <div className="text-gray-500">
          총 {tokenTypeLabels[tokenType]}:{' '}
          <span className="text-gray-900 font-medium">{formatValue(total)}</span>
        </div>
        <div className="text-gray-500">
          유저 수: <span className="text-gray-900 font-medium">{data.length}명</span>
        </div>
      </div>
    </Chart.Wrapper>
  );
};

export default UserTokensPieChart;
