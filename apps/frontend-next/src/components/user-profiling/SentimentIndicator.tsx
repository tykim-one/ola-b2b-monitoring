'use client';

import { SentimentAnalysisResult } from '@/services/userProfilingService';

interface Props {
  sentiment: SentimentAnalysisResult;
}

export function SentimentIndicator({ sentiment }: Props) {
  const getTrendIcon = (trend: 'increasing' | 'decreasing' | 'stable') => {
    switch (trend) {
      case 'increasing':
        return '↑';
      case 'decreasing':
        return '↓';
      default:
        return '→';
    }
  };

  const getTrendColor = (trend: 'increasing' | 'decreasing' | 'stable') => {
    switch (trend) {
      case 'increasing':
        return 'text-red-400';
      case 'decreasing':
        return 'text-green-400';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-white mb-4">감정 분석</h2>

      {/* 감정 비율 */}
      <div className="flex items-center gap-6 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">긍정</span>
          <span className="text-green-400 font-medium text-lg">{sentiment.positive}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl">중립</span>
          <span className="text-slate-400 font-medium text-lg">{sentiment.neutral}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl">부정</span>
          <span className="text-red-400 font-medium text-lg">{sentiment.negative}%</span>
        </div>
      </div>

      {/* 비율 바 */}
      <div className="h-3 bg-slate-700 rounded-full overflow-hidden flex mb-4">
        {sentiment.positive > 0 && (
          <div
            className="bg-green-500 h-full"
            style={{ width: `${sentiment.positive}%` }}
          />
        )}
        {sentiment.neutral > 0 && (
          <div
            className="bg-slate-500 h-full"
            style={{ width: `${sentiment.neutral}%` }}
          />
        )}
        {sentiment.negative > 0 && (
          <div
            className="bg-red-500 h-full"
            style={{ width: `${sentiment.negative}%` }}
          />
        )}
      </div>

      {/* 상세 지표 */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="bg-slate-700/50 px-3 py-2 rounded">
          <span className="text-slate-400">공격적 표현:</span>{' '}
          <span className={`font-medium ${sentiment.aggressiveCount > 0 ? 'text-red-400' : 'text-slate-300'}`}>
            {sentiment.aggressiveCount}건
          </span>
        </div>
        <div className="bg-slate-700/50 px-3 py-2 rounded">
          <span className="text-slate-400">불만 표현:</span>{' '}
          <span className={`font-medium ${sentiment.complaintCount > 0 ? 'text-orange-400' : 'text-slate-300'}`}>
            {sentiment.complaintCount}건
          </span>
        </div>
        <div className="bg-slate-700/50 px-3 py-2 rounded">
          <span className="text-slate-400">불만 수준:</span>{' '}
          <span className={`font-medium ${sentiment.frustrationLevel > 0.5 ? 'text-red-400' : sentiment.frustrationLevel > 0.3 ? 'text-orange-400' : 'text-green-400'}`}>
            {(sentiment.frustrationLevel * 100).toFixed(0)}%
          </span>
        </div>
        <div className="bg-slate-700/50 px-3 py-2 rounded">
          <span className="text-slate-400">트렌드:</span>{' '}
          <span className={`font-medium ${getTrendColor(sentiment.trend)}`}>
            {getTrendIcon(sentiment.trend)} {sentiment.trend === 'increasing' ? '상승' : sentiment.trend === 'decreasing' ? '하락' : '안정'}
          </span>
        </div>
      </div>
    </div>
  );
}
