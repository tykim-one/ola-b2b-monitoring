import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { CACHE_TIME } from '@/lib/query-client';
import type {
  RealtimeKPI,
  HourlyTraffic,
  DailyTraffic,
  TenantUsage,
  UsageHeatmapCell,
  CostTrend,
  ErrorAnalysis,
  AnomalyStats,
  ApiResponse,
} from '@ola/shared-types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// ==================== Query Keys ====================

export const metricsKeys = {
  all: ['metrics'] as const,
  realtime: (projectId: string) => [...metricsKeys.all, 'realtime', projectId] as const,
  hourly: (projectId: string) => [...metricsKeys.all, 'hourly', projectId] as const,
  daily: (projectId: string, days?: number) => [...metricsKeys.all, 'daily', projectId, { days }] as const,
  tenantUsage: (projectId: string, days?: number) =>
    [...metricsKeys.all, 'tenant-usage', projectId, { days }] as const,
  costTrend: (projectId: string, days?: number) => [...metricsKeys.all, 'cost-trend', projectId, { days }] as const,
  heatmap: (projectId: string, days?: number) => [...metricsKeys.all, 'heatmap', projectId, { days }] as const,
  errors: (projectId: string) => [...metricsKeys.all, 'errors', projectId] as const,
  anomaly: (projectId: string) => [...metricsKeys.all, 'anomaly', projectId] as const,
};

// ==================== Fetch Functions ====================

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`);
  }
  const data: ApiResponse<T> = await response.json();
  return data.data;
}

// ==================== Query Hooks ====================

/**
 * 실시간 KPI 조회 (5분 캐시, 자동 갱신)
 * @param days - 조회 기간 (기본: 서버 기본값)
 */
export function useRealtimeKPI(
  projectId: string,
  days?: number,
  options?: Omit<UseQueryOptions<RealtimeKPI>, 'queryKey' | 'queryFn'>
) {
  const daysParam = days ? `?days=${days}` : '';
  return useQuery({
    queryKey: [...metricsKeys.realtime(projectId), { days }],
    queryFn: () => fetchJson<RealtimeKPI>(
      `${API_BASE}/projects/${projectId}/api/metrics/realtime${daysParam}`
    ),
    staleTime: CACHE_TIME.SHORT,
    refetchInterval: CACHE_TIME.SHORT,
    ...options,
  });
}

/**
 * 시간별 트래픽 조회 (15분 캐시)
 * @param days - 조회 기간 (기본: 서버 기본값)
 */
export function useHourlyTraffic(
  projectId: string,
  days?: number,
  options?: Omit<UseQueryOptions<HourlyTraffic[]>, 'queryKey' | 'queryFn'>
) {
  const daysParam = days ? `?days=${days}` : '';
  return useQuery({
    queryKey: [...metricsKeys.hourly(projectId), { days }],
    queryFn: () => fetchJson<HourlyTraffic[]>(
      `${API_BASE}/projects/${projectId}/api/metrics/hourly${daysParam}`
    ),
    staleTime: CACHE_TIME.MEDIUM,
    ...options,
  });
}

/**
 * 일별 트래픽 조회 (15분 캐시)
 * @param days - 조회 기간 (기본: 30일)
 */
export function useDailyTraffic(
  projectId: string,
  days = 30,
  options?: Omit<UseQueryOptions<DailyTraffic[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: metricsKeys.daily(projectId, days),
    queryFn: () => fetchJson<DailyTraffic[]>(
      `${API_BASE}/projects/${projectId}/api/metrics/daily?days=${days}`
    ),
    staleTime: CACHE_TIME.MEDIUM,
    ...options,
  });
}

/**
 * 테넌트별 사용량 조회 (15분 캐시)
 */
export function useTenantUsage(
  projectId: string,
  days = 30,
  options?: Omit<UseQueryOptions<TenantUsage[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: metricsKeys.tenantUsage(projectId, days),
    queryFn: () => fetchJson<TenantUsage[]>(
      `${API_BASE}/projects/${projectId}/api/analytics/tenant-usage?days=${days}`
    ),
    staleTime: CACHE_TIME.MEDIUM,
    ...options,
  });
}

/**
 * 비용 트렌드 조회 (15분 캐시)
 * @param days - 조회 기간 (기본: 30일)
 */
export function useCostTrend(
  projectId: string,
  days = 30,
  options?: Omit<UseQueryOptions<CostTrend[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: metricsKeys.costTrend(projectId, days),
    queryFn: () => fetchJson<CostTrend[]>(
      `${API_BASE}/projects/${projectId}/api/analytics/cost-trend?days=${days}`
    ),
    staleTime: CACHE_TIME.MEDIUM,
    ...options,
  });
}

/**
 * 사용량 히트맵 조회 (15분 캐시)
 * @param days - 조회 기간 (기본: 30일)
 */
export function useHeatmap(
  projectId: string,
  days = 30,
  options?: Omit<UseQueryOptions<UsageHeatmapCell[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: metricsKeys.heatmap(projectId, days),
    queryFn: () => fetchJson<UsageHeatmapCell[]>(
      `${API_BASE}/projects/${projectId}/api/analytics/heatmap?days=${days}`
    ),
    staleTime: CACHE_TIME.MEDIUM,
    ...options,
  });
}

/**
 * 에러 분석 조회 (5분 캐시)
 */
export function useErrorAnalysis(
  projectId: string,
  options?: Omit<UseQueryOptions<ErrorAnalysis[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: metricsKeys.errors(projectId),
    queryFn: () => fetchJson<ErrorAnalysis[]>(
      `${API_BASE}/projects/${projectId}/api/ai/error-analysis`
    ),
    staleTime: CACHE_TIME.SHORT,
    ...options,
  });
}

/**
 * 이상 탐지 통계 조회 (5분 캐시)
 * @param days - 조회 기간 (기본: 서버 기본값)
 */
export function useAnomalyStats(
  projectId: string,
  days?: number,
  options?: Omit<UseQueryOptions<AnomalyStats[]>, 'queryKey' | 'queryFn'>
) {
  const daysParam = days ? `?days=${days}` : '';
  return useQuery({
    queryKey: [...metricsKeys.anomaly(projectId), { days }],
    queryFn: () => fetchJson<AnomalyStats[]>(
      `${API_BASE}/projects/${projectId}/api/ai/anomaly-stats${daysParam}`
    ),
    staleTime: CACHE_TIME.SHORT,
    ...options,
  });
}

// ==================== Token Efficiency ====================

export interface TokenEfficiencyData {
  tenant_id: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  efficiency_ratio: number;
  success: boolean;
  timestamp: string;
}

/**
 * 토큰 효율성 데이터 조회 (5분 캐시)
 * @param days - 조회 기간 (기본: 7일)
 */
export function useTokenEfficiency(
  projectId: string,
  days = 7,
  options?: Omit<UseQueryOptions<TokenEfficiencyData[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...metricsKeys.all, 'token-efficiency', projectId, { days }],
    queryFn: () => fetchJson<TokenEfficiencyData[]>(
      `${API_BASE}/projects/${projectId}/api/ai/token-efficiency?days=${days}`
    ),
    staleTime: CACHE_TIME.SHORT,
    ...options,
  });
}
