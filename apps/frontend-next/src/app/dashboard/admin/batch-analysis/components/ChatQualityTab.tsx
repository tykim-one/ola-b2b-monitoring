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
  AlertTriangle,
  BarChart3,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  StopCircle,
  Ban,
} from 'lucide-react';
import {
  batchAnalysisApi,
  BatchAnalysisJob,
  JobStatistics,
} from '@/services/batchAnalysisService';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import CreateJobModal from './CreateJobModal';

export default function ChatQualityTab() {
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
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [cancellingJobId, setCancellingJobId] = useState<string | null>(null);

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

  const handleCancelJob = async (jobId: string) => {
    if (!confirm('정말 이 작업을 정지하시겠습니까?')) return;

    try {
      setCancellingJobId(jobId);
      await batchAnalysisApi.cancelJob(jobId);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel job');
    } finally {
      setCancellingJobId(null);
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
      case 'CANCELLED':
        return <Ban className="w-4 h-4 text-orange-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'text-yellow-400 bg-yellow-950/30 border-yellow-500/30';
      case 'RUNNING':
        return 'text-cyan-400 bg-cyan-50 border-cyan-500/30';
      case 'COMPLETED':
        return 'text-green-400 bg-green-50 border-green-500/30';
      case 'FAILED':
        return 'text-red-400 bg-red-50 border-red-500/30';
      case 'CANCELLED':
        return 'text-orange-400 bg-orange-950/30 border-orange-500/30';
      default:
        return 'text-gray-500 bg-gray-50/30 border-gray-200';
    }
  };

  if (loading && jobs.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
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
          Daily Chat Quality Analysis Pipeline
        </p>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="
            flex items-center gap-2 px-4 py-2
            bg-blue-600 hover:bg-blue-700 border border-blue-500
            text-white font-medium text-xs
            transition-all
          "
        >
          <Plus className="w-4 h-4" />
          Create Job
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 border border-red-500/50 bg-red-50">
          <p className="text-red-400 text-sm">ERROR: {error}</p>
        </div>
      )}

      {/* Statistics */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-4 border border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <p className="text-gray-400 text-xs uppercase">Total Jobs</p>
            </div>
            <p className="text-cyan-400 text-2xl font-bold">{stats.jobs.total}</p>
          </div>
          <div className="p-4 border border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="w-4 h-4 text-yellow-400" />
              <p className="text-gray-400 text-xs uppercase">Running</p>
            </div>
            <p className="text-yellow-400 text-2xl font-bold">{stats.jobs.running}</p>
          </div>
          <div className="p-4 border border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <p className="text-gray-400 text-xs uppercase">Completed</p>
            </div>
            <p className="text-green-400 text-2xl font-bold">{stats.jobs.completed}</p>
          </div>
          <div className="p-4 border border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-4 h-4 text-red-400" />
              <p className="text-gray-400 text-xs uppercase">Failed</p>
            </div>
            <p className="text-red-400 text-2xl font-bold">{stats.jobs.failed}</p>
          </div>
          <div className="p-4 border border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <p className="text-gray-400 text-xs uppercase">Results</p>
            </div>
            <p className="text-emerald-400 text-2xl font-bold">
              {stats.results.success}/{stats.results.total}
            </p>
          </div>
        </div>
      )}

      {/* Jobs Table */}
      <div className="border border-gray-200 bg-gray-50">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">
                  Target Date
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">
                  Tenant
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">
                  Progress
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">
                  Avg Score
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">
                  Created
                </th>
                <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <p className="text-gray-400 text-sm">NO JOBS FOUND</p>
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <React.Fragment key={job.id}>
                    <tr
                      onClick={() => {
                        if (job.status === 'FAILED' && job.errorMessage) {
                          setExpandedJobId(expandedJobId === job.id ? null : job.id);
                        }
                      }}
                      className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${
                        job.status === 'FAILED' && job.errorMessage ? 'cursor-pointer' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`inline-flex items-center gap-2 px-2 py-1 border ${getStatusColor(job.status)}`}>
                            {getStatusIcon(job.status)}
                            <span className="text-xs uppercase">{job.status}</span>
                          </div>
                          {job.status === 'FAILED' && job.errorMessage && (
                            expandedJobId === job.id ? (
                              <ChevronUp className="w-4 h-4 text-red-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-red-400" />
                            )
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600 text-sm">
                            {new Date(job.targetDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: '2-digit',
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-500 text-sm">
                          {job.tenantId || 'ALL'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 max-w-24 h-2 bg-white rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                job.status === 'COMPLETED' ? 'bg-green-500' :
                                job.status === 'FAILED' ? 'bg-red-500' :
                                job.status === 'RUNNING' ? 'bg-cyan-500' : 'bg-gray-300'
                              }`}
                              style={{
                                width: job.totalItems > 0
                                  ? `${((job.processedItems + job.failedItems) / job.totalItems) * 100}%`
                                  : '0%',
                              }}
                            />
                          </div>
                          <span className="text-gray-500 text-xs">
                            {job.processedItems}/{job.totalItems}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {job.scoreStats?.avgScore != null ? (
                          <span className={`font-mono font-bold ${
                            job.scoreStats.avgScore >= 8 ? 'text-green-400' :
                            job.scoreStats.avgScore >= 6 ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {job.scoreStats.avgScore.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-400 text-xs">
                          {new Date(job.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {/* 실행/재시도 버튼: PENDING, FAILED, CANCELLED */}
                          {(job.status === 'PENDING' || job.status === 'FAILED' || job.status === 'CANCELLED') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRunJob(job.id);
                              }}
                              disabled={runningJobId === job.id}
                              className={`p-2 border transition-all disabled:opacity-50 ${
                                job.status === 'FAILED' || job.status === 'CANCELLED'
                                  ? 'bg-orange-800/30 hover:bg-orange-600/30 border-orange-500/30 text-orange-400'
                                  : 'bg-green-800/30 hover:bg-green-600/30 border-green-500/30 text-green-400'
                              }`}
                              title={job.status === 'FAILED' || job.status === 'CANCELLED' ? 'Retry Job' : 'Run Job'}
                            >
                              {runningJobId === job.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : job.status === 'FAILED' || job.status === 'CANCELLED' ? (
                                <RotateCcw className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          {/* 정지 버튼: RUNNING */}
                          {job.status === 'RUNNING' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelJob(job.id);
                              }}
                              disabled={cancellingJobId === job.id}
                              className="p-2 bg-red-800/30 hover:bg-red-600/30 border border-red-500/30 text-red-400 transition-all disabled:opacity-50"
                              title="Stop Job"
                            >
                              {cancellingJobId === job.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <StopCircle className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/admin/batch-analysis/${job.id}`);
                            }}
                            className="p-2 bg-white hover:bg-cyan-600/20 border border-gray-200 text-gray-500 hover:text-cyan-400 transition-all"
                            title="View Results"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(job);
                            }}
                            disabled={job.status === 'RUNNING'}
                            className="p-2 bg-white hover:bg-red-600/20 border border-gray-200 text-gray-500 hover:text-red-400 transition-all disabled:opacity-50"
                            title="Delete Job"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* 에러 상세 패널 */}
                    {expandedJobId === job.id && job.errorMessage && (
                      <tr>
                        <td colSpan={7} className="px-4 py-4 bg-red-50/20 border-b border-red-500/30">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-red-400 text-xs uppercase font-bold mb-2">
                                Error Details
                              </p>
                              <pre className="text-gray-600 text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded border border-gray-200">
                                {job.errorMessage}
                              </pre>
                              <p className="text-gray-400 text-xs mt-2">
                                Click the retry button to run this job again. Previous results will be deleted.
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-100 border border-gray-200 text-gray-500 text-xs uppercase transition-all disabled:opacity-50"
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
        message="Are you sure you want to delete this job and all its results?"
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
