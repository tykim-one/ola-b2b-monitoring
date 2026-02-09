import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
} from '@tanstack/react-query';
import { CACHE_TIME } from '@/lib/query-client';
import {
  reportMonitoringApi,
  isMonitoringResult,
  type HealthResponse,
  type MonitoringResult,
  type MonitoringHistoryResponse,
  type NoCheckMessage,
} from '@/services/reportMonitoringService';
import type {
  UiMonitoringResult,
  UiCheckHistoryResponse,
} from '@ola/shared-types';

// ==================== Query Keys ====================

export const reportMonitoringKeys = {
  all: ['report-monitoring'] as const,
  health: () => [...reportMonitoringKeys.all, 'health'] as const,
  result: () => [...reportMonitoringKeys.all, 'result'] as const,
  history: () => [...reportMonitoringKeys.all, 'history'] as const,
  uiCheckResult: () => [...reportMonitoringKeys.all, 'ui-check', 'result'] as const,
  uiCheckHistory: () => [...reportMonitoringKeys.all, 'ui-check', 'history'] as const,
  uiCheckHealth: () => [...reportMonitoringKeys.all, 'ui-check', 'health'] as const,
  uiCheckConfig: () => [...reportMonitoringKeys.all, 'ui-check', 'config'] as const,
};

// ==================== Query Hooks ====================

/**
 * DB connection health check (5min cache, auto-refresh)
 */
export function useReportMonitoringHealth(
  options?: Omit<UseQueryOptions<HealthResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: reportMonitoringKeys.health(),
    queryFn: () => reportMonitoringApi.getHealth(),
    staleTime: CACHE_TIME.SHORT,
    refetchInterval: CACHE_TIME.SHORT,
    ...options,
  });
}

/**
 * Latest monitoring result (5min cache, auto-refresh).
 * Returns MonitoringResult | null (null = no check has been run yet).
 * Only enabled when DB is connected.
 */
export function useReportMonitoringResult(
  dbConnected: boolean,
  options?: Omit<UseQueryOptions<MonitoringResult | null>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: reportMonitoringKeys.result(),
    queryFn: async (): Promise<MonitoringResult | null> => {
      const data: MonitoringResult | NoCheckMessage = await reportMonitoringApi.getStatus();
      return isMonitoringResult(data) ? data : null;
    },
    enabled: dbConnected,
    staleTime: CACHE_TIME.SHORT,
    refetchInterval: CACHE_TIME.SHORT,
    ...options,
  });
}

/**
 * Mutation: run full monitoring check.
 * On success, updates the cached result and invalidates health.
 */
export function useRunReportCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => reportMonitoringApi.runFullCheck(),
    onSuccess: (data: MonitoringResult) => {
      // Directly set the result cache with fresh data
      queryClient.setQueryData(reportMonitoringKeys.result(), data);
      // Also invalidate health in case DB status changed
      queryClient.invalidateQueries({ queryKey: reportMonitoringKeys.health() });
      queryClient.invalidateQueries({ queryKey: reportMonitoringKeys.history() });
    },
  });
}

/**
 * 모니터링 이력 조회 (100건 fetch, 클라이언트 페이징)
 */
export function useReportMonitoringHistory(dbConnected: boolean) {
  return useQuery({
    queryKey: reportMonitoringKeys.history(),
    queryFn: () => reportMonitoringApi.getHistory({ limit: 100 }),
    enabled: dbConnected,
    staleTime: CACHE_TIME.SHORT,
  });
}

// ==================== UI Check Query Hooks ====================

/**
 * UI check health status
 */
export function useUiCheckHealth(
  options?: Omit<UseQueryOptions<Awaited<ReturnType<typeof reportMonitoringApi.getUiCheckHealth>>>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: reportMonitoringKeys.uiCheckHealth(),
    queryFn: () => reportMonitoringApi.getUiCheckHealth(),
    staleTime: CACHE_TIME.SHORT,
    refetchInterval: CACHE_TIME.SHORT,
    ...options,
  });
}

/**
 * Latest UI check result (5min cache, auto-refresh)
 */
export function useUiCheckResult(
  options?: Omit<UseQueryOptions<UiMonitoringResult | null>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: reportMonitoringKeys.uiCheckResult(),
    queryFn: async (): Promise<UiMonitoringResult | null> => {
      const data = await reportMonitoringApi.getUiCheckStatus();
      return 'message' in data ? null : data;
    },
    staleTime: CACHE_TIME.SHORT,
    refetchInterval: CACHE_TIME.SHORT,
    ...options,
  });
}

/**
 * UI check history (100건 fetch)
 */
export function useUiCheckHistory(
  options?: Omit<UseQueryOptions<UiCheckHistoryResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: reportMonitoringKeys.uiCheckHistory(),
    queryFn: () => reportMonitoringApi.getUiCheckHistory({ limit: 100 }),
    staleTime: CACHE_TIME.SHORT,
    ...options,
  });
}

/**
 * UI check config (설정 템플릿, LONG cache - 거의 변경 안 됨)
 */
export function useUiCheckConfig(
  options?: Omit<UseQueryOptions<import('@/services/reportMonitoringService').UiCheckConfigResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: reportMonitoringKeys.uiCheckConfig(),
    queryFn: () => reportMonitoringApi.getUiCheckConfig(),
    staleTime: CACHE_TIME.LONG,
    ...options,
  });
}

/**
 * UI check history detail (특정 이력의 전체 결과 조회)
 */
export function useUiCheckHistoryDetail(id: string | null) {
  return useQuery({
    queryKey: [...reportMonitoringKeys.uiCheckHistory(), 'detail', id],
    queryFn: async (): Promise<UiMonitoringResult | null> => {
      if (!id) return null;
      const data = await reportMonitoringApi.getUiCheckHistoryDetail(id);
      return 'message' in data ? null : data;
    },
    enabled: !!id,
    staleTime: CACHE_TIME.LONG,
  });
}

/**
 * Mutation: update UI check config threshold
 */
export function useUpdateUiCheckConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { targetId: string; checkIndex: number; values: Record<string, unknown> }) =>
      reportMonitoringApi.updateUiCheckConfig(params),
    onSuccess: (data) => {
      queryClient.setQueryData(reportMonitoringKeys.uiCheckConfig(), data);
    },
  });
}

/**
 * Mutation: run UI check
 */
export function useRunUiCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => reportMonitoringApi.runUiCheck(),
    onSuccess: (data: UiMonitoringResult) => {
      queryClient.setQueryData(reportMonitoringKeys.uiCheckResult(), data);
      queryClient.invalidateQueries({ queryKey: reportMonitoringKeys.uiCheckHealth() });
      queryClient.invalidateQueries({ queryKey: reportMonitoringKeys.uiCheckHistory() });
    },
  });
}
