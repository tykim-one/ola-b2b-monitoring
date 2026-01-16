'use client';

import React, { useEffect, useState } from 'react';
import { Users, BarChart3, MessageSquare, Activity } from 'lucide-react';
import KPICard from '@/components/kpi/KPICard';
import UserListTable from '@/components/charts/UserListTable';
import UserActivityDialog from '@/components/charts/UserActivityDialog';
import UserPatternsTable from '@/components/charts/UserPatternsTable';
import {
  fetchUserList,
  fetchUserQuestionPatterns,
} from '@/services/userAnalyticsService';
import { UserListItem, UserQuestionPattern } from '@ola/shared-types';

const PROJECT_ID = 'ibks';

export default function UserAnalyticsPage() {
  const [userList, setUserList] = useState<UserListItem[]>([]);
  const [userPatterns, setUserPatterns] = useState<UserQuestionPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);

  // Dialog state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [listData, patternsData] = await Promise.all([
        fetchUserList(PROJECT_ID, days, 9999),
        fetchUserQuestionPatterns(PROJECT_ID, undefined, 9999),
      ]);

      setUserList(listData);
      setUserPatterns(patternsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh every 15 minutes
    const interval = setInterval(fetchData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [days]);

  // Handle user click to open dialog
  const handleUserClick = (userId: string) => {
    setSelectedUserId(userId);
    setIsDialogOpen(true);
  };

  // Close dialog
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedUserId(null);
  };

  // Get selected user info for dialog
  const selectedUserInfo = selectedUserId
    ? userList.find((u) => u.userId === selectedUserId)
    : undefined;

  // Calculate KPI metrics
  const totalUsers = userList.length;
  const totalRequests = userList.reduce((sum, u) => sum + u.questionCount, 0);
  const totalTokens = userList.reduce((sum, u) => sum + u.totalTokens, 0);
  const avgRequestsPerUser = totalUsers > 0 ? Math.round(totalRequests / totalUsers) : 0;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
          <div className="text-slate-400">데이터 로딩 중...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-rose-900/20 border border-rose-800 rounded-lg p-4 text-rose-400">
          오류: {error}
        </div>
        <button
          onClick={fetchData}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-white">유저 분석</h2>
          <p className="text-slate-400 mt-1">x_enc_data 기준 유저별 활동 분석</p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">기간:</span>
          <div className="flex gap-1 bg-slate-900 rounded-lg p-1">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  days === d
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {d}일
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="총 유저 수"
          value={totalUsers}
          format="number"
          icon={<Users className="w-5 h-5" />}
          status="neutral"
        />
        <KPICard
          title="총 질문 수"
          value={totalRequests}
          format="number"
          icon={<Activity className="w-5 h-5" />}
          status="neutral"
        />
        <KPICard
          title="총 토큰 사용량"
          value={totalTokens}
          format="tokens"
          icon={<BarChart3 className="w-5 h-5" />}
          status="neutral"
        />
        <KPICard
          title="유저당 평균 질문"
          value={avgRequestsPerUser}
          format="number"
          icon={<MessageSquare className="w-5 h-5" />}
          status="neutral"
        />
      </div>

      {/* User List Table */}
      <div className="mb-8">
        <UserListTable
          data={userList}
          title={`유저 목록 (최근 ${days}일)`}
          onUserClick={handleUserClick}
        />
      </div>

      {/* User Patterns Table */}
      <div className="mb-8">
        <UserPatternsTable
          data={userPatterns}
          title="유저별 자주 묻는 질문 패턴 (최근 30일)"
          maxDisplay={30}
        />
      </div>

      {/* User Activity Dialog */}
      {selectedUserId && (
        <UserActivityDialog
          isOpen={isDialogOpen}
          onClose={handleCloseDialog}
          userId={selectedUserId}
          userInfo={selectedUserInfo}
          projectId={PROJECT_ID}
        />
      )}
    </div>
  );
}
