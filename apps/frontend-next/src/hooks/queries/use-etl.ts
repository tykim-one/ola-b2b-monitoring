import { useQuery } from '@tanstack/react-query';
import { CACHE_TIME } from '@/lib/query-client';
import type {
  WindETLRun,
  WindETLSummary,
  WindETLTrend,
  WindETLError,
  WindETLFileStats,
  HealthCheckResponse as WindHealthCheckResponse,
} from '@/services/windEtlService';
import type {
  MinkabuETLRun,
  MinkabuETLSummary,
  MinkabuETLTrend,
  MinkabuETLError,
  MinkabuETLHeadlineStats,
  HealthCheckResponse as MinkabuHealthCheckResponse,
} from '@/services/minkabuEtlService';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// ==================== Fetch Helper ====================

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`API 요청 실패: ${response.status}`);
  const json = await response.json();
  return json.data !== undefined ? json.data : json;
}

// ==================== Query Keys ====================

export const etlKeys = {
  all: ['etl'] as const,

  // Wind
  wind: () => [...etlKeys.all, 'wind'] as const,
  windSummary: (days: number) => [...etlKeys.wind(), 'summary', { days }] as const,
  windRuns: (limit: number) => [...etlKeys.wind(), 'runs', { limit }] as const,
  windDailyTrend: (days: number) => [...etlKeys.wind(), 'daily-trend', { days }] as const,
  windFileStats: (days: number) => [...etlKeys.wind(), 'file-stats', { days }] as const,
  windErrors: (days: number) => [...etlKeys.wind(), 'errors', { days }] as const,
  windHealth: () => [...etlKeys.wind(), 'health'] as const,

  // Minkabu
  minkabu: () => [...etlKeys.all, 'minkabu'] as const,
  minkabuSummary: (days: number) => [...etlKeys.minkabu(), 'summary', { days }] as const,
  minkabuRuns: (limit: number) => [...etlKeys.minkabu(), 'runs', { limit }] as const,
  minkabuDailyTrend: (days: number) => [...etlKeys.minkabu(), 'daily-trend', { days }] as const,
  minkabuHeadlineStats: (days: number) => [...etlKeys.minkabu(), 'headline-stats', { days }] as const,
  minkabuErrors: (days: number) => [...etlKeys.minkabu(), 'errors', { days }] as const,
  minkabuHealth: () => [...etlKeys.minkabu(), 'health'] as const,
};

// ==================== Wind ETL Hooks ====================

export function useWindSummary(days = 7) {
  return useQuery({
    queryKey: etlKeys.windSummary(days),
    queryFn: () => fetchJson<WindETLSummary>(`${API_BASE}/api/wind-etl/summary?days=${days}`),
    staleTime: CACHE_TIME.SHORT,
  });
}

export function useWindRecentRuns(limit = 10) {
  return useQuery({
    queryKey: etlKeys.windRuns(limit),
    queryFn: () => fetchJson<WindETLRun[]>(`${API_BASE}/api/wind-etl/runs?limit=${limit}`),
    staleTime: CACHE_TIME.SHORT,
  });
}

export function useWindDailyTrend(days = 7) {
  return useQuery({
    queryKey: etlKeys.windDailyTrend(days),
    queryFn: () => fetchJson<WindETLTrend[]>(`${API_BASE}/api/wind-etl/trend/daily?days=${days}`),
    staleTime: CACHE_TIME.MEDIUM,
  });
}

export function useWindFileStats(days = 7) {
  return useQuery({
    queryKey: etlKeys.windFileStats(days),
    queryFn: () => fetchJson<WindETLFileStats[]>(`${API_BASE}/api/wind-etl/stats/files?days=${days}`),
    staleTime: CACHE_TIME.MEDIUM,
  });
}

export function useWindErrors(days = 7) {
  return useQuery({
    queryKey: etlKeys.windErrors(days),
    queryFn: () => fetchJson<WindETLError[]>(`${API_BASE}/api/wind-etl/errors?days=${days}`),
    staleTime: CACHE_TIME.SHORT,
  });
}

export function useWindHealth() {
  return useQuery({
    queryKey: etlKeys.windHealth(),
    queryFn: () => fetchJson<WindHealthCheckResponse>(`${API_BASE}/api/wind-etl/health`),
    staleTime: CACHE_TIME.LONG,
  });
}

// ==================== Minkabu ETL Hooks ====================

export function useMinkabuSummary(days = 7) {
  return useQuery({
    queryKey: etlKeys.minkabuSummary(days),
    queryFn: () => fetchJson<MinkabuETLSummary>(`${API_BASE}/api/minkabu-etl/summary?days=${days}`),
    staleTime: CACHE_TIME.SHORT,
  });
}

export function useMinkabuRecentRuns(limit = 10) {
  return useQuery({
    queryKey: etlKeys.minkabuRuns(limit),
    queryFn: () => fetchJson<MinkabuETLRun[]>(`${API_BASE}/api/minkabu-etl/runs?limit=${limit}`),
    staleTime: CACHE_TIME.SHORT,
  });
}

