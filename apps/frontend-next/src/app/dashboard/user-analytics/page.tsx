'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Users, BarChart3, MessageSquare, Activity } from 'lucide-react';
import KPICard from '@/components/kpi/KPICard';
import UserListTable from '@/components/charts/UserListTable';
import UserActivityDialog from '@/components/charts/UserActivityDialog';
import UserPatternsTable from '@/components/charts/UserPatternsTable';
import DateRangeFilter, { type DateRange } from '@/components/ui/DateRangeFilter';
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
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: '', endDate: '', days: 7 });

  // Dialog state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // AbortController를 사용한 요청 취소 관리
  const abortControllerRef = useRef<AbortController | null>(null);

  // 15분마다 자동 새로고침을 위한 트리거
  const [refreshKey, setRefreshKey] = useState(0);

  // 날짜 범위 변경 또는 새로고침 시 데이터 재조회
  useEffect(() => {
    // 이전 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [listData, patternsData] = await Promise.all([
          fetchUserList(PROJECT_ID, dateRange.days, 9999),
          fetchUserQuestionPatterns(PROJECT_ID, undefined, dateRange.days, 9999),
        ]);

        // 요청이 취소되지 않았을 때만 상태 업데이트
        if (!controller.signal.aborted) {
          setUserList(listData);
          setUserPatterns(patternsData);
          setError(null);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      controller.abort();
    };
  }, [dateRange.days, refreshKey]);

  // 15분마다 자동 새로고침
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey((prev) => prev + 1);
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

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

  return (
    <div className="p-8 h-full overflow-y-auto">
      {/* Header - 항상 렌더링하여 DateRangeFilter가 unmount되지 않도록 함 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-white">유저 분석</h2>
          <p className="text-slate-400 mt-1">x_enc_data 기준 유저별 활동 분석</p>
        </div>

        {/* Date Range Filter - 항상 마운트 유지 */}
        <DateRangeFilter
          defaultPreset="week"
          onChange={(range) => setDateRange(range)}
        />
      </div>

      {/* 로딩 상태 */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
            <div className="text-slate-400">데이터 로딩 중...</div>
          </div>
        </div>
      )}

      {/* 에러 상태 */}
      {error && !loading && (
        <div className="py-8">
          <div className="bg-rose-900/20 border border-rose-800 rounded-lg p-4 text-rose-400">
            오류: {error}
          </div>
        </div>
      )}

      {/* 정상 콘텐츠 */}
      {!loading && !error && (
        <>
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
              title={`유저 목록 (최근 ${dateRange.days}일)`}
              onUserClick={handleUserClick}
            />
          </div>

          {/* User Patterns Table */}
          <div className="mb-8">
            <UserPatternsTable
              data={userPatterns}
              title={`유저별 자주 묻는 질문 패턴 (최근 ${dateRange.days}일)`}
              maxDisplay={30}
            />
          </div>
        </>
      )}

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
