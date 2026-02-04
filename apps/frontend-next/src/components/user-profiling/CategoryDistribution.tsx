'use client';

import { TopCategory, CategoryLabels } from '@/services/userProfilingService';
import { EmptyState } from '@/components/ui/EmptyState';

interface Props {
  topCategories: TopCategory[];
}

export function CategoryDistribution({ topCategories }: Props) {
  const getCategoryColor = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-green-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-cyan-500',
      'bg-yellow-500',
      'bg-red-500',
    ];
    return colors[index % colors.length];
  };

  if (topCategories.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">질문 카테고리 분포</h2>
        <EmptyState variant="compact" description="분석된 카테고리 정보가 없습니다." />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">질문 카테고리 분포</h2>

      <div className="space-y-3">
        {topCategories.map((cat, index) => (
          <div key={cat.category} className="flex items-center gap-3">
            {/* 카테고리 라벨 */}
            <div className="w-28 text-sm text-gray-600 truncate" title={cat.label}>
              {cat.label}
            </div>

            {/* 프로그레스 바 */}
            <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
              <div
                className={`h-full ${getCategoryColor(index)} transition-all duration-300`}
                style={{ width: `${cat.percentage}%` }}
              />
            </div>

            {/* 퍼센트 */}
            <div className="w-12 text-right text-sm text-gray-600">
              {cat.percentage}%
            </div>

            {/* 건수 */}
            <div className="w-16 text-right text-sm text-gray-500">
              ({cat.count}건)
            </div>
          </div>
        ))}
      </div>

      {/* 총 건수 */}
      <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-500">
        총 {topCategories.reduce((sum, cat) => sum + cat.count, 0)}건의 질문이 분석되었습니다.
      </div>
    </div>
  );
}
