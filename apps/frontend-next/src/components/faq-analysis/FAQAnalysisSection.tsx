'use client';

import React, { useState } from 'react';
import { Search, Loader2, AlertCircle, FileQuestion, Clock } from 'lucide-react';
import FAQClusterCard from './FAQClusterCard';
import { useFAQTenants, useRunFAQAnalysis } from '@/hooks/queries';
import { EmptyState } from '@/components/ui/EmptyState';

export default function FAQAnalysisSection() {
  // Filter state
  const [periodDays, setPeriodDays] = useState<7 | 14 | 30>(7);
  const [topN, setTopN] = useState<10 | 20 | 50>(10);
  const [tenantId, setTenantId] = useState<string>('');

  // React Query hooks
  const { data: tenants = [] } = useFAQTenants(30);
  const {
    mutate: runAnalysis,
    data: result,
    isPending: isLoading,
    error: mutationError,
  } = useRunFAQAnalysis();

  const error = mutationError
    ? (mutationError instanceof Error ? mutationError.message : 'FAQ 분석 중 오류가 발생했습니다.')
    : null;

  const handleAnalyze = () => {
    runAnalysis({ periodDays, topN, ...(tenantId && { tenantId }) });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <FileQuestion className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900">FAQ 분석 (자주 묻는 질문)</h3>
        </div>

        {/* Filter Form */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Period Select */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">기간:</label>
            <select
              value={periodDays}
              onChange={(e) => setPeriodDays(Number(e.target.value) as 7 | 14 | 30)}
              className="bg-white border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
              disabled={isLoading}
            >
              <option value={7}>7일</option>
              <option value={14}>14일</option>
              <option value={30}>30일</option>
            </select>
          </div>

          {/* Top N Select */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Top:</label>
            <select
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value) as 10 | 20 | 50)}
              className="bg-white border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
              disabled={isLoading}
            >
              <option value={10}>10개</option>
              <option value={20}>20개</option>
              <option value={50}>50개</option>
            </select>
          </div>

          {/* Tenant Select */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">테넌트:</label>
            <select
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="bg-white border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500 min-w-[120px]"
              disabled={isLoading}
            >
              <option value="">전체</option>
              {tenants.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Analyze Button */}
          <button
            onClick={handleAnalyze}
            disabled={isLoading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-gray-900 px-4 py-1.5 rounded text-sm font-medium transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                분석 중...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                분석 실행
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Error State */}
        {error && (
          <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-lg p-4 text-rose-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && !result && (
          <EmptyState
            icon={<FileQuestion className="w-12 h-12" />}
            description='필터를 설정하고 "분석 실행" 버튼을 클릭하세요.'
            variant="dashed"
          />
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <Loader2 className="w-10 h-10 mx-auto mb-3 animate-spin text-blue-400" />
            <p className="text-gray-500">FAQ를 분석하고 있습니다...</p>
            <p className="text-gray-400 text-sm mt-1">LLM 클러스터링 및 사유 분석 진행 중</p>
          </div>
        )}

        {/* Results */}
        {!isLoading && result && (
          <div>
            {/* Summary */}
            <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
              <div className="flex items-center gap-2 text-gray-500">
                <Clock className="w-4 h-4" />
                <span>
                  분석 시점: {new Date(result.analyzedAt).toLocaleString('ko-KR')}
                </span>
              </div>
              <div className="text-gray-400">|</div>
              <div className="text-gray-500">
                기간: {result.period.start} ~ {result.period.end}
              </div>
              <div className="text-gray-400">|</div>
              <div className="text-gray-500">
                총 {result.totalQuestions.toLocaleString()}건 분석
              </div>
              {result.llmMergeApplied && (
                <>
                  <div className="text-gray-400">|</div>
                  <div className="text-purple-400">LLM 병합 적용됨</div>
                </>
              )}
            </div>

            {/* No Results */}
            {result.clusters.length === 0 ? (
              <EmptyState variant="compact" description="분석할 데이터가 없습니다." />
            ) : (
              /* Cluster Cards */
              <div className="space-y-4">
                {result.clusters.map((cluster, idx) => (
                  <FAQClusterCard key={cluster.id} cluster={cluster} rank={idx + 1} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
