'use client';

import React from 'react';
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
import { UserRequestCount } from '@ola/shared-types';

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

const UserRequestsBarChart: React.FC<UserRequestsBarChartProps> = ({
  data,
  title = '유저별 요청 수',
  maxDisplay = 10,
}) => {
  // Top N users by request count
  const chartData = data.slice(0, maxDisplay).map((item) => ({
    ...item,
    displayId: truncateUserId(item.userId),
    fullId: item.userId,
  }));

  const totalRequests = data.reduce((sum, item) => sum + item.requestCount, 0);
  const totalUsers = data.length;

  return (
    <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <div className="flex gap-4 text-sm">
          <div className="text-right">
            <div className="text-slate-400 text-xs">총 유저</div>
            <div className="text-blue-400 font-bold">{totalUsers}명</div>
          </div>
          <div className="text-right">
            <div className="text-slate-400 text-xs">총 요청</div>
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
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              type="number"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              axisLine={{ stroke: '#475569' }}
            />
            <YAxis
              type="category"
              dataKey="displayId"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={{ stroke: '#475569' }}
              width={75}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '8px',
              }}
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
      <div className="mt-4 pt-4 border-t border-slate-700 flex justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.high }} />
          <span className="text-slate-400">성공률 95%+</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.medium }} />
          <span className="text-slate-400">성공률 80-95%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.low }} />
          <span className="text-slate-400">성공률 80% 미만</span>
        </div>
      </div>
    </div>
  );
};

export default UserRequestsBarChart;
