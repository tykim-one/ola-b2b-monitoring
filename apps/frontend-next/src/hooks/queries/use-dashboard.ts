import {
  useTenantUsage,
  useCostTrend,
  useHeatmap,
  useRealtimeKPI,
  useHourlyTraffic,
  useErrorAnalysis,
  useAnomalyStats,
} from './use-metrics';
import type {
  TenantUsage,
  CostTrend,
  UsageHeatmapCell,
  RealtimeKPI,
  HourlyTraffic,
  ErrorAnalysis,
  AnomalyStats,
} from '@ola/shared-types';

// ==================== Dashboard Types ====================

export interface BusinessDashboardData {
  tenantUsage: TenantUsage[];
  costTrend: CostTrend[];
  heatmap: UsageHeatmapCell[];
  kpis: {
    totalTokens: number;
    totalRequests: number;
    totalCost: number;
    tenantCount: number;
  };
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export interface OperationsDashboardData {
  realtimeKPI: RealtimeKPI | null;
  hourlyTraffic: HourlyTraffic[];
  errors: ErrorAnalysis[];
  kpis: {
    totalRequests: number;
    successRate: number;
    errorRate: number;
    avgTokens: number;
    activeTenants: number;
  };
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export interface AIPerformanceDashboardData {
  anomalyStats: AnomalyStats[];
  tenantUsage: TenantUsage[];
  kpis: {
    tenantsWithAnomalies: number;
    avgTokenStdDev: number;
    highRiskTenants: number;
  };
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// ==================== Combined Dashboard Hooks ====================

/**
 * 비즈니스 대시보드 통합 훅
 * - 테넌트 사용량, 비용 트렌드, 히트맵 데이터 조회
 * - KPI 자동 계산
 */
export function useBusinessDashboard(projectId: string): BusinessDashboardData {
  const tenantUsageQuery = useTenantUsage(projectId, 30);
  const costTrendQuery = useCostTrend(projectId);
  const heatmapQuery = useHeatmap(projectId);

  const isLoading =
    tenantUsageQuery.isLoading ||
    costTrendQuery.isLoading ||
    heatmapQuery.isLoading;

  const error =
    tenantUsageQuery.error || costTrendQuery.error || heatmapQuery.error;

  const tenantUsage = tenantUsageQuery.data ?? [];
  const costTrend = costTrendQuery.data ?? [];
  const heatmap = heatmapQuery.data ?? [];

  // Aggregated KPIs
  const kpis = {
    totalTokens: tenantUsage.reduce((sum, t) => sum + t.total_tokens, 0),
    totalRequests: tenantUsage.reduce((sum, t) => sum + t.request_count, 0),
    totalCost: costTrend.reduce((sum, c) => sum + c.total_cost, 0),
    tenantCount: tenantUsage.length,
  };

  const refetch = () => {
    tenantUsageQuery.refetch();
    costTrendQuery.refetch();
    heatmapQuery.refetch();
  };

  return {
    tenantUsage,
    costTrend,
    heatmap,
    kpis,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

/**
 * 운영 대시보드 통합 훅
 * - 실시간 KPI, 시간별 트래픽, 에러 분석 조회
 * - 운영 관련 KPI 자동 계산
 */
export function useOperationsDashboard(
  projectId: string
): OperationsDashboardData {
  const realtimeQuery = useRealtimeKPI(projectId);
  const hourlyQuery = useHourlyTraffic(projectId);
  const errorsQuery = useErrorAnalysis(projectId);

  const isLoading =
    realtimeQuery.isLoading || hourlyQuery.isLoading || errorsQuery.isLoading;

  const error = realtimeQuery.error || hourlyQuery.error || errorsQuery.error;

  const realtimeKPI = realtimeQuery.data ?? null;
  const hourlyTraffic = hourlyQuery.data ?? [];
  const errors = errorsQuery.data ?? [];

  // Aggregated KPIs
  const kpis = realtimeKPI
    ? {
        totalRequests: realtimeKPI.total_requests,
        successRate:
          realtimeKPI.total_requests > 0
            ? (realtimeKPI.success_count / realtimeKPI.total_requests) * 100
            : 0,
        errorRate: realtimeKPI.error_rate,
        avgTokens: realtimeKPI.avg_tokens,
        activeTenants: realtimeKPI.active_tenants,
      }
    : {
        totalRequests: 0,
        successRate: 0,
        errorRate: 0,
        avgTokens: 0,
        activeTenants: 0,
      };

  const refetch = () => {
    realtimeQuery.refetch();
    hourlyQuery.refetch();
    errorsQuery.refetch();
  };

  return {
    realtimeKPI,
    hourlyTraffic,
    errors,
    kpis,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

/**
 * AI 성능 대시보드 통합 훅
 * - 이상 탐지 통계, 테넌트 사용량 조회
 * - AI 관련 KPI 자동 계산
 */
export function useAIPerformanceDashboard(
  projectId: string
): AIPerformanceDashboardData {
  const anomalyQuery = useAnomalyStats(projectId);
  const tenantUsageQuery = useTenantUsage(projectId, 30);

  const isLoading = anomalyQuery.isLoading || tenantUsageQuery.isLoading;
  const error = anomalyQuery.error || tenantUsageQuery.error;

  const anomalyStats = anomalyQuery.data ?? [];
  const tenantUsage = tenantUsageQuery.data ?? [];

  // Calculate KPIs
  const tenantsWithAnomalies = anomalyStats.filter(
    (s) => s.stddev_tokens > s.avg_tokens * 0.5
  ).length;

  const avgTokenStdDev =
    anomalyStats.length > 0
      ? anomalyStats.reduce((sum, s) => sum + s.stddev_tokens, 0) /
        anomalyStats.length
      : 0;

  // High risk: stddev > 2x average
  const highRiskTenants = anomalyStats.filter(
    (s) => s.stddev_tokens > s.avg_tokens * 2
  ).length;

  const kpis = {
    tenantsWithAnomalies,
    avgTokenStdDev,
    highRiskTenants,
  };

  const refetch = () => {
    anomalyQuery.refetch();
    tenantUsageQuery.refetch();
  };

  return {
    anomalyStats,
    tenantUsage,
    kpis,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
