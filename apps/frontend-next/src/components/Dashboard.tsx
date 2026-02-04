'use client';

import React, { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar
} from 'recharts';
import { MetricData } from '@/types';
import { CHART_COLORS, TOOLTIP_STYLE } from './charts/chart-theme';
import { Chart } from '@/components/compound/Chart';

interface DashboardProps {
  metrics: MetricData[];
}

const Dashboard: React.FC<DashboardProps> = ({ metrics }) => {
  
  const totalRequests = useMemo(() => metrics.reduce((acc, curr) => acc + curr.requests, 0), [metrics]);
  const totalErrors = useMemo(() => metrics.reduce((acc, curr) => acc + curr.errors, 0), [metrics]);
  const avgLatency = useMemo(() => Math.round(metrics.reduce((acc, curr) => acc + curr.latency, 0) / metrics.length), [metrics]);

  const errorRate = ((totalErrors / totalRequests) * 100).toFixed(2);

  return (
    <div className="p-8 h-full overflow-y-auto">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Real-time Monitor</h2>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border border-gray-200 p-5 rounded-xl">
          <div className="text-gray-500 text-sm font-medium mb-1">Total Volume (24h)</div>
          <div className="text-3xl font-bold text-gray-900">{totalRequests.toLocaleString()}</div>
          <div className="text-emerald-400 text-xs mt-2">↑ 12% vs yesterday</div>
        </div>
        <div className="bg-white border border-gray-200 p-5 rounded-xl">
          <div className="text-gray-500 text-sm font-medium mb-1">Error Rate</div>
          <div className={`text-3xl font-bold ${parseFloat(errorRate) > 1 ? 'text-rose-500' : 'text-emerald-400'}`}>
            {errorRate}%
          </div>
          <div className="text-gray-400 text-xs mt-2">Threshold: 1.0%</div>
        </div>
        <div className="bg-white border border-gray-200 p-5 rounded-xl">
          <div className="text-gray-500 text-sm font-medium mb-1">Avg Latency</div>
          <div className="text-3xl font-bold text-blue-400">{avgLatency}ms</div>
          <div className="text-gray-400 text-xs mt-2">P95: {Math.round(avgLatency * 1.5)}ms</div>
        </div>
        <div className="bg-white border border-gray-200 p-5 rounded-xl">
          <div className="text-gray-500 text-sm font-medium mb-1">Active Partners</div>
          <div className="text-3xl font-bold text-indigo-400">4</div>
          <div className="text-gray-400 text-xs mt-2">All systems operational</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Volume Chart */}
        <Chart title="Traffic Volume" height={300}>
          <AreaChart data={metrics}>
            <defs>
              <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis dataKey="time" stroke={CHART_COLORS.axis} fontSize={12} tickLine={false} />
            <YAxis stroke={CHART_COLORS.axis} fontSize={12} tickLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Area type="monotone" dataKey="requests" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRequests)" />
          </AreaChart>
        </Chart>

        {/* Latency/Errors Mixed Chart */}
        <Chart title="Errors vs Latency" height={300}>
          <BarChart data={metrics}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis dataKey="time" stroke={CHART_COLORS.axis} fontSize={12} tickLine={false} />
            <YAxis yAxisId="left" stroke="#f43f5e" fontSize={12} tickLine={false} />
            <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={12} tickLine={false} />
            <Tooltip
              cursor={{fill: CHART_COLORS.cursor}}
              contentStyle={TOOLTIP_STYLE}
            />
            <Bar yAxisId="left" dataKey="errors" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="right" dataKey="latency" fill="#10b981" radius={[4, 4, 0, 0]} fillOpacity={0.5} />
          </BarChart>
        </Chart>
      </div>

       <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health Status</h3>
          <div className="flex gap-4 items-center text-sm text-gray-500">
             <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                BigQuery Ingest
             </div>
             <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                NestJS API
             </div>
             <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                Redis Cache
             </div>
          </div>
       </div>
    </div>
  );
};

export default Dashboard;
