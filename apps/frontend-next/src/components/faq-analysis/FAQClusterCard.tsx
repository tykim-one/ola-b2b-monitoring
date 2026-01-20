'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Layers, MessageSquare, Lightbulb } from 'lucide-react';
import { FAQCluster } from '@/services/faqAnalysisService';

interface FAQClusterCardProps {
  cluster: FAQCluster;
  rank: number;
}

export default function FAQClusterCard({ cluster, rank }: FAQClusterCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const displayedQuestions = isExpanded
    ? cluster.questions
    : cluster.questions.slice(0, 3);
  const hasMore = cluster.questions.length > 3;

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-start gap-3">
          {/* Rank Badge */}
          <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {rank}
          </div>

          {/* Representative Question */}
          <div className="flex-1">
            <h4 className="text-white font-semibold text-lg leading-tight">
              {cluster.representativeQuestion}
            </h4>
            {cluster.isMerged && (
              <span className="inline-flex items-center gap-1 mt-1 text-xs text-purple-400 bg-purple-900/30 px-2 py-0.5 rounded">
                <Layers className="w-3 h-3" />
                LLM 병합됨
              </span>
            )}
          </div>
        </div>

        {/* Frequency Badge */}
        <div className="flex-shrink-0 text-right">
          <div className="text-2xl font-bold text-blue-400">{cluster.frequency}</div>
          <div className="text-xs text-slate-500">회</div>
        </div>
      </div>

      {/* Reason Analysis */}
      <div className="bg-amber-900/20 border border-amber-800/30 rounded-md p-3 mb-3">
        <div className="flex items-start gap-2">
          <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-xs text-amber-500 font-medium mb-1">사유 분석</div>
            <div className="text-sm text-amber-200">{cluster.reasonAnalysis}</div>
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <MessageSquare className="w-3 h-3" />
          <span>포함된 질문 ({cluster.questions.length}개)</span>
        </div>

        <div className="space-y-1.5">
          {displayedQuestions.map((q, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-sm bg-slate-900/50 rounded px-3 py-2"
            >
              <span className="text-slate-300 truncate flex-1 mr-2">&quot;{q.text}&quot;</span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-slate-500 text-xs">{q.tenantId}</span>
                <span className="text-blue-400 font-medium">{q.count}회</span>
              </div>
            </div>
          ))}
        </div>

        {/* Expand/Collapse Button */}
        {hasMore && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300 transition-colors mt-2"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                접기
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                {cluster.questions.length - 3}개 더 보기
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
