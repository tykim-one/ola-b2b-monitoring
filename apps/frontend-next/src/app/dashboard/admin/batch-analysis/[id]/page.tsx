'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Filter,
  X,
} from 'lucide-react';
import {
  batchAnalysisApi,
  BatchAnalysisJob,
  BatchAnalysisResult,
} from '@/services/batchAnalysisService';
import { MarkdownViewer } from '@/components/markdown';

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.id as string;

  const [job, setJob] = useState<BatchAnalysisJob | null>(null);
  const [results, setResults] = useState<BatchAnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);
  const [runningJob, setRunningJob] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    minAvgScore: '' as string | number,
    maxAvgScore: '' as string | number,
    sentiment: '' as string,
    hasIssues: '' as string,
  });
  const [showFilters, setShowFilters] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Build filter params
      const filterParams: any = { jobId, limit: 100 };
      if (filters.minAvgScore !== '') {
        filterParams.minAvgScore = Number(filters.minAvgScore);
      }
      if (filters.maxAvgScore !== '') {
        filterParams.maxAvgScore = Number(filters.maxAvgScore);
      }
      if (filters.sentiment) {
        filterParams.sentiment = filters.sentiment;
      }
      if (filters.hasIssues !== '') {
        filterParams.hasIssues = filters.hasIssues === 'true';
      }

      const [jobData, resultsData] = await Promise.all([
        batchAnalysisApi.getJob(jobId),
        batchAnalysisApi.listResults(filterParams),
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

  const handleResetFilters = () => {
    setFilters({
      minAvgScore: '',
      maxAvgScore: '',
      sentiment: '',
      hasIssues: '',
    });
  };

  const hasActiveFilters =
    filters.minAvgScore !== '' ||
    filters.maxAvgScore !== '' ||
    filters.sentiment !== '' ||
    filters.hasIssues !== '';

  useEffect(() => {
    fetchData();
    // Auto-refresh if job is running
    const interval = setInterval(() => {
      if (job?.status === 'RUNNING') {
        fetchData();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [jobId, job?.status, filters]);

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

  // 전체 결과의 평균 점수 계산
  const scoreStats = useMemo(() => {
    const successResults = results.filter(r => r.status === 'SUCCESS' && r.avgScore != null);
    if (successResults.length === 0) return null;

    const sum = (key: 'qualityScore' | 'relevance' | 'completeness' | 'clarity' | 'avgScore') => {
      const validResults = successResults.filter(r => r[key] != null);
      if (validResults.length === 0) return null;
      return validResults.reduce((acc, r) => acc + (r[key] || 0), 0) / validResults.length;
    };

    const sentimentCounts = successResults.reduce((acc, r) => {
      if (r.sentiment) acc[r.sentiment] = (acc[r.sentiment] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalIssues = successResults.reduce((acc, r) => acc + (r.issueCount || 0), 0);

    return {
      avgQualityScore: sum('qualityScore'),
      avgRelevance: sum('relevance'),
      avgCompleteness: sum('completeness'),
      avgClarity: sum('clarity'),
      avgScore: sum('avgScore'),
      scoredCount: successResults.length,
      sentimentCounts,
      totalIssues,
    };
  }, [results]);

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

      {/* Score Summary */}
      {scoreStats && (
        <div className="mb-8 border-2 border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-mono font-bold text-cyan-400 uppercase tracking-wider">
              Score Summary
            </h3>
            <span className="text-slate-500 font-mono text-xs ml-2">
              ({scoreStats.scoredCount} analyzed)
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            {/* Overall Avg Score */}
            <div className="p-4 bg-slate-800/50 border border-slate-700 rounded">
              <p className="text-slate-400 font-mono text-xs uppercase tracking-wider mb-2">
                Overall Avg
              </p>
              <p className={`text-3xl font-mono font-bold ${
                (scoreStats.avgScore || 0) >= 8 ? 'text-green-400' :
                (scoreStats.avgScore || 0) >= 6 ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {scoreStats.avgScore?.toFixed(1) || '-'}
              </p>
            </div>

            {/* Quality */}
            <div className="p-4 bg-slate-800/50 border border-slate-700 rounded">
              <p className="text-slate-400 font-mono text-xs uppercase tracking-wider mb-2">
                Quality
              </p>
              <p className={`text-2xl font-mono font-bold ${
                (scoreStats.avgQualityScore || 0) >= 8 ? 'text-green-400' :
                (scoreStats.avgQualityScore || 0) >= 6 ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {scoreStats.avgQualityScore?.toFixed(1) || '-'}
              </p>
            </div>

            {/* Relevance */}
            <div className="p-4 bg-slate-800/50 border border-slate-700 rounded">
              <p className="text-slate-400 font-mono text-xs uppercase tracking-wider mb-2">
                Relevance
              </p>
              <p className={`text-2xl font-mono font-bold ${
                (scoreStats.avgRelevance || 0) >= 8 ? 'text-green-400' :
                (scoreStats.avgRelevance || 0) >= 6 ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {scoreStats.avgRelevance?.toFixed(1) || '-'}
              </p>
            </div>

            {/* Completeness */}
            <div className="p-4 bg-slate-800/50 border border-slate-700 rounded">
              <p className="text-slate-400 font-mono text-xs uppercase tracking-wider mb-2">
                Completeness
              </p>
              <p className={`text-2xl font-mono font-bold ${
                (scoreStats.avgCompleteness || 0) >= 8 ? 'text-green-400' :
                (scoreStats.avgCompleteness || 0) >= 6 ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {scoreStats.avgCompleteness?.toFixed(1) || '-'}
              </p>
            </div>

            {/* Clarity */}
            <div className="p-4 bg-slate-800/50 border border-slate-700 rounded">
              <p className="text-slate-400 font-mono text-xs uppercase tracking-wider mb-2">
                Clarity
              </p>
              <p className={`text-2xl font-mono font-bold ${
                (scoreStats.avgClarity || 0) >= 8 ? 'text-green-400' :
                (scoreStats.avgClarity || 0) >= 6 ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {scoreStats.avgClarity?.toFixed(1) || '-'}
              </p>
            </div>
          </div>

          {/* Sentiment & Issues Row */}
          <div className="flex flex-wrap gap-6">
            {/* Sentiment Distribution */}
            <div className="flex items-center gap-3">
              <span className="text-slate-400 font-mono text-xs uppercase">Sentiment:</span>
              <div className="flex items-center gap-2">
                {scoreStats.sentimentCounts.positive && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded">
                    <TrendingUp className="w-3 h-3 text-green-400" />
                    <span className="text-green-400 font-mono text-xs">
                      {scoreStats.sentimentCounts.positive}
                    </span>
                  </div>
                )}
                {scoreStats.sentimentCounts.neutral && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-slate-500/20 rounded">
                    <Minus className="w-3 h-3 text-slate-400" />
                    <span className="text-slate-400 font-mono text-xs">
                      {scoreStats.sentimentCounts.neutral}
                    </span>
                  </div>
                )}
                {scoreStats.sentimentCounts.negative && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-red-500/20 rounded">
                    <TrendingDown className="w-3 h-3 text-red-400" />
                    <span className="text-red-400 font-mono text-xs">
                      {scoreStats.sentimentCounts.negative}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Total Issues */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-mono text-xs uppercase">Total Issues:</span>
              <span className={`font-mono font-bold ${
                scoreStats.totalIssues === 0 ? 'text-green-400' :
                scoreStats.totalIssues <= 5 ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {scoreStats.totalIssues}
              </span>
            </div>
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
        <div className="px-6 py-4 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-mono font-bold text-cyan-400 uppercase tracking-wider">
              Analysis Results ({results.length})
            </h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`
                flex items-center gap-2 px-3 py-2
                border font-mono text-sm uppercase tracking-wider
                transition-all
                ${hasActiveFilters
                  ? 'bg-cyan-600 border-cyan-500 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}
              `}
            >
              <Filter className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-white rounded-full" />
              )}
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-slate-800/50 border border-slate-700 rounded">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Min Avg Score */}
                <div>
                  <label className="block text-slate-400 font-mono text-xs uppercase tracking-wider mb-2">
                    Min Avg Score
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.5"
                    value={filters.minAvgScore}
                    onChange={(e) => setFilters({ ...filters, minAvgScore: e.target.value })}
                    placeholder="0"
                    className="
                      w-full px-3 py-2 bg-slate-900 border border-slate-600
                      text-slate-200 font-mono text-sm
                      focus:border-cyan-500 focus:outline-none
                    "
                  />
                </div>

                {/* Max Avg Score */}
                <div>
                  <label className="block text-slate-400 font-mono text-xs uppercase tracking-wider mb-2">
                    Max Avg Score
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.5"
                    value={filters.maxAvgScore}
                    onChange={(e) => setFilters({ ...filters, maxAvgScore: e.target.value })}
                    placeholder="10"
                    className="
                      w-full px-3 py-2 bg-slate-900 border border-slate-600
                      text-slate-200 font-mono text-sm
                      focus:border-cyan-500 focus:outline-none
                    "
                  />
                </div>

                {/* Sentiment */}
                <div>
                  <label className="block text-slate-400 font-mono text-xs uppercase tracking-wider mb-2">
                    Sentiment
                  </label>
                  <select
                    value={filters.sentiment}
                    onChange={(e) => setFilters({ ...filters, sentiment: e.target.value })}
                    className="
                      w-full px-3 py-2 bg-slate-900 border border-slate-600
                      text-slate-200 font-mono text-sm
                      focus:border-cyan-500 focus:outline-none
                    "
                  >
                    <option value="">All</option>
                    <option value="positive">Positive</option>
                    <option value="neutral">Neutral</option>
                    <option value="negative">Negative</option>
                  </select>
                </div>

                {/* Has Issues */}
                <div>
                  <label className="block text-slate-400 font-mono text-xs uppercase tracking-wider mb-2">
                    Has Issues
                  </label>
                  <select
                    value={filters.hasIssues}
                    onChange={(e) => setFilters({ ...filters, hasIssues: e.target.value })}
                    className="
                      w-full px-3 py-2 bg-slate-900 border border-slate-600
                      text-slate-200 font-mono text-sm
                      focus:border-cyan-500 focus:outline-none
                    "
                  >
                    <option value="">All</option>
                    <option value="true">With Issues</option>
                    <option value="false">No Issues</option>
                  </select>
                </div>
              </div>

              {/* Filter Actions */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700">
                <button
                  onClick={handleResetFilters}
                  disabled={!hasActiveFilters}
                  className="
                    flex items-center gap-2 px-3 py-2
                    text-slate-400 hover:text-slate-200 font-mono text-xs uppercase
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors
                  "
                >
                  <X className="w-3 h-3" />
                  Reset Filters
                </button>
                <button
                  onClick={fetchData}
                  className="
                    flex items-center gap-2 px-4 py-2
                    bg-cyan-600 hover:bg-cyan-700 border border-cyan-500
                    text-white font-mono text-sm uppercase tracking-wider
                    transition-all
                  "
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}
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

                    {/* Score - DB에서 파싱된 컬럼 직접 사용 */}
                    {result.qualityScore !== null && (
                      <div className="flex-shrink-0 text-right">
                        <p className={`text-lg font-mono font-bold ${
                          result.qualityScore >= 8 ? 'text-green-400' :
                          result.qualityScore >= 6 ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {result.qualityScore}/10
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
                          <MarkdownViewer content={result.llmResponse} size="sm" />
                        </div>
                      </div>

                      {/* Analysis Result - 파싱된 컬럼 구조화 표시 */}
                      <div>
                        <p className="text-slate-500 font-mono text-xs uppercase tracking-wider mb-2">
                          Analysis Result
                        </p>
                        <div className="p-3 bg-slate-800 border border-slate-700 max-h-64 overflow-y-auto">
                          {result.status === 'FAILED' ? (
                            <p className="text-red-400 font-mono text-sm">
                              Error: {result.errorMessage || 'Unknown error'}
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {/* Scores Grid */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {result.qualityScore !== null && (
                                  <div className="p-2 bg-slate-700/50 rounded">
                                    <p className="text-slate-400 text-xs">Quality</p>
                                    <p className={`font-mono font-bold ${result.qualityScore >= 8 ? 'text-green-400' : result.qualityScore >= 6 ? 'text-yellow-400' : 'text-red-400'}`}>
                                      {result.qualityScore}/10
                                    </p>
                                  </div>
                                )}
                                {result.relevance !== null && (
                                  <div className="p-2 bg-slate-700/50 rounded">
                                    <p className="text-slate-400 text-xs">Relevance</p>
                                    <p className={`font-mono font-bold ${result.relevance >= 8 ? 'text-green-400' : result.relevance >= 6 ? 'text-yellow-400' : 'text-red-400'}`}>
                                      {result.relevance}/10
                                    </p>
                                  </div>
                                )}
                                {result.completeness !== null && (
                                  <div className="p-2 bg-slate-700/50 rounded">
                                    <p className="text-slate-400 text-xs">Completeness</p>
                                    <p className={`font-mono font-bold ${result.completeness >= 8 ? 'text-green-400' : result.completeness >= 6 ? 'text-yellow-400' : 'text-red-400'}`}>
                                      {result.completeness}/10
                                    </p>
                                  </div>
                                )}
                                {result.clarity !== null && (
                                  <div className="p-2 bg-slate-700/50 rounded">
                                    <p className="text-slate-400 text-xs">Clarity</p>
                                    <p className={`font-mono font-bold ${result.clarity >= 8 ? 'text-green-400' : result.clarity >= 6 ? 'text-yellow-400' : 'text-red-400'}`}>
                                      {result.clarity}/10
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Sentiment & Summary */}
                              {(result.sentiment || result.summaryText) && (
                                <div className="space-y-2">
                                  {result.sentiment && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-slate-400 text-xs">Sentiment:</span>
                                      <span className={`px-2 py-0.5 rounded text-xs font-mono ${
                                        result.sentiment === 'positive' ? 'bg-green-500/20 text-green-400' :
                                        result.sentiment === 'negative' ? 'bg-red-500/20 text-red-400' :
                                        'bg-slate-500/20 text-slate-400'
                                      }`}>
                                        {result.sentiment}
                                      </span>
                                    </div>
                                  )}
                                  {result.summaryText && (
                                    <div>
                                      <span className="text-slate-400 text-xs">Summary:</span>
                                      <p className="text-slate-200 text-sm mt-1">{result.summaryText}</p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Issues */}
                              {result.issues && (
                                <div>
                                  <span className="text-slate-400 text-xs">Issues ({result.issueCount || 0}):</span>
                                  <ul className="mt-1 space-y-1">
                                    {JSON.parse(result.issues).map((issue: string, idx: number) => (
                                      <li key={idx} className="text-red-300 text-sm flex items-start gap-2">
                                        <span className="text-red-400">•</span>
                                        <span>{issue}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Improvements */}
                              {result.improvements && (
                                <div>
                                  <span className="text-slate-400 text-xs">Improvements:</span>
                                  <ul className="mt-1 space-y-1">
                                    {JSON.parse(result.improvements).map((improvement: string, idx: number) => (
                                      <li key={idx} className="text-cyan-300 text-sm flex items-start gap-2">
                                        <span className="text-cyan-400">•</span>
                                        <span>{improvement}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Missing Data */}
                              {result.missingData && (
                                <div>
                                  <span className="text-slate-400 text-xs">Missing Data:</span>
                                  <pre className="mt-1 text-yellow-300 text-sm whitespace-pre-wrap">
                                    {JSON.stringify(JSON.parse(result.missingData), null, 2)}
                                  </pre>
                                </div>
                              )}

                              {/* Raw JSON fallback */}
                              {!result.qualityScore && !result.relevance && analysis && (
                                <pre className="text-slate-200 font-mono text-sm whitespace-pre-wrap">
                                  {JSON.stringify(analysis, null, 2)}
                                </pre>
                              )}
                            </div>
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
