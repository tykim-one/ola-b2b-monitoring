'use client';

import React, { useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar 
} from 'recharts';
import { MetricData } from '@/types';

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
      <h2 className="text-3xl font-bold text-white mb-6">Real-time Monitor</h2>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl">
          <div className="text-slate-400 text-sm font-medium mb-1">Total Volume (24h)</div>
          <div className="text-3xl font-bold text-white">{totalRequests.toLocaleString()}</div>
          <div className="text-emerald-400 text-xs mt-2">↑ 12% vs yesterday</div>
        </div>
        <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl">
          <div className="text-slate-400 text-sm font-medium mb-1">Error Rate</div>
          <div className={`text-3xl font-bold ${parseFloat(errorRate) > 1 ? 'text-rose-500' : 'text-emerald-400'}`}>
            {errorRate}%
          </div>
          <div className="text-slate-500 text-xs mt-2">Threshold: 1.0%</div>
        </div>
        <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl">
          <div className="text-slate-400 text-sm font-medium mb-1">Avg Latency</div>
          <div className="text-3xl font-bold text-blue-400">{avgLatency}ms</div>
          <div className="text-slate-500 text-xs mt-2">P95: {Math.round(avgLatency * 1.5)}ms</div>
        </div>
        <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl">
          <div className="text-slate-400 text-sm font-medium mb-1">Active Partners</div>
          <div className="text-3xl font-bold text-indigo-400">4</div>
          <div className="text-slate-500 text-xs mt-2">All systems operational</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Volume Chart */}
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Traffic Volume</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics}>
                <defs>
                  <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }}
                  itemStyle={{ color: '#94a3b8' }}
                />
                <Area type="monotone" dataKey="requests" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRequests)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Latency/Errors Mixed Chart */}
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Errors vs Latency</h3>
           <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis yAxisId="left" stroke="#f43f5e" fontSize={12} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={12} tickLine={false} />
                <Tooltip 
                  cursor={{fill: '#1e293b'}}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }} 
                />
                <Bar yAxisId="left" dataKey="errors" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="latency" fill="#10b981" radius={[4, 4, 0, 0]} fillOpacity={0.5} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

       <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-4">System Health Status</h3>
          <div className="flex gap-4 items-center text-sm text-slate-400">
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
