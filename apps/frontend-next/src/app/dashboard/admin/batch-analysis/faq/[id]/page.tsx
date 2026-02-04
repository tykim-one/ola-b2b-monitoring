'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Play,
  FileQuestion,
  Layers,
  MessageSquare,
} from 'lucide-react';
import {
  faqAnalysisApi,
  FAQJob,
  FAQJobResult,
} from '@/services/faqAnalysisService';

export default function FAQJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.id as string;

  const [job, setJob] = useState<FAQJob | null>(null);
  const [results, setResults] = useState<FAQJobResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);
  const [runningJob, setRunningJob] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [jobData, resultsData] = await Promise.all([
        faqAnalysisApi.getJob(jobId),
        faqAnalysisApi.getJobResults(jobId),
      ]);
      setJob(jobData);
      setResults(resultsData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load job data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh if job is running
    const interval = setInterval(() => {
      if (job?.status === 'RUNNING') {
        fetchData();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [jobId, job?.status]);

  const handleRunJob = async () => {
    try {
      setRunningJob(true);
      await faqAnalysisApi.runJob(jobId);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to run job');
    } finally {
      setRunningJob(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      case 'RUNNING':
        return <RefreshCw className="w-5 h-5 text-violet-400 animate-spin" />;
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'text-yellow-400';
      case 'RUNNING':
        return 'text-violet-400';
      case 'COMPLETED':
        return 'text-green-400';
      case 'FAILED':
        return 'text-red-400';
      default:
        return 'text-gray-500';
    }
  };

  if (loading && !job) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-mono uppercase tracking-wider text-sm">
            Loading FAQ Job...
          </p>
        </div>
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8 border-b border-gray-200 pb-6">
        <button
          onClick={() => router.push('/dashboard/admin/batch-analysis')}
          className="flex items-center gap-2 text-gray-500 hover:text-violet-400 text-sm mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Batch Analysis
        </button>

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {job && getStatusIcon(job.status)}
              <h1 className="text-2xl font-bold text-gray-900">
                FAQ Job Details
              </h1>
            </div>
            <p className="text-gray-500 text-sm">
              ID: {jobId.slice(0, 8)}...
            </p>
          </div>
          <div className="flex gap-3">
            {job?.status === 'PENDING' && (
              <button
                onClick={handleRunJob}
                disabled={runningJob}
                className="
                  flex items-center gap-2 px-6 py-3
                  bg-green-600 hover:bg-green-700 border-2 border-green-500
                  text-gray-900 font-mono font-bold uppercase tracking-wider text-sm
                  transition-all disabled:opacity-50
                "
              >
                {runningJob ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Run Job
              </button>
            )}
            <button
              onClick={fetchData}
              disabled={loading}
              className="
                flex items-center gap-2 px-4 py-3
                bg-white hover:bg-gray-100 border border-gray-200
                text-gray-600 text-sm uppercase tracking-wider
                transition-all disabled:opacity-50
              "
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Job Info */}
      {job && (
        <div className="mb-8 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="p-4 border border-gray-200 bg-gray-50">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">
              Status
            </p>
            <p className={`font-mono font-bold ${getStatusColor(job.status)}`}>
              {job.status}
            </p>
          </div>
          <div className="p-4 border border-gray-200 bg-gray-50">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">
              Period
            </p>
            <p className="text-gray-700 font-mono">{job.periodDays}일</p>
          </div>
          <div className="p-4 border border-gray-200 bg-gray-50">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">
              Top N
            </p>
            <p className="text-gray-700 font-mono">{job.topN}</p>
          </div>
          <div className="p-4 border border-gray-200 bg-gray-50">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">
              Tenant
            </p>
            <p className="text-gray-700 font-mono">
              {job.tenantId || 'All Tenants'}
            </p>
          </div>
          <div className="p-4 border border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2 mb-1">
              <FileQuestion className="w-3 h-3 text-violet-400" />
              <p className="text-gray-400 text-xs uppercase tracking-wider">
                Questions
              </p>
            </div>
            <p className="text-violet-400 font-mono font-bold">
              {job.totalQuestions?.toLocaleString() || '-'}
            </p>
          </div>
          <div className="p-4 border border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2 mb-1">
              <Layers className="w-3 h-3 text-emerald-400" />
              <p className="text-gray-400 text-xs uppercase tracking-wider">
                Clusters
              </p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-emerald-400 font-mono font-bold">
                {job.clusterCount || '-'}
              </p>
              {job.llmMergeApplied && (
                <span className="text-purple-400 text-xs" title="LLM Merge Applied">
                  <Layers className="w-3 h-3" />
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {job?.errorMessage && (
        <div className="mb-6 p-4 border border-red-500/50 bg-red-50">
          <p className="text-red-400 text-sm">ERROR: {job.errorMessage}</p>
        </div>
      )}

      {/* Results */}
      <div className="border border-gray-200 bg-gray-50">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">
            FAQ Clusters ({results.length})
          </h2>
        </div>

        {results.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-400 text-sm">
              {job?.status === 'PENDING'
                ? 'Run the job to generate clusters'
                : job?.status === 'RUNNING'
                ? 'Processing... Results will appear here'
                : 'No clusters found'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {results.map((result) => {
              const isExpanded = expandedResult === result.id;
              const questions = result.questions || [];

              return (
                <div key={result.id} className="hover:bg-gray-50/50 transition-colors">
                  {/* Summary Row */}
                  <div
                    className="px-6 py-4 cursor-pointer flex items-center gap-4"
                    onClick={() => setExpandedResult(isExpanded ? null : result.id)}
                  >
                    {/* Rank */}
                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-violet-600/20 border border-violet-500/30 rounded">
                      <span className="text-violet-400 font-mono font-bold">
                        #{result.rank}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-700 text-sm mb-1">
                        {result.representativeQuestion}
                      </p>
                      <div className="flex items-center gap-4">
                        <span className="text-gray-400 text-xs">
                          Frequency: <span className="text-emerald-400 font-bold">{result.frequency}</span>
                        </span>
                        {result.isMerged && (
                          <span className="flex items-center gap-1 text-purple-400 text-xs">
                            <Layers className="w-3 h-3" />
                            LLM Merged
                          </span>
                        )}
                        <span className="text-gray-400 text-xs">
                          {questions.length} variations
                        </span>
                      </div>
                    </div>

                    {/* Expand Icon */}
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-6 pb-6 space-y-4">
                      {/* Reason Analysis */}
                      <div>
                        <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">
                          Reason Analysis
                        </p>
                        <div className="p-3 bg-violet-50 border border-violet-500/30">
                          <p className="text-violet-200 text-sm">
                            {result.reasonAnalysis || 'No analysis available'}
                          </p>
                        </div>
                      </div>

                      {/* Questions List */}
                      <div>
                        <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">
                          Included Questions ({questions.length})
                        </p>
                        <div className="border border-gray-200 divide-y divide-gray-200 max-h-64 overflow-y-auto">
                          {questions.map((q, idx) => (
                            <div
                              key={idx}
                              className="px-3 py-2 flex items-center justify-between bg-gray-50/50"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <MessageSquare className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                <span className="text-gray-700 text-sm truncate">
                                  {q.text}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                                <span className="text-emerald-400 text-xs font-bold">
                                  {q.count}회
                                </span>
                                <span className="text-gray-400 text-xs">
                                  {q.tenantId}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Timestamps */}
      {job && (
        <div className="mt-4 flex flex-wrap gap-4 text-gray-400 text-xs">
          <span>Created: {new Date(job.createdAt).toLocaleString()}</span>
          {job.startedAt && <span>Started: {new Date(job.startedAt).toLocaleString()}</span>}
          {job.completedAt && <span>Completed: {new Date(job.completedAt).toLocaleString()}</span>}
        </div>
      )}
    </div>
  );
}
