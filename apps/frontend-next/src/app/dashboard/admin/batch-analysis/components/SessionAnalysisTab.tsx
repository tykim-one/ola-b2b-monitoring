'use client';

import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  TrendingUp,
  Users,
  Clock,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  sessionAnalysisApi,
  SessionStats,
  SessionListItem,
  SessionFilter,
} from '@/services/sessionAnalysisService';
import SessionTimelineModal from '@/components/session-analysis/SessionTimelineModal';
import KPICard from '@/components/kpi/KPICard';
import { StatusBadge } from '@/components/ui/StatusBadge';

export default function SessionAnalysisTab() {
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [tenants, setTenants] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [days, setDays] = useState(7);
  const [tenantId, setTenantId] = useState<string>('');
  const [isResolved, setIsResolved] = useState<string>('');
  const [hasFrustration, setHasFrustration] = useState<string>('');
  const [page, setPage] = useState(0);
  const limit = 20;

  // Modal
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const filter: SessionFilter = {
        days,
        tenantId: tenantId || undefined,
        isResolved: isResolved === '' ? undefined : isResolved === 'true',
        hasFrustration: hasFrustration === '' ? undefined : hasFrustration === 'true',
        limit,
        offset: page * limit,
      };

      const [statsData, sessionsData, tenantsData] = await Promise.all([
        sessionAnalysisApi.getStats({ days, tenantId: tenantId || undefined }),
        sessionAnalysisApi.getSessions(filter),
        sessionAnalysisApi.getTenants(days),
      ]);

      setStats(statsData);
      setSessions(sessionsData.sessions);
      setTotal(sessionsData.total);
      setTenants(tenantsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [days, tenantId, isResolved, hasFrustration, page]);

  const handleViewTimeline = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSessionId(null);
  };

  const totalPages = Math.ceil(total / limit);

  if (loading && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-500 text-sm">
          Session Resolution Analysis (Real-time + Heuristic)
        </p>
        <button
          onClick={fetchData}
          disabled={loading}
          className="
            flex items-center gap-2 px-4 py-2
            bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800
            text-gray-900 text-sm font-bold uppercase
            transition-colors
          "
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-500/30 p-4 rounded mb-6">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <KPICard
            title="Resolution Rate"
            value={stats.resolutionRate}
            format="percentage"
            status="success"
            icon={<TrendingUp className="w-5 h-5" />}
            subtitle={`${stats.resolvedSessions} / ${stats.totalSessions} sessions`}
          />
          <KPICard
            title="Avg Turns"
            value={stats.avgTurnsToResolution || '-'}
            icon={<MessageSquare className="w-5 h-5" />}
            subtitle="turns to resolution"
          />
          <KPICard
            title="Abandonment"
            value={stats.abandonmentRate}
            format="percentage"
            status={stats.abandonmentRate > 20 ? 'error' : stats.abandonmentRate > 10 ? 'warning' : 'success'}
            icon={<AlertTriangle className="w-5 h-5" />}
            subtitle={`${stats.frustratedSessions} frustrated sessions`}
          />
          <KPICard
            title="Avg Duration"
            value={stats.avgSessionDuration || '-'}
            icon={<Clock className="w-5 h-5" />}
            subtitle="minutes per session"
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50/50 border border-gray-200 rounded">
        <div>
          <label className="block text-gray-400 text-xs uppercase mb-1">Period</label>
          <select
            value={days}
            onChange={(e) => { setDays(Number(e.target.value)); setPage(0); }}
            className="
              bg-white border border-gray-300 text-gray-700
              px-3 py-2 text-sm rounded
            "
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </div>

        <div>
          <label className="block text-gray-400 text-xs uppercase mb-1">Tenant</label>
          <select
            value={tenantId}
            onChange={(e) => { setTenantId(e.target.value); setPage(0); }}
            className="
              bg-white border border-gray-300 text-gray-700
              px-3 py-2 text-sm rounded min-w-[150px]
            "
          >
            <option value="">All Tenants</option>
            {tenants.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-gray-400 text-xs uppercase mb-1">Resolution</label>
          <select
            value={isResolved}
            onChange={(e) => { setIsResolved(e.target.value); setPage(0); }}
            className="
              bg-white border border-gray-300 text-gray-700
              px-3 py-2 text-sm rounded
            "
          >
            <option value="">All</option>
            <option value="true">Resolved</option>
            <option value="false">Unresolved</option>
          </select>
        </div>

        <div>
          <label className="block text-gray-400 text-xs uppercase mb-1">Frustration</label>
          <select
            value={hasFrustration}
            onChange={(e) => { setHasFrustration(e.target.value); setPage(0); }}
            className="
              bg-white border border-gray-300 text-gray-700
              px-3 py-2 text-sm rounded
            "
          >
            <option value="">All</option>
            <option value="true">With Frustration</option>
            <option value="false">No Frustration</option>
          </select>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-gray-50/50 border border-gray-200 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 text-xs uppercase">
                  Session ID
                </th>
                <th className="text-left px-4 py-3 text-gray-500 text-xs uppercase">
                  Tenant
                </th>
                <th className="text-center px-4 py-3 text-gray-500 text-xs uppercase">
                  Turns
                </th>
                <th className="text-center px-4 py-3 text-gray-500 text-xs uppercase">
                  Status
                </th>
                <th className="text-center px-4 py-3 text-gray-500 text-xs uppercase">
                  Duration
                </th>
                <th className="text-left px-4 py-3 text-gray-500 text-xs uppercase">
                  Start Time
                </th>
                <th className="text-center px-4 py-3 text-gray-500 text-xs uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400 font-mono">
                    No sessions found
                  </td>
                </tr>
              ) : (
                sessions.map((session) => (
                  <tr
                    key={session.sessionId}
                    className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="text-gray-600 text-sm">
                        {session.sessionId.slice(0, 16)}...
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-cyan-400 text-sm">{session.tenantId}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-gray-700 font-mono">{session.turnCount}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <StatusBadge
                          label={session.isResolved ? 'Resolved' : 'Unresolved'}
                          variant={session.isResolved ? 'success' : 'error'}
                          icon={session.isResolved ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        />
                        {session.hasFrustration && (
                          <span title="Frustration detected">
                            <AlertTriangle className="w-4 h-4 text-amber-400" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-gray-600 text-sm">
                        {session.durationMinutes}m
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-500 text-xs">
                        {new Date(session.sessionStart).toLocaleString('ko-KR')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleViewTimeline(session.sessionId)}
                        className="
                          p-2 bg-gray-100 hover:bg-gray-200
                          text-gray-600 rounded transition-colors
                        "
                        title="View Timeline"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-gray-400 text-sm">
              Showing {page * limit + 1}-{Math.min((page + 1) * limit, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="
                  p-2 bg-gray-100 hover:bg-gray-200 disabled:bg-white disabled:text-gray-400
                  text-gray-600 rounded transition-colors
                "
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-gray-500 text-sm">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="
                  p-2 bg-gray-100 hover:bg-gray-200 disabled:bg-white disabled:text-gray-400
                  text-gray-600 rounded transition-colors
                "
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Timeline Modal */}
      {selectedSessionId && (
        <SessionTimelineModal
          sessionId={selectedSessionId}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
