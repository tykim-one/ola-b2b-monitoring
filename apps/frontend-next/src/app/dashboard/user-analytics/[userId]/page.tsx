'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MessageSquare, RefreshCw } from 'lucide-react';
import {
  UserProfileSummary as UserProfileSummaryComponent,
  SentimentIndicator,
  CategoryDistribution,
} from '@/components/user-profiling';
import UserActivityDialog from '@/components/charts/UserActivityDialog';
import {
  fetchUserProfile,
  UserProfileSummary,
} from '@/services/userProfilingService';
import { fetchUserList } from '@/services/userAnalyticsService';
import { UserListItem } from '@ola/shared-types';
import { PROJECT_ID } from '@/lib/config';

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.userId ? decodeURIComponent(params.userId as string) : '';

  const [profile, setProfile] = useState<UserProfileSummary | null>(null);
  const [userInfo, setUserInfo] = useState<UserListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 프로필 및 유저 정보 병렬 조회
      const [profileData, userListData] = await Promise.all([
        fetchUserProfile(userId, days),
        fetchUserList(PROJECT_ID, days, 9999),
      ]);

      setProfile(profileData);

      // 유저 목록에서 해당 유저 정보 찾기
      const foundUser = userListData.find((u) => u.userId === userId);
      setUserInfo(foundUser || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId, days]);

  const handleBack = () => {
    router.push('/dashboard/user-analytics');
  };

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
          <span className="text-gray-500">프로필 로딩 중...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          <p className="font-medium">오류 발생</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={fetchData}
            className="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded text-sm transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-lg p-6 text-center">
          <p className="text-gray-500">유저 프로필을 찾을 수 없습니다.</p>
          <button
            onClick={handleBack}
            className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded text-gray-900 text-sm transition-colors"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="목록으로 돌아가기"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">유저 프로필</h1>
            <p className="text-gray-500 text-sm mt-1">
              ID: <span className="text-blue-400 font-mono">{userId}</span>
              {profile.tenantId && (
                <span className="ml-2">
                  | 테넌트: <span className="text-purple-400">{profile.tenantId}</span>
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* 기간 선택 */}
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-gray-100 text-gray-900 text-sm px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={7}>최근 7일</option>
            <option value={14}>최근 14일</option>
            <option value={30}>최근 30일</option>
          </select>

          {/* 새로고침 */}
          <button
            onClick={fetchData}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="새로고침"
          >
            <RefreshCw className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* 프로필 요약 */}
      <UserProfileSummaryComponent profile={profile} />

      {/* 감정 분석 */}
      <SentimentIndicator sentiment={profile.sentiment} />

      {/* 카테고리 분포 */}
      <CategoryDistribution topCategories={profile.topCategories} />

      {/* 대화 내역 섹션 */}
      <div className="bg-white rounded-lg p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">대화 내역</h2>
          <button
            onClick={handleOpenDialog}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-gray-900 rounded-lg text-sm transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            대화 보기
          </button>
        </div>
        <p className="text-gray-500 text-sm mt-2">
          클릭하여 해당 유저의 대화 내역을 확인할 수 있습니다.
        </p>
      </div>

      {/* 대화 내역 모달 */}
      {isDialogOpen && userInfo && (
        <UserActivityDialog
          isOpen={isDialogOpen}
          userId={userId}
          userInfo={userInfo}
          projectId={PROJECT_ID}
          onClose={handleCloseDialog}
        />
      )}

      {/* userInfo가 없을 때 기본 모달 */}
      {isDialogOpen && !userInfo && (
        <UserActivityDialog
          isOpen={isDialogOpen}
          userId={userId}
          userInfo={{
            userId,
            questionCount: profile?.totalMessages || 0,
            successCount: 0,
            errorCount: 0,
            successRate: 0,
            totalTokens: 0,
            avgTokens: 0,
            firstActivity: '',
            lastActivity: '',
          }}
          projectId={PROJECT_ID}
          onClose={handleCloseDialog}
        />
      )}
    </div>
  );
}
