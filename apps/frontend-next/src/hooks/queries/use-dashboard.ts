import { useMemo } from 'react';
import {
  useTenantUsage,
  useCostTrend,
  useHeatmap,
  useRealtimeKPI,
  useHourlyTraffic,
  useErrorAnalysis,
  useAnomalyStats,
  useTokenEfficiency,
  type TokenEfficiencyData,
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
  tokenEfficiency: TokenEfficiencyData[];
  tenantUsage: TenantUsage[];
  kpis: {
    tenantsWithAnomalies: number;
    avgTokenStdDev: number;
    highRiskTenants: number;
    avgEfficiency: number;
    avgTokens: number;
    successRate: number;
    totalP99: number;
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
 * @param projectId - 프로젝트 ID
 * @param days - 조회 기간 (기본: 30일)
 */
export function useBusinessDashboard(projectId: string, days = 30): BusinessDashboardData {
  const tenantUsageQuery = useTenantUsage(projectId, days);
  const costTrendQuery = useCostTrend(projectId, days);
  const heatmapQuery = useHeatmap(projectId, days);

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
  const kpis = useMemo(
    () => ({
      totalTokens: tenantUsage.reduce((sum, t) => sum + t.total_tokens, 0),
      totalRequests: tenantUsage.reduce((sum, t) => sum + t.request_count, 0),
      totalCost: costTrend.reduce((sum, c) => sum + c.total_cost, 0),
      tenantCount: tenantUsage.length,
    }),
    [tenantUsage, costTrend]
  );

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
 * @param projectId - 프로젝트 ID
 * @param days - 조회 기간 (기본: 서버 기본값)
 */
export function useOperationsDashboard(
  projectId: string,
  days?: number
): OperationsDashboardData {
  const realtimeQuery = useRealtimeKPI(projectId, days);
  const hourlyQuery = useHourlyTraffic(projectId, days);
  const errorsQuery = useErrorAnalysis(projectId, days);

  const isLoading =
    realtimeQuery.isLoading || hourlyQuery.isLoading || errorsQuery.isLoading;

  const error = realtimeQuery.error || hourlyQuery.error || errorsQuery.error;

  const realtimeKPI = realtimeQuery.data ?? null;
  const hourlyTraffic = hourlyQuery.data ?? [];
  const errors = errorsQuery.data ?? [];

  // Aggregated KPIs
  const kpis = useMemo(
    () =>
      realtimeKPI
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
          },
    [realtimeKPI]
  );

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
 * - 이상 탐지 통계, 토큰 효율성, 테넌트 사용량 조회
 * - AI 관련 KPI 자동 계산
 * @param projectId - 프로젝트 ID
 * @param days - 조회 기간 (기본: 7일)
 */
export function useAIPerformanceDashboard(
  projectId: string,
  days = 7
): AIPerformanceDashboardData {
  const anomalyQuery = useAnomalyStats(projectId, days);
  const tokenEfficiencyQuery = useTokenEfficiency(projectId, days);
  const tenantUsageQuery = useTenantUsage(projectId, 30);

  const isLoading =
    anomalyQuery.isLoading ||
    tokenEfficiencyQuery.isLoading ||
    tenantUsageQuery.isLoading;
  const error =
    anomalyQuery.error || tokenEfficiencyQuery.error || tenantUsageQuery.error;

  const anomalyStats = anomalyQuery.data ?? [];
  const tokenEfficiency = tokenEfficiencyQuery.data ?? [];
  const tenantUsage = tenantUsageQuery.data ?? [];

  // Calculate KPIs
  const kpis = useMemo(() => {
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

    // Token efficiency KPIs
    const avgEfficiency =
      tokenEfficiency.length > 0
        ? tokenEfficiency.reduce((sum, t) => sum + (t.efficiency_ratio || 0), 0) /
          tokenEfficiency.length
        : 0;

    const avgTokens =
      tokenEfficiency.length > 0
        ? tokenEfficiency.reduce((sum, t) => sum + t.total_tokens, 0) /
          tokenEfficiency.length
        : 0;

    const successCount = tokenEfficiency.filter((t) => t.success === true).length;
    const successRate =
      tokenEfficiency.length > 0
        ? (successCount / tokenEfficiency.length) * 100
        : 0;

    const totalP99 = anomalyStats.reduce(
      (max, s) => Math.max(max, s.p99_tokens || 0),
      0
    );

    return {
      tenantsWithAnomalies,
      avgTokenStdDev,
      highRiskTenants,
      avgEfficiency,
      avgTokens,
      successRate,
      totalP99,
    };
  }, [anomalyStats, tokenEfficiency]);

  const refetch = () => {
    anomalyQuery.refetch();
    tokenEfficiencyQuery.refetch();
    tenantUsageQuery.refetch();
  };

  return {
    anomalyStats,
    tokenEfficiency,
    tenantUsage,
    kpis,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
