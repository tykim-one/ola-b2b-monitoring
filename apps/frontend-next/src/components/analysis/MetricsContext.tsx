'use client';

import { RealtimeKPI, TenantUsage, CostTrend } from '@ola/shared-types';
import { useEffect, useState } from 'react';

interface MetricsContextProps {
  isVisible: boolean;
  onToggle: () => void;
}

export default function MetricsContext({ isVisible, onToggle }: MetricsContextProps) {
  const [kpi, setKpi] = useState<RealtimeKPI | null>(null);
  const [topTenants, setTopTenants] = useState<TenantUsage[]>([]);
  const [costData, setCostData] = useState<CostTrend[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isVisible) {
      fetchMetrics();
    }
  }, [isVisible]);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      // Fetch realtime KPI
      const kpiRes = await fetch('/api/metrics/realtime');
      const kpiData = await kpiRes.json();
      setKpi(kpiData.data);

      // Fetch top 5 tenants
      const tenantRes = await fetch('/api/analytics/tenant-usage?limit=5');
      const tenantData = await tenantRes.json();
      setTopTenants(tenantData.data);

      // Fetch recent cost trend (last 7 days)
      const costRes = await fetch('/api/analytics/cost-trend?days=7');
      const costData = await costRes.json();
      setCostData(costData.data);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="fixed top-20 right-4 bg-gradient-to-br from-purple-600 to-purple-700 text-white px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all hover:scale-105 z-10"
      >
        Show Metrics Context
      </button>
    );
  }

  return (
    <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col h-screen fixed right-0 top-0 shadow-2xl z-10">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <h2 className="text-lg font-bold text-white">Metrics Context</h2>
        <button
          onClick={onToggle}
          className="text-slate-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* KPI Summary */}
            {kpi && (
              <section>
                <h3 className="text-sm font-semibold text-slate-400 mb-3">Realtime KPI</h3>
                <div className="bg-slate-900 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Total Requests</span>
                    <span className="text-sm font-bold text-white">{kpi.total_requests.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Success Rate</span>
                    <span className="text-sm font-bold text-green-400">
                      {((kpi.success_count / kpi.total_requests) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Total Tokens</span>
                    <span className="text-sm font-bold text-blue-400">{kpi.total_tokens.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Active Tenants</span>
                    <span className="text-sm font-bold text-purple-400">{kpi.active_tenants}</span>
                  </div>
                </div>
              </section>
            )}

            {/* Top Tenants */}
            {topTenants.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-slate-400 mb-3">Top Tenants</h3>
                <div className="space-y-2">
                  {topTenants.map((tenant, i) => (
                    <div key={tenant.tenant_id} className="bg-slate-900 rounded-lg p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono text-slate-300">{tenant.tenant_id}</span>
                        <span className="text-xs text-slate-500">#{i + 1}</span>
                      </div>
                      <div className="text-xs text-slate-400">
                        {tenant.request_count.toLocaleString()} reqs • {tenant.total_tokens.toLocaleString()} tokens
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Cost Trend */}
            {costData.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-slate-400 mb-3">7-Day Cost Trend</h3>
                <div className="bg-slate-900 rounded-lg p-3">
                  <div className="flex justify-between mb-2">
                    <span className="text-xs text-slate-500">Total Cost</span>
                    <span className="text-sm font-bold text-yellow-400">
                      ${costData.reduce((sum, c) => sum + c.total_cost, 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {costData.slice(-3).map((cost) => (
                      <div key={cost.date} className="flex justify-between text-xs">
                        <span className="text-slate-600">{new Date(cost.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        <span className="text-slate-400">${cost.total_cost.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700">
        <button
          onClick={fetchMetrics}
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 text-white text-sm py-2 rounded-lg transition-colors"
        >
          {loading ? 'Refreshing...' : 'Refresh Metrics'}
        </button>
      </div>
    </div>
  );
}
