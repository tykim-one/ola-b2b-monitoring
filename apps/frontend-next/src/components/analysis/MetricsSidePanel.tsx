'use client';

import { RealtimeKPI, TenantUsage, CostTrend } from '@ola/shared-types';
import { useRealtimeKPI, useTenantUsage, useCostTrend } from '@/hooks/queries';

interface MetricsSidePanelProps {
  isVisible: boolean;
  onToggle: () => void;
  projectId?: string;
}

export default function MetricsSidePanel({ isVisible, onToggle, projectId = 'ibks' }: MetricsSidePanelProps) {
  const { data: kpi, isLoading: kpiLoading, refetch: refetchKpi } = useRealtimeKPI(
    projectId, undefined, { enabled: isVisible }
  );
  const { data: allTenants = [], isLoading: tenantsLoading, refetch: refetchTenants } = useTenantUsage(
    projectId, undefined, { enabled: isVisible }
  );
  const topTenants = allTenants.slice(0, 5);
  const { data: costData = [], isLoading: costLoading, refetch: refetchCost } = useCostTrend(
    projectId, 7, { enabled: isVisible }
  );

  const loading = kpiLoading || tenantsLoading || costLoading;
  const handleRefresh = () => { refetchKpi(); refetchTenants(); refetchCost(); };

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="fixed top-20 right-4 bg-gradient-to-br from-purple-600 to-purple-700 text-gray-900 px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all hover:scale-105 z-10"
      >
        Show Metrics Context
      </button>
    );
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-screen fixed right-0 top-0 shadow-2xl z-10">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900">Metrics Context</h2>
        <button
          onClick={onToggle}
          className="text-gray-500 hover:text-gray-900 transition-colors"
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
                <h3 className="text-sm font-semibold text-gray-500 mb-3">Realtime KPI</h3>
                <div className="bg-white rounded-lg p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-400">Total Requests</span>
                    <span className="text-sm font-bold text-gray-900">{kpi.total_requests.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-400">Success Rate</span>
                    <span className="text-sm font-bold text-green-400">
                      {((kpi.success_count / kpi.total_requests) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-400">Total Tokens</span>
                    <span className="text-sm font-bold text-blue-400">{kpi.total_tokens.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-400">Active Tenants</span>
                    <span className="text-sm font-bold text-purple-400">{kpi.active_tenants}</span>
                  </div>
                </div>
              </section>
            )}

            {/* Top Tenants */}
            {topTenants.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-gray-500 mb-3">Top Tenants</h3>
                <div className="space-y-2">
                  {topTenants.map((tenant, i) => (
                    <div key={tenant.tenant_id} className="bg-white rounded-lg p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono text-gray-600">{tenant.tenant_id}</span>
                        <span className="text-xs text-gray-400">#{i + 1}</span>
                      </div>
                      <div className="text-xs text-gray-500">
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
                <h3 className="text-sm font-semibold text-gray-500 mb-3">7-Day Cost Trend</h3>
                <div className="bg-white rounded-lg p-3">
                  <div className="flex justify-between mb-2">
                    <span className="text-xs text-gray-400">Total Cost</span>
                    <span className="text-sm font-bold text-yellow-400">
                      ${costData.reduce((sum, c) => sum + c.total_cost, 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {costData.slice(-3).map((cost) => (
                      <div key={cost.date} className="flex justify-between text-xs">
                        <span className="text-gray-400">{new Date(cost.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        <span className="text-gray-500">${cost.total_cost.toFixed(2)}</span>
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
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-100 text-gray-900 text-sm py-2 rounded-lg transition-colors"
        >
          {loading ? 'Refreshing...' : 'Refresh Metrics'}
        </button>
      </div>
    </div>
  );
}
