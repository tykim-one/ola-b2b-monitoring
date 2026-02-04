import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { CACHE_TIME } from '@/lib/query-client';
import {
  fetchUserList,
  fetchUserQuestionPatterns,
  fetchUserActivity,
} from '@/services/userAnalyticsService';
import {
  fetchProblematicChats,
  fetchRules,
  fetchProblematicChatStats,
} from '@/services/problematicChatService';
import type {
  UserListItem,
  UserQuestionPattern,
  UserActivityDetail,
  ProblematicChat,
  ProblematicChatRule,
  ProblematicChatStats,
} from '@ola/shared-types';

// ==================== Query Keys ====================

export const userAnalyticsKeys = {
  all: ['user-analytics'] as const,
  userList: (projectId: string, days: number) =>
    [...userAnalyticsKeys.all, 'user-list', projectId, { days }] as const,
  userPatterns: (projectId: string, days: number) =>
    [...userAnalyticsKeys.all, 'user-patterns', projectId, { days }] as const,
  userActivity: (projectId: string, userId: string, days: number, page: number) =>
    [...userAnalyticsKeys.all, 'user-activity', projectId, userId, { days, page }] as const,
  rules: () => [...userAnalyticsKeys.all, 'rules'] as const,
  problematicChats: (days: number, ruleIds?: string[]) =>
    [...userAnalyticsKeys.all, 'problematic-chats', { days, ruleIds }] as const,
  problematicStats: (days: number) =>
    [...userAnalyticsKeys.all, 'problematic-stats', { days }] as const,
};

// ==================== Individual Hooks ====================

/**
 * 유저 목록 조회 (15분 캐시)
 */
export function useUserList(
  projectId: string,
  days = 7,
  options?: Omit<UseQueryOptions<UserListItem[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: userAnalyticsKeys.userList(projectId, days),
    queryFn: () => fetchUserList(projectId, days, 9999),
    staleTime: CACHE_TIME.MEDIUM,
    ...options,
  });
}

/**
 * 유저 질문 패턴 조회 (15분 캐시)
 */
export function useUserPatterns(
  projectId: string,
  days = 7,
  options?: Omit<UseQueryOptions<UserQuestionPattern[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: userAnalyticsKeys.userPatterns(projectId, days),
    queryFn: () => fetchUserQuestionPatterns(projectId, undefined, days, 9999),
    staleTime: CACHE_TIME.MEDIUM,
    ...options,
  });
}

/**
 * 문제성 채팅 규칙 목록 조회 (15분 캐시)
 */
export function useProblematicRules(
  options?: Omit<UseQueryOptions<ProblematicChatRule[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: userAnalyticsKeys.rules(),
    queryFn: () => fetchRules(),
    staleTime: CACHE_TIME.MEDIUM,
    ...options,
  });
}

/**
 * 문제성 채팅 목록 조회 (5분 캐시)
 */
export function useProblematicChats(
  days = 7,
  ruleIds?: string[],
  options?: Omit<UseQueryOptions<ProblematicChat[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: userAnalyticsKeys.problematicChats(days, ruleIds),
    queryFn: () =>
      fetchProblematicChats({
        days,
        limit: 200,
        ruleIds: ruleIds && ruleIds.length > 0 ? ruleIds : undefined,
      }),
    staleTime: CACHE_TIME.SHORT,
    enabled: ruleIds !== undefined,
    ...options,
  });
}

/**
 * 문제성 채팅 통계 조회 (5분 캐시)
 */
export function useProblematicStats(
  days = 7,
  options?: Omit<UseQueryOptions<ProblematicChatStats>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: userAnalyticsKeys.problematicStats(days),
    queryFn: () => fetchProblematicChatStats(days),
    staleTime: CACHE_TIME.SHORT,
    ...options,
  });
}

/**
 * 유저 활동 상세 조회 (5분 캐시)
 */
export function useUserActivity(
  projectId: string,
  userId: string,
  days: number = 7,
  page: number = 0,
  pageSize: number = 20,
  options?: Omit<UseQueryOptions<UserActivityDetail[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: userAnalyticsKeys.userActivity(projectId, userId, days, page),
    queryFn: () => fetchUserActivity(projectId, userId, days, pageSize, page * pageSize),
    staleTime: CACHE_TIME.SHORT,
    enabled: !!userId && !!projectId,
    ...options,
  });
}

// ==================== Combined Dashboard Hook ====================

export interface UserAnalyticsDashboardData {
  userList: UserListItem[];
  userPatterns: UserQuestionPattern[];
  kpis: {
    totalUsers: number;
    totalRequests: number;
    totalTokens: number;
    avgRequestsPerUser: number;
  };
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * 유저 분석 대시보드 통합 훅 (유저 탭용)
 * @param projectId - 프로젝트 ID
 * @param days - 조회 기간 (기본: 7일)
 * @param enabled - 쿼리 활성화 여부
 */
export function useUserAnalyticsDashboard(
  projectId: string,
  days = 7,
  enabled = true
): UserAnalyticsDashboardData {
  const userListQuery = useUserList(projectId, days, { enabled });
  const userPatternsQuery = useUserPatterns(projectId, days, { enabled });

  const isLoading = userListQuery.isLoading || userPatternsQuery.isLoading;
  const error = userListQuery.error || userPatternsQuery.error;

  const userList = userListQuery.data ?? [];
  const userPatterns = userPatternsQuery.data ?? [];

  // KPI calculations
  const totalUsers = userList.length;
  const totalRequests = userList.reduce((sum, u) => sum + u.questionCount, 0);
  const totalTokens = userList.reduce((sum, u) => sum + u.totalTokens, 0);
  const avgRequestsPerUser =
    totalUsers > 0 ? Math.round(totalRequests / totalUsers) : 0;

  const kpis = {
    totalUsers,
    totalRequests,
    totalTokens,
    avgRequestsPerUser,
  };

  const refetch = () => {
    userListQuery.refetch();
    userPatternsQuery.refetch();
  };

  return {
    userList,
    userPatterns,
    kpis,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
