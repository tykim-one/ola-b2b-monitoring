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
  type NoCheckMessage,
} from '@/services/reportMonitoringService';

// ==================== Query Keys ====================

export const reportMonitoringKeys = {
  all: ['report-monitoring'] as const,
  health: () => [...reportMonitoringKeys.all, 'health'] as const,
  result: () => [...reportMonitoringKeys.all, 'result'] as const,
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
    },
  });
}
