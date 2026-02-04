'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Chart } from '@/components/compound/Chart';
import { CHART_COLORS, TOOLTIP_STYLE } from './chart-theme';

interface TrafficData {
  hour: string;
  request_count: number;
  success_count: number;
  fail_count: number;
  total_tokens: number;
  avg_tokens: number;
}

interface RealtimeTrafficChartProps {
  data: TrafficData[];
  title?: string;
}

const formatHour = (hour: string): string => {
  try {
    const date = new Date(hour);
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return hour;
  }
};

const RealtimeTrafficChart: React.FC<RealtimeTrafficChartProps> = ({
  data,
  title = '실시간 트래픽',
}) => {
  // 시간순 정렬 (오래된 것부터)
  const sortedData = [...data].sort((a, b) =>
    new Date(a.hour).getTime() - new Date(b.hour).getTime()
  );

  return (
    <Chart title={title} height={300}>
      <AreaChart data={sortedData}>
        <defs>
          <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorFails" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
        <XAxis
          dataKey="hour"
          stroke={CHART_COLORS.axis}
          fontSize={11}
          tickLine={false}
          tickFormatter={formatHour}
          interval="preserveStartEnd"
        />
        <YAxis stroke={CHART_COLORS.axis} fontSize={12} tickLine={false} />
        <Tooltip
          contentStyle={{
            ...TOOLTIP_STYLE,
            borderRadius: '8px',
          }}
          labelFormatter={formatHour}
          formatter={(value, name) => {
            const labels: Record<string, string> = {
              request_count: '요청 수',
              success_count: '성공',
              fail_count: '실패',
            };
            const numValue = typeof value === 'number' ? value : 0;
            const strName = String(name);
            return [numValue.toLocaleString(), labels[strName] || strName];
          }}
        />
        <Area
          type="monotone"
          dataKey="request_count"
          stroke="#3b82f6"
          fillOpacity={1}
          fill="url(#colorRequests)"
          name="request_count"
        />
        <Area
          type="monotone"
          dataKey="fail_count"
          stroke="#f43f5e"
          fillOpacity={1}
          fill="url(#colorFails)"
          name="fail_count"
        />
      </AreaChart>
    </Chart>
  );
};

export default RealtimeTrafficChart;
