'use client';

import { UserProfileSummary as UserProfileSummaryType } from '@/services/userProfilingService';

interface Props {
  profile: UserProfileSummaryType;
}

export function UserProfileSummary({ profile }: Props) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('ko-KR');
  };

  return (
    <div className="bg-white rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">유저 프로필 요약</h2>

      {/* 기본 통계 */}
      <div className="flex flex-wrap gap-4 mb-6 text-sm">
        <div className="bg-gray-100 px-4 py-2 rounded">
          <span className="text-gray-500">총 대화:</span>{' '}
          <span className="text-gray-900 font-medium">{profile.totalMessages}건</span>
        </div>
        <div className="bg-gray-100 px-4 py-2 rounded">
          <span className="text-gray-500">분석됨:</span>{' '}
          <span className="text-gray-900 font-medium">{profile.analyzedMessages}건</span>
        </div>
        <div className="bg-gray-100 px-4 py-2 rounded">
          <span className="text-gray-500">불만율:</span>{' '}
          <span className={`font-medium ${profile.frustrationRate > 0.3 ? 'text-red-400' : 'text-green-400'}`}>
            {(profile.frustrationRate * 100).toFixed(1)}%
          </span>
        </div>
        <div className="bg-gray-100 px-4 py-2 rounded">
          <span className="text-gray-500">마지막 분석:</span>{' '}
          <span className="text-gray-900">{formatDate(profile.lastAnalyzedAt)}</span>
        </div>
      </div>

      {/* LLM 생성 요약 */}
      <div className="space-y-4">
        {/* 주요 관심사 */}
        {profile.mainInterests && (
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-2">주요 관심사</h3>
            <div className="bg-gray-100 p-3 rounded text-sm text-gray-700 whitespace-pre-line">
              {profile.mainInterests}
            </div>
          </div>
        )}

        {/* 주요 불만/문제점 */}
        {profile.painPoints && (
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-2">주요 불만/문제점</h3>
            <div className="bg-gray-100 p-3 rounded text-sm text-gray-700 whitespace-pre-line">
              {profile.painPoints}
            </div>
          </div>
        )}

        {/* 행동 요약 */}
        {profile.behaviorSummary && (
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-2">행동 요약</h3>
            <div className="bg-gray-100 p-3 rounded text-sm text-gray-700">
              {profile.behaviorSummary}
            </div>
          </div>
        )}

        {/* 분석 결과가 없는 경우 */}
        {!profile.mainInterests && !profile.painPoints && !profile.behaviorSummary && (
          <div className="text-gray-500 text-sm">
            아직 LLM 분석이 수행되지 않았습니다. 배치 작업을 실행하면 상세 분석 결과를 확인할 수 있습니다.
          </div>
        )}
      </div>
    </div>
  );
}
