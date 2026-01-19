'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Play,
  Trash2,
  Eye,
  RefreshCw,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  BarChart3,
  CalendarClock,
} from 'lucide-react';
import {
  batchAnalysisApi,
  BatchAnalysisJob,
  JobStatistics,
} from '@/services/batchAnalysisService';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import CreateJobModal from './components/CreateJobModal';

export default function BatchAnalysisPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<BatchAnalysisJob[]>([]);
  const [stats, setStats] = useState<JobStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<BatchAnalysisJob | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [jobsRes, statsRes] = await Promise.all([
        batchAnalysisApi.listJobs({ limit: 50 }),
        batchAnalysisApi.getStatistics(),
      ]);
      setJobs(jobsRes.jobs);
      setStats(statsRes);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds for running jobs
    const interval = setInterval(() => {
      if (jobs.some((j) => j.status === 'RUNNING')) {
        fetchData();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRunJob = async (jobId: string) => {
    try {
      setRunningJobId(jobId);
      await batchAnalysisApi.runJob(jobId);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to run job');
    } finally {
      setRunningJobId(null);
    }
  };

  const handleDeleteClick = (job: BatchAnalysisJob) => {
    setJobToDelete(job);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!jobToDelete) return;
    try {
      setIsDeleting(true);
      await batchAnalysisApi.deleteJob(jobToDelete.id);
      setJobs(jobs.filter((j) => j.id !== jobToDelete.id));
      setIsDeleteDialogOpen(false);
      setJobToDelete(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete job');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateSuccess = async () => {
    setIsCreateModalOpen(false);
    await fetchData();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'RUNNING':
        return <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />;
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'text-yellow-400 bg-yellow-950/30 border-yellow-500/30';
      case 'RUNNING':
        return 'text-cyan-400 bg-cyan-950/30 border-cyan-500/30';
      case 'COMPLETED':
        return 'text-green-400 bg-green-950/30 border-green-500/30';
      case 'FAILED':
        return 'text-red-400 bg-red-950/30 border-red-500/30';
      default:
        return 'text-slate-400 bg-slate-950/30 border-slate-500/30';
    }
  };

  if (loading && jobs.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-mono uppercase tracking-wider text-sm">
            Loading Batch Analysis...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-950 p-8">
      {/* Header */}
      <div className="mb-8 border-b border-slate-800 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-mono font-bold text-cyan-400 uppercase tracking-wider mb-2">
              Batch Analysis
            </h1>
            <p className="text-slate-400 font-mono text-sm">
              SYSTEM.ADMIN.BATCH_ANALYSIS // Daily Chat Quality Analysis Pipeline
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/dashboard/admin/batch-analysis/prompts')}
              className="
                flex items-center gap-2 px-4 py-3
                bg-slate-800 hover:bg-slate-700 border border-slate-700
                text-slate-300 font-mono font-bold uppercase tracking-wider text-sm
                transition-all
              "
            >
              <FileText className="w-4 h-4" />
              Prompts
            </button>
            <button
              onClick={() => router.push('/dashboard/admin/batch-analysis/schedules')}
              className="
                flex items-center gap-2 px-4 py-3
                bg-slate-800 hover:bg-slate-700 border border-violet-500/50
                text-violet-300 font-mono font-bold uppercase tracking-wider text-sm
                transition-all
              "
            >
              <CalendarClock className="w-4 h-4" />
              Schedules
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="
                flex items-center gap-2 px-6 py-3
                bg-cyan-600 hover:bg-cyan-700 border-2 border-cyan-500
                text-white font-mono font-bold uppercase tracking-wider text-sm
                transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40
              "
            >
              <Plus className="w-5 h-5" />
              Create Job
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 border-2 border-red-500/50 bg-red-950/30">
          <p className="text-red-400 font-mono text-sm">ERROR: {error}</p>
        </div>
      )}

      {/* Statistics */}
      {stats && (
        <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 border border-slate-800 bg-slate-900/30">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <p className="text-slate-500 font-mono text-xs uppercase tracking-wider">
                Total Jobs
              </p>
            </div>
            <p className="text-cyan-400 font-mono text-2xl font-bold">{stats.jobs.total}</p>
          </div>
          <div className="p-4 border border-slate-800 bg-slate-900/30">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="w-4 h-4 text-yellow-400" />
              <p className="text-slate-500 font-mono text-xs uppercase tracking-wider">
                Running
              </p>
            </div>
            <p className="text-yellow-400 font-mono text-2xl font-bold">{stats.jobs.running}</p>
          </div>
          <div className="p-4 border border-slate-800 bg-slate-900/30">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <p className="text-slate-500 font-mono text-xs uppercase tracking-wider">
                Completed
              </p>
            </div>
            <p className="text-green-400 font-mono text-2xl font-bold">{stats.jobs.completed}</p>
          </div>
          <div className="p-4 border border-slate-800 bg-slate-900/30">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <p className="text-slate-500 font-mono text-xs uppercase tracking-wider">
                Results
              </p>
            </div>
            <p className="text-emerald-400 font-mono text-2xl font-bold">
              {stats.results.success}/{stats.results.total}
            </p>
          </div>
        </div>
      )}

      {/* Jobs Table */}
      <div className="border-2 border-slate-800 bg-slate-900/50">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-slate-800 bg-slate-950/50">
                <th className="text-left px-6 py-4 font-mono text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-4 font-mono text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  Target Date
                </th>
                <th className="text-left px-6 py-4 font-mono text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  Tenant
                </th>
                <th className="text-left px-6 py-4 font-mono text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  Progress
                </th>
                <th className="text-left px-6 py-4 font-mono text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  Avg Score
                </th>
                <th className="text-left px-6 py-4 font-mono text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="text-right px-6 py-4 font-mono text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <p className="text-slate-500 font-mono text-sm">NO JOBS FOUND</p>
                    <p className="text-slate-600 font-mono text-xs mt-2">
                      Create a new job to start analyzing chat data
                    </p>
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr
                    key={job.id}
                    className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                  >
                    {/* Status */}
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 border ${getStatusColor(job.status)}`}>
                        {getStatusIcon(job.status)}
                        <span className="font-mono text-xs uppercase tracking-wider">
                          {job.status}
                        </span>
                      </div>
                    </td>

                    {/* Target Date */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-300 font-mono text-sm">
                          {new Date(job.targetDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: '2-digit',
                          })}
                        </span>
                      </div>
                    </td>

                    {/* Tenant */}
                    <td className="px-6 py-4">
                      <span className="text-slate-400 font-mono text-sm">
                        {job.tenantId || 'ALL TENANTS'}
                      </span>
                    </td>

                    {/* Progress */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 max-w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              job.status === 'COMPLETED' ? 'bg-green-500' :
                              job.status === 'FAILED' ? 'bg-red-500' :
                              job.status === 'RUNNING' ? 'bg-cyan-500' :
                              'bg-slate-600'
                            }`}
                            style={{
                              width: job.totalItems > 0
                                ? `${((job.processedItems + job.failedItems) / job.totalItems) * 100}%`
                                : '0%',
                            }}
                          />
                        </div>
                        <span className="text-slate-400 font-mono text-xs whitespace-nowrap">
                          {job.processedItems}/{job.totalItems}
                          {job.failedItems > 0 && (
                            <span className="text-red-400 ml-1">({job.failedItems} failed)</span>
                          )}
                        </span>
                      </div>
                    </td>

                    {/* Avg Score */}
                    <td className="px-6 py-4">
                      {job.scoreStats?.avgScore != null ? (
                        <div className="flex items-center gap-2">
                          <span className={`font-mono font-bold text-lg ${
                            job.scoreStats.avgScore >= 8 ? 'text-green-400' :
                            job.scoreStats.avgScore >= 6 ? 'text-yellow-400' :
                            'text-red-400'
                          }`}>
                            {job.scoreStats.avgScore.toFixed(1)}
                          </span>
                          <span className="text-slate-500 font-mono text-xs">
                            ({job.scoreStats.scoredCount})
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-600 font-mono text-xs">-</span>
                      )}
                    </td>

                    {/* Created */}
                    <td className="px-6 py-4">
                      <span className="text-slate-500 font-mono text-xs">
                        {new Date(job.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        {job.status === 'PENDING' && (
                          <button
                            onClick={() => handleRunJob(job.id)}
                            disabled={runningJobId === job.id}
                            className="
                              p-2 bg-green-800/30 hover:bg-green-600/30 border border-green-500/30 hover:border-green-500/50
                              text-green-400 transition-all disabled:opacity-50
                            "
                            title="Run Job"
                          >
                            {runningJobId === job.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => router.push(`/dashboard/admin/batch-analysis/${job.id}`)}
                          className="
                            p-2 bg-slate-800 hover:bg-cyan-600/20 border border-slate-700 hover:border-cyan-500/50
                            text-slate-400 hover:text-cyan-400 transition-all
                          "
                          title="View Results"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(job)}
                          disabled={job.status === 'RUNNING'}
                          className="
                            p-2 bg-slate-800 hover:bg-red-600/20 border border-slate-700 hover:border-red-500/50
                            text-slate-400 hover:text-red-400 transition-all disabled:opacity-50
                          "
                          title="Delete Job"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={fetchData}
          disabled={loading}
          className="
            flex items-center gap-2 px-4 py-2
            bg-slate-800 hover:bg-slate-700 border border-slate-700
            text-slate-400 font-mono text-xs uppercase tracking-wider
            transition-all disabled:opacity-50
          "
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Create Job Modal */}
      {isCreateModalOpen && (
        <CreateJobModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Job"
        message={`Are you sure you want to delete this job and all its results? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
