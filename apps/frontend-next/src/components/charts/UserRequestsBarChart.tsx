'use client';

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from '@/lib/recharts';
import { UserRequestCount } from '@ola/shared-types';
import { Chart } from '@/components/compound/Chart';
import { CHART_COLORS, TOOLTIP_STYLE } from './chart-theme';

interface UserRequestsBarChartProps {
  data: UserRequestCount[];
  title?: string;
  maxDisplay?: number;
}

const COLORS = {
  high: '#10b981',    // emerald - high success rate
  medium: '#f59e0b',  // amber - medium success rate
  low: '#ef4444',     // red - low success rate
};

const getColor = (successRate: number): string => {
  if (successRate >= 95) return COLORS.high;
  if (successRate >= 80) return COLORS.medium;
  return COLORS.low;
};

const truncateUserId = (userId: string, maxLen: number = 12): string => {
  if (userId.length <= maxLen) return userId;
  return `${userId.substring(0, maxLen)}...`;
};

const UserRequestsBarChart: React.FC<UserRequestsBarChartProps> = React.memo(({
  data,
  title = '유저별 요청 수',
  maxDisplay = 10,
}) => {
  // Top N users by request count
  const chartData = useMemo(() =>
    data.slice(0, maxDisplay).map((item) => ({
      ...item,
      displayId: truncateUserId(item.userId),
      fullId: item.userId,
    })),
    [data, maxDisplay]);

  const totalRequests = useMemo(() =>
    data.reduce((sum, item) => sum + item.requestCount, 0),
    [data]);
  const totalUsers = data.length;

  return (
    <Chart.Wrapper title={title}>
      <div className="flex justify-end mb-4">
        <div className="flex gap-4 text-sm">
          <div className="text-right">
            <div className="text-gray-500 text-xs">총 유저</div>
            <div className="text-blue-400 font-bold">{totalUsers}명</div>
          </div>
          <div className="text-right">
            <div className="text-gray-500 text-xs">총 요청</div>
            <div className="text-emerald-400 font-bold">{totalRequests.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis
              type="number"
              tick={{ fill: CHART_COLORS.axisText, fontSize: 12 }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              type="category"
              dataKey="displayId"
              tick={{ fill: CHART_COLORS.axisText, fontSize: 11 }}
              axisLine={{ stroke: '#e5e7eb' }}
              width={75}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value, name) => {
                if (name === 'requestCount') return [value, '요청 수'];
                return [value, name];
              }}
              labelFormatter={(label, payload) => {
                if (payload?.[0]?.payload?.fullId) {
                  return `유저: ${payload[0].payload.fullId}`;
                }
                return `유저: ${label}`;
              }}
            />
            <Bar dataKey="requestCount" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.successRate)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200 flex justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.high }} />
          <span className="text-gray-500">성공률 95%+</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.medium }} />
          <span className="text-gray-500">성공률 80-95%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.low }} />
          <span className="text-gray-500">성공률 80% 미만</span>
        </div>
      </div>
    </Chart.Wrapper>
  );
});

export default UserRequestsBarChart;
