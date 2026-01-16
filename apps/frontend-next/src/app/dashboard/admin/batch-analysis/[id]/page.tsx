'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  RefreshCw,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Play,
} from 'lucide-react';
import {
  batchAnalysisApi,
  BatchAnalysisJob,
  BatchAnalysisResult,
} from '@/services/batchAnalysisService';

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [job, setJob] = useState<BatchAnalysisJob | null>(null);
  const [results, setResults] = useState<BatchAnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);
  const [runningJob, setRunningJob] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [jobData, resultsData] = await Promise.all([
        batchAnalysisApi.getJob(jobId),
        batchAnalysisApi.listResults({ jobId, limit: 100 }),
      ]);
      setJob(jobData);
      setResults(resultsData.results);
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
      await batchAnalysisApi.runJob(jobId);
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
        return <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin" />;
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <AlertCircle className="w-5 h-5 text-slate-400" />;
    }
  };

  const parseAnalysisResult = (result: string) => {
    try {
      return JSON.parse(result);
    } catch {
      return null;
    }
  };

  if (loading && !job) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-mono uppercase tracking-wider text-sm">
            Loading Job Data...
          </p>
        </div>
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 font-mono text-sm">{error}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 font-mono text-sm"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-950 p-8">
      {/* Header */}
      <div className="mb-8 border-b border-slate-800 pb-6">
        <button
          onClick={() => router.push('/dashboard/admin/batch-analysis')}
          className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 font-mono text-sm mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Jobs
        </button>

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {job && getStatusIcon(job.status)}
              <h1 className="text-2xl font-mono font-bold text-cyan-400 uppercase tracking-wider">
                Job Details
              </h1>
            </div>
            <p className="text-slate-400 font-mono text-sm">
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
                  text-white font-mono font-bold uppercase tracking-wider text-sm
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
                bg-slate-800 hover:bg-slate-700 border border-slate-700
                text-slate-300 font-mono text-sm uppercase tracking-wider
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
        <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 border border-slate-800 bg-slate-900/30">
            <p className="text-slate-500 font-mono text-xs uppercase tracking-wider mb-1">
              Status
            </p>
            <p className={`font-mono font-bold ${
              job.status === 'COMPLETED' ? 'text-green-400' :
              job.status === 'FAILED' ? 'text-red-400' :
              job.status === 'RUNNING' ? 'text-cyan-400' :
              'text-yellow-400'
            }`}>
              {job.status}
            </p>
          </div>
          <div className="p-4 border border-slate-800 bg-slate-900/30">
            <p className="text-slate-500 font-mono text-xs uppercase tracking-wider mb-1">
              Target Date
            </p>
            <p className="text-slate-200 font-mono">
              {new Date(job.targetDate).toLocaleDateString()}
            </p>
          </div>
          <div className="p-4 border border-slate-800 bg-slate-900/30">
            <p className="text-slate-500 font-mono text-xs uppercase tracking-wider mb-1">
              Progress
            </p>
            <p className="text-slate-200 font-mono">
              {job.processedItems}/{job.totalItems}
              {job.failedItems > 0 && (
                <span className="text-red-400 text-sm ml-1">
                  ({job.failedItems} failed)
                </span>
              )}
            </p>
          </div>
          <div className="p-4 border border-slate-800 bg-slate-900/30">
            <p className="text-slate-500 font-mono text-xs uppercase tracking-wider mb-1">
              Tenant
            </p>
            <p className="text-slate-200 font-mono">
              {job.tenantId || 'All Tenants'}
            </p>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {job && job.totalItems > 0 && (
        <div className="mb-8">
          <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                job.status === 'COMPLETED' ? 'bg-green-500' :
                job.status === 'FAILED' ? 'bg-red-500' :
                'bg-cyan-500'
              }`}
              style={{
                width: `${((job.processedItems + job.failedItems) / job.totalItems) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Results */}
      <div className="border-2 border-slate-800 bg-slate-900/50">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-mono font-bold text-cyan-400 uppercase tracking-wider">
            Analysis Results ({results.length})
          </h2>
        </div>

        {results.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-slate-500 font-mono text-sm">
              {job?.status === 'PENDING' ? 'Run the job to generate results' :
               job?.status === 'RUNNING' ? 'Processing... Results will appear here' :
               'No results found'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {results.map((result) => {
              const analysis = parseAnalysisResult(result.analysisResult);
              const isExpanded = expandedResult === result.id;

              return (
                <div key={result.id} className="hover:bg-slate-800/30 transition-colors">
                  {/* Summary Row */}
                  <div
                    className="px-6 py-4 cursor-pointer flex items-center gap-4"
                    onClick={() => setExpandedResult(isExpanded ? null : result.id)}
                  >
                    {/* Status */}
                    <div className="flex-shrink-0">
                      {result.status === 'SUCCESS' ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-4 mb-1">
                        <span className="text-slate-400 font-mono text-xs">
                          {result.tenantId}
                        </span>
                        <span className="text-slate-600">|</span>
                        <span className="text-slate-500 font-mono text-xs">
                          {new Date(result.originalTimestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-200 font-mono text-sm truncate">
                        {result.userInput.slice(0, 100)}
                        {result.userInput.length > 100 && '...'}
                      </p>
                    </div>

                    {/* Score */}
                    {analysis?.quality_score && (
                      <div className="flex-shrink-0 text-right">
                        <p className={`text-lg font-mono font-bold ${
                          analysis.quality_score >= 8 ? 'text-green-400' :
                          analysis.quality_score >= 6 ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {analysis.quality_score}/10
                        </p>
                        <p className="text-slate-500 font-mono text-xs">
                          {result.latencyMs}ms
                        </p>
                      </div>
                    )}

                    {/* Expand Icon */}
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-6 pb-6 space-y-4">
                      {/* User Input */}
                      <div>
                        <p className="text-slate-500 font-mono text-xs uppercase tracking-wider mb-2">
                          User Input
                        </p>
                        <div className="p-3 bg-slate-800 border border-slate-700 max-h-32 overflow-y-auto">
                          <p className="text-slate-200 font-mono text-sm whitespace-pre-wrap">
                            {result.userInput}
                          </p>
                        </div>
                      </div>

                      {/* LLM Response */}
                      <div>
                        <p className="text-slate-500 font-mono text-xs uppercase tracking-wider mb-2">
                          LLM Response
                        </p>
                        <div className="p-3 bg-slate-800 border border-slate-700 max-h-48 overflow-y-auto">
                          <p className="text-slate-200 font-mono text-sm whitespace-pre-wrap">
                            {result.llmResponse}
                          </p>
                        </div>
                      </div>

                      {/* Analysis Result */}
                      <div>
                        <p className="text-slate-500 font-mono text-xs uppercase tracking-wider mb-2">
                          Analysis Result
                        </p>
                        <div className="p-3 bg-slate-800 border border-slate-700 max-h-64 overflow-y-auto">
                          {result.status === 'FAILED' ? (
                            <p className="text-red-400 font-mono text-sm">
                              Error: {result.errorMessage || 'Unknown error'}
                            </p>
                          ) : analysis ? (
                            <pre className="text-slate-200 font-mono text-sm whitespace-pre-wrap">
                              {JSON.stringify(analysis, null, 2)}
                            </pre>
                          ) : (
                            <p className="text-slate-200 font-mono text-sm whitespace-pre-wrap">
                              {result.analysisResult}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-800">
                        <div>
                          <span className="text-slate-500 font-mono text-xs">Model:</span>
                          <span className="text-slate-300 font-mono text-xs ml-2">{result.modelName}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-mono text-xs">Latency:</span>
                          <span className="text-slate-300 font-mono text-xs ml-2">{result.latencyMs}ms</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-mono text-xs">Tokens:</span>
                          <span className="text-slate-300 font-mono text-xs ml-2">
                            {result.inputTokens} in / {result.outputTokens} out
                          </span>
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
    </div>
  );
}
