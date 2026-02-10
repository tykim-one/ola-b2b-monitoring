import { useQuery } from '@tanstack/react-query';
import { CACHE_TIME } from '@/lib/query-client';
import type {
  JobExecutionLog,
  JobConfigSummary,
  JobMonitoringSummary,
  HealthCheckResponse,
} from '@/services/jobMonitoringService';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Fetch Helper
async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`API 요청 실패: ${response.status}`);
  const json = await response.json();
  return json.data !== undefined ? json.data : json;
}

// Query Keys
export const jobMonitoringKeys = {
  all: ['job-monitoring'] as const,
  summary: (days: number) => [...jobMonitoringKeys.all, 'summary', { days }] as const,
  logs: (limit: number, days: number) => [...jobMonitoringKeys.all, 'logs', { limit, days }] as const,
  configSummary: (days: number) => [...jobMonitoringKeys.all, 'config-summary', { days }] as const,
  health: () => [...jobMonitoringKeys.all, 'health'] as const,
};

// Individual Hooks
export function useJobMonitoringSummary(days = 7) {
  return useQuery({
    queryKey: jobMonitoringKeys.summary(days),
    queryFn: () => fetchJson<JobMonitoringSummary>(`${API_BASE}/api/job-monitoring/summary?days=${days}`),
    staleTime: CACHE_TIME.SHORT,
  });
}

export function useJobMonitoringLogs(limit = 100, days = 7) {
  return useQuery({
    queryKey: jobMonitoringKeys.logs(limit, days),
    queryFn: () => fetchJson<JobExecutionLog[]>(`${API_BASE}/api/job-monitoring/logs?limit=${limit}&days=${days}`),
    staleTime: CACHE_TIME.SHORT,
  });
}

export function useJobConfigSummary(days = 7) {
  return useQuery({
    queryKey: jobMonitoringKeys.configSummary(days),
    queryFn: () => fetchJson<JobConfigSummary[]>(`${API_BASE}/api/job-monitoring/config-summary?days=${days}`),
    staleTime: CACHE_TIME.SHORT,
  });
}

export function useJobMonitoringHealth() {
  return useQuery({
    queryKey: jobMonitoringKeys.health(),
    queryFn: () => fetchJson<HealthCheckResponse>(`${API_BASE}/api/job-monitoring/health`),
    staleTime: CACHE_TIME.LONG,
  });
}

// Combined Dashboard Hook
export interface JobMonitoringDashboardData {
  summary: JobMonitoringSummary | null;
  logs: JobExecutionLog[];
  configSummary: JobConfigSummary[];
  health: HealthCheckResponse | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useJobMonitoringDashboard(days = 7): JobMonitoringDashboardData {
  const summaryQ = useJobMonitoringSummary(days);
  const logsQ = useJobMonitoringLogs(100, days);
  const configSummaryQ = useJobConfigSummary(days);
  const healthQ = useJobMonitoringHealth();

  const isLoading =
    summaryQ.isLoading || logsQ.isLoading || configSummaryQ.isLoading || healthQ.isLoading;

  const error =
    summaryQ.error || logsQ.error || configSummaryQ.error || healthQ.error;

  const refetch = () => {
    summaryQ.refetch();
    logsQ.refetch();
    configSummaryQ.refetch();
    healthQ.refetch();
  };

  return {
    summary: summaryQ.data ?? null,
    logs: logsQ.data ?? [],
    configSummary: configSummaryQ.data ?? [],
    health: healthQ.data ?? null,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
