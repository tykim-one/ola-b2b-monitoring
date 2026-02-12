'use client';

import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from '@/lib/recharts';
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

interface DailyAggregated {
  date: string;
  request_count: number;
  success_count: number;
  fail_count: number;
}

interface RealtimeTrafficChartProps {
  data: TrafficData[];
  title?: string;
}

const formatTime = (hour: string): string => {
  try {
    const date = new Date(hour);
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return hour;
  }
};

const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  } catch {
    return dateStr;
  }
};

const tooltipFormatter = (value: unknown, name: unknown): [string, string] => {
  const labels: Record<string, string> = {
    request_count: '요청 수',
    success_count: '성공',
    fail_count: '실패',
  };
  const numValue = typeof value === 'number' ? value : 0;
  const strName = String(name);
  return [numValue.toLocaleString(), labels[strName] || strName];
};

const RealtimeTrafficChart: React.FC<RealtimeTrafficChartProps> = React.memo(({
  data,
  title = '실시간 트래픽',
}) => {
  // 시간순 정렬 (오래된 것부터)
  const sortedData = useMemo(() =>
    [...data].sort((a, b) =>
      new Date(a.hour).getTime() - new Date(b.hour).getTime()
    ), [data]);

  const isMultiDay = sortedData.length > 24;

  // multi-day: 시간별 데이터를 일별로 집계
  const dailyData = useMemo(() => {
    if (!isMultiDay) return [];
    const map = new Map<string, DailyAggregated>();
    for (const item of sortedData) {
      const d = new Date(item.hour);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const existing = map.get(key);
      if (existing) {
        existing.request_count += item.request_count;
        existing.success_count += item.success_count;
        existing.fail_count += item.fail_count;
      } else {
        map.set(key, {
          date: key,
          request_count: item.request_count,
          success_count: item.success_count,
          fail_count: item.fail_count,
        });
      }
    }
    return Array.from(map.values());
  }, [sortedData, isMultiDay]);

  if (isMultiDay) {
    return (
      <Chart title={title} height={300}>
        <BarChart data={dailyData}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
          <XAxis
            dataKey="date"
            stroke={CHART_COLORS.axis}
            fontSize={11}
            tickLine={false}
            tickFormatter={formatDate}
          />
          <YAxis stroke={CHART_COLORS.axis} fontSize={12} tickLine={false} />
          <Tooltip
            contentStyle={{ ...TOOLTIP_STYLE, borderRadius: '8px' }}
            labelFormatter={formatDate}
            formatter={tooltipFormatter}
          />
          <Bar
            dataKey="request_count"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
            name="request_count"
          />
          <Bar
            dataKey="fail_count"
            fill="#f43f5e"
            radius={[4, 4, 0, 0]}
            name="fail_count"
          />
        </BarChart>
      </Chart>
    );
  }

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
          tickFormatter={formatTime}
          interval="preserveStartEnd"
        />
        <YAxis stroke={CHART_COLORS.axis} fontSize={12} tickLine={false} />
        <Tooltip
          contentStyle={{ ...TOOLTIP_STYLE, borderRadius: '8px' }}
          labelFormatter={formatTime}
          formatter={tooltipFormatter}
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
});

export default RealtimeTrafficChart;