export function useMinkabuDailyTrend(days = 7) {
  return useQuery({
    queryKey: etlKeys.minkabuDailyTrend(days),
    queryFn: () => fetchJson<MinkabuETLTrend[]>(`${API_BASE}/api/minkabu-etl/trend/daily?days=${days}`),
    staleTime: CACHE_TIME.MEDIUM,
  });
}

export function useMinkabuHeadlineStats(days = 7) {
  return useQuery({
    queryKey: etlKeys.minkabuHeadlineStats(days),
    queryFn: () => fetchJson<MinkabuETLHeadlineStats[]>(`${API_BASE}/api/minkabu-etl/stats/headlines?days=${days}`),
    staleTime: CACHE_TIME.MEDIUM,
  });
}

export function useMinkabuErrors(days = 7) {
  return useQuery({
    queryKey: etlKeys.minkabuErrors(days),
    queryFn: () => fetchJson<MinkabuETLError[]>(`${API_BASE}/api/minkabu-etl/errors?days=${days}`),
    staleTime: CACHE_TIME.SHORT,
  });
}

export function useMinkabuHealth() {
  return useQuery({
    queryKey: etlKeys.minkabuHealth(),
    queryFn: () => fetchJson<MinkabuHealthCheckResponse>(`${API_BASE}/api/minkabu-etl/health`),
    staleTime: CACHE_TIME.LONG,
  });
}

// ==================== Combined Dashboard Hooks ====================

export interface WindETLDashboardData {
  summary: WindETLSummary | null;
  recentRuns: WindETLRun[];
  dailyTrend: WindETLTrend[];
  fileStats: WindETLFileStats[];
  errors: WindETLError[];
  health: WindHealthCheckResponse | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Wind ETL 대시보드 통합 훅
 * - 요약, 최근 실행, 일별 트렌드, 파일 통계, 에러, 헬스체크 조회
 * - 5분 자동 갱신 (react-query refetchInterval)
 */
export function useWindETLDashboard(days = 7): WindETLDashboardData {
  const summaryQ = useWindSummary(days);
  const runsQ = useWindRecentRuns(10);
  const trendQ = useWindDailyTrend(days);
  const fileStatsQ = useWindFileStats(days);
  const errorsQ = useWindErrors(days);
  const healthQ = useWindHealth();

  const isLoading =
    summaryQ.isLoading || runsQ.isLoading || trendQ.isLoading ||
    fileStatsQ.isLoading || errorsQ.isLoading || healthQ.isLoading;

  const error =
    summaryQ.error || runsQ.error || trendQ.error ||
    fileStatsQ.error || errorsQ.error || healthQ.error;

  const refetch = () => {
    summaryQ.refetch();
    runsQ.refetch();
    trendQ.refetch();
    fileStatsQ.refetch();
    errorsQ.refetch();
    healthQ.refetch();
  };

  return {
    summary: summaryQ.data ?? null,
    recentRuns: runsQ.data ?? [],
    dailyTrend: trendQ.data ?? [],
    fileStats: fileStatsQ.data ?? [],
    errors: errorsQ.data ?? [],
    health: healthQ.data ?? null,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

export interface MinkabuETLDashboardData {
  summary: MinkabuETLSummary | null;
  recentRuns: MinkabuETLRun[];
  dailyTrend: MinkabuETLTrend[];
  headlineStats: MinkabuETLHeadlineStats[];
  errors: MinkabuETLError[];
  health: MinkabuHealthCheckResponse | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Minkabu ETL 대시보드 통합 훅
 * - 요약, 최근 실행, 일별 트렌드, 헤드라인 통계, 에러, 헬스체크 조회
 * - 5분 자동 갱신 (react-query refetchInterval)
 */
export function useMinkabuETLDashboard(days = 7): MinkabuETLDashboardData {
  const summaryQ = useMinkabuSummary(days);
  const runsQ = useMinkabuRecentRuns(10);
  const trendQ = useMinkabuDailyTrend(days);
  const headlineStatsQ = useMinkabuHeadlineStats(days);
  const errorsQ = useMinkabuErrors(days);
  const healthQ = useMinkabuHealth();

  const isLoading =
    summaryQ.isLoading || runsQ.isLoading || trendQ.isLoading ||
    headlineStatsQ.isLoading || errorsQ.isLoading || healthQ.isLoading;

  const error =
    summaryQ.error || runsQ.error || trendQ.error ||
    headlineStatsQ.error || errorsQ.error || healthQ.error;

  const refetch = () => {
    summaryQ.refetch();
    runsQ.refetch();
    trendQ.refetch();
    headlineStatsQ.refetch();
    errorsQ.refetch();
    healthQ.refetch();
  };

  return {
    summary: summaryQ.data ?? null,
    recentRuns: runsQ.data ?? [],
    dailyTrend: trendQ.data ?? [],
    headlineStats: headlineStatsQ.data ?? [],
    errors: errorsQ.data ?? [],
    health: healthQ.data ?? null,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
