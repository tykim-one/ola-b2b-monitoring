'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Play,
  Trash2,
  Eye,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileQuestion,
  Layers,
} from 'lucide-react';
import {
  faqAnalysisApi,
  FAQJob,
  CreateFAQJobRequest,
  getFAQTenants,
} from '@/services/faqAnalysisService';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

export default function FAQAnalysisTab() {
  const router = useRouter();
  const [jobs, setJobs] = useState<FAQJob[]>([]);
  const [tenants, setTenants] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<FAQJob | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);

  // Create form state
  const [createForm, setCreateForm] = useState<CreateFAQJobRequest>({
    periodDays: 7,
    topN: 10,
  });
  const [isCreating, setIsCreating] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [jobsRes, tenantsRes] = await Promise.all([
        faqAnalysisApi.getJobs(),
        getFAQTenants(30),
      ]);
      setJobs(jobsRes);
      setTenants(tenantsRes);
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
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRunJob = async (jobId: string) => {
    try {
      setRunningJobId(jobId);
      await faqAnalysisApi.runJob(jobId);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to run job');
    } finally {
      setRunningJobId(null);
    }
  };

  const handleDeleteClick = (job: FAQJob) => {
    setJobToDelete(job);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!jobToDelete) return;
    try {
      setIsDeleting(true);
      await faqAnalysisApi.deleteJob(jobToDelete.id);
      setJobs(jobs.filter((j) => j.id !== jobToDelete.id));
      setIsDeleteDialogOpen(false);
      setJobToDelete(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete job');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateJob = async () => {
    try {
      setIsCreating(true);
      await faqAnalysisApi.createJob(createForm);
      setIsCreateModalOpen(false);
      setCreateForm({ periodDays: 7, topN: 10 });
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create job');
    } finally {
      setIsCreating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'RUNNING':
        return <RefreshCw className="w-4 h-4 text-violet-400 animate-spin" />;
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'text-yellow-400 bg-yellow-950/30 border-yellow-500/30';
      case 'RUNNING':
        return 'text-violet-400 bg-violet-50 border-violet-500/30';
      case 'COMPLETED':
        return 'text-green-400 bg-green-50 border-green-500/30';
      case 'FAILED':
        return 'text-red-400 bg-red-50 border-red-500/30';
      default:
        return 'text-gray-500 bg-gray-50/30 border-gray-200';
    }
  };

  // Statistics
  const stats = {
    total: jobs.length,
    pending: jobs.filter((j) => j.status === 'PENDING').length,
    running: jobs.filter((j) => j.status === 'RUNNING').length,
    completed: jobs.filter((j) => j.status === 'COMPLETED').length,
    totalClusters: jobs.reduce((sum, j) => sum + (j.clusterCount || 0), 0),
  };

  if (loading && jobs.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto mb-4" />
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
          FAQ Clustering & Reason Analysis Pipeline
        </p>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="
            flex items-center gap-2 px-4 py-2
            bg-violet-600 hover:bg-violet-700 border border-violet-500
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
      <div className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 border border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2 mb-2">
            <FileQuestion className="w-4 h-4 text-violet-400" />
            <p className="text-gray-400 text-xs uppercase">Total Jobs</p>
          </div>
          <p className="text-violet-400 text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="p-4 border border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            <p className="text-gray-400 text-xs uppercase">Pending</p>
          </div>
          <p className="text-yellow-400 text-2xl font-bold">{stats.pending}</p>
        </div>
        <div className="p-4 border border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="w-4 h-4 text-violet-400" />
            <p className="text-gray-400 text-xs uppercase">Running</p>
          </div>
          <p className="text-violet-400 text-2xl font-bold">{stats.running}</p>
        </div>
        <div className="p-4 border border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <p className="text-gray-400 text-xs uppercase">Completed</p>
          </div>
          <p className="text-green-400 text-2xl font-bold">{stats.completed}</p>
        </div>
        <div className="p-4 border border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <p className="text-gray-400 text-xs uppercase">Clusters</p>
          </div>
          <p className="text-emerald-400 text-2xl font-bold">{stats.totalClusters}</p>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="border border-gray-200 bg-gray-50">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Top N
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Tenant
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Questions
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Clusters
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="text-right px-4 py-3 text-xs font-bold text-violet-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center">
                    <p className="text-gray-400 text-sm">NO JOBS FOUND</p>
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr
                    key={job.id}
                    className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className={`inline-flex items-center gap-2 px-2 py-1 border ${getStatusColor(job.status)}`}>
                        {getStatusIcon(job.status)}
                        <span className="text-xs uppercase">{job.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-600 text-sm">{job.periodDays}일</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-600 text-sm">{job.topN}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-500 text-sm">
                        {job.tenantId || 'ALL'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-600 text-sm">
                        {job.totalQuestions?.toLocaleString() || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-mono font-bold">
                          {job.clusterCount || '-'}
                        </span>
                        {job.llmMergeApplied && (
                          <span className="text-purple-400 text-xs" title="LLM 병합 적용됨">
                            <Layers className="w-3 h-3" />
                          </span>
                        )}
                      </div>
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
                        {job.status === 'PENDING' && (
                          <button
                            onClick={() => handleRunJob(job.id)}
                            disabled={runningJobId === job.id}
                            className="p-2 bg-green-800/30 hover:bg-green-600/30 border border-green-500/30 text-green-400 transition-all disabled:opacity-50"
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
                          onClick={() => router.push(`/dashboard/admin/batch-analysis/faq/${job.id}`)}
                          className="p-2 bg-white hover:bg-violet-600/20 border border-gray-200 text-gray-500 hover:text-violet-400 transition-all"
                          title="View Results"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(job)}
                          disabled={job.status === 'RUNNING'}
                          className="p-2 bg-white hover:bg-red-600/20 border border-gray-200 text-gray-500 hover:text-red-400 transition-all disabled:opacity-50"
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
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-100 border border-gray-200 text-gray-500 text-xs uppercase transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Create Job Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white border border-gray-200 p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Create FAQ Analysis Job
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-500 text-xs uppercase mb-2">
                  Period (Days)
                </label>
                <select
                  value={createForm.periodDays}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, periodDays: Number(e.target.value) as 7 | 14 | 30 })
                  }
                  className="w-full bg-white border border-gray-200 text-gray-600 px-3 py-2 font-mono"
                >
                  <option value={7}>7 Days</option>
                  <option value={14}>14 Days</option>
                  <option value={30}>30 Days</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-500 text-xs uppercase mb-2">
                  Top N
                </label>
                <select
                  value={createForm.topN}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, topN: Number(e.target.value) as 10 | 20 | 50 })
                  }
                  className="w-full bg-white border border-gray-200 text-gray-600 px-3 py-2 font-mono"
                >
                  <option value={10}>Top 10</option>
                  <option value={20}>Top 20</option>
                  <option value={50}>Top 50</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-500 text-xs uppercase mb-2">
                  Tenant (Optional)
                </label>
                <select
                  value={createForm.tenantId || ''}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      tenantId: e.target.value || undefined,
                    })
                  }
                  className="w-full bg-white border border-gray-200 text-gray-600 px-3 py-2 font-mono"
                >
                  <option value="">All Tenants</option>
                  {tenants.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-500 text-sm uppercase"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateJob}
                disabled={isCreating}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 border border-violet-500 text-white text-sm font-medium disabled:opacity-50"
              >
                {isCreating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
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
