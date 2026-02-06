import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useMemo } from 'react';
import { CACHE_TIME } from '@/lib/query-client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// ==================== Types ====================

export interface EfficiencyTrendData {
  date: string;
  avg_efficiency_ratio: number;
  min_efficiency_ratio: number;
  max_efficiency_ratio: number;
  total_requests: number;
  avg_input_tokens: number;
  avg_output_tokens: number;
}

export interface CorrelationData {
  tenant_id: string;
  query_length: number;
  response_length: number;
  input_tokens: number;
  output_tokens: number;
  efficiency_ratio: number;
  timestamp: string;
}

export interface RepeatedQueryData {
  query_pattern: string;
  occurrence_count: number;
  unique_tenants: number;
  avg_response_length: number;
  avg_output_tokens: number;
  first_seen: string;
  last_seen: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
}

// ==================== Query Keys ====================

export const qualityKeys = {
  all: ['quality'] as const,
  efficiencyTrend: (projectId: string, days: number) =>
    [...qualityKeys.all, 'efficiency-trend', projectId, { days }] as const,
  correlation: (projectId: string, days: number) =>
    [...qualityKeys.all, 'correlation', projectId, { days }] as const,
  repeatedPatterns: (projectId: string, days: number) =>
    [...qualityKeys.all, 'repeated-patterns', projectId, { days }] as const,
};

// ==================== Fetch Helper ====================

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`);
  }
  const data: ApiResponse<T> = await response.json();
  return data.data;
}

// ==================== Individual Hooks ====================

/**
 * 토큰 효율성 트렌드 조회 (15분 캐시)
 */
export function useEfficiencyTrend(
  projectId: string,
  days = 30,
  options?: Omit<UseQueryOptions<EfficiencyTrendData[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: qualityKeys.efficiencyTrend(projectId, days),
    queryFn: () =>
      fetchJson<EfficiencyTrendData[]>(
        `${API_BASE}/projects/${projectId}/api/quality/efficiency-trend?days=${days}`
      ),
    staleTime: CACHE_TIME.MEDIUM,
    ...options,
  });
}

/**
 * 질문-응답 상관관계 조회 (15분 캐시)
 */
export function useQueryResponseCorrelation(
  projectId: string,
  days = 30,
  options?: Omit<UseQueryOptions<CorrelationData[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: qualityKeys.correlation(projectId, days),
    queryFn: () =>
      fetchJson<CorrelationData[]>(
        `${API_BASE}/projects/${projectId}/api/quality/query-response-correlation?days=${days}`
      ),
    staleTime: CACHE_TIME.MEDIUM,
    ...options,
  });
}

/**
 * 반복 질문 패턴 조회 (15분 캐시)
 */
export function useRepeatedPatterns(
  projectId: string,
  days = 30,
  options?: Omit<UseQueryOptions<RepeatedQueryData[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: qualityKeys.repeatedPatterns(projectId, days),
    queryFn: () =>
      fetchJson<RepeatedQueryData[]>(
        `${API_BASE}/projects/${projectId}/api/quality/repeated-patterns?days=${days}`
      ),
    staleTime: CACHE_TIME.MEDIUM,
    ...options,
  });
}

// ==================== Combined Dashboard Hook ====================

export interface CorrelationDetailData {
  user_input: string;
  llm_response: string;
}

export interface QualityDashboardData {
  efficiencyTrend: EfficiencyTrendData[];
  correlation: CorrelationData[];
  repeatedPatterns: RepeatedQueryData[];
  kpis: {
    avgEfficiency: number;
    totalRequests: number;
    avgResponseLength: number;
    totalFAQCandidates: number;
    highFrequencyPatterns: number;
  };
  isLoading: boolean;
  isEfficiencyLoading: boolean;
  isCorrelationLoading: boolean;
  isPatternsLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * 품질 대시보드 통합 훅
 * - 효율성 트렌드, 상관관계, 반복 패턴 조회
 * - KPI 자동 계산
 * @param projectId - 프로젝트 ID
 * @param days - 조회 기간 (기본: 30일)
 */
export function useQualityDashboard(
  projectId: string,
  days = 30
): QualityDashboardData {
  const efficiencyQuery = useEfficiencyTrend(projectId, days);
  const correlationQuery = useQueryResponseCorrelation(projectId, days);
  const patternsQuery = useRepeatedPatterns(projectId, days);

  const isLoading =
    efficiencyQuery.isLoading ||
    correlationQuery.isLoading ||
    patternsQuery.isLoading;

  const error =
    efficiencyQuery.error || correlationQuery.error || patternsQuery.error;

  const efficiencyTrend = efficiencyQuery.data ?? [];
  const correlation = correlationQuery.data ?? [];
  const repeatedPatterns = patternsQuery.data ?? [];

  // KPI calculations
  const kpis = useMemo(() => {
    const avgEfficiency = efficiencyTrend.length > 0
      ? efficiencyTrend.reduce((sum, d) => sum + (d.avg_efficiency_ratio || 0), 0) / efficiencyTrend.length
      : 0;
    const totalRequests = efficiencyTrend.reduce((sum, d) => sum + d.total_requests, 0);
    const avgResponseLength = correlation.length > 0
      ? correlation.reduce((sum, d) => sum + d.response_length, 0) / correlation.length
      : 0;
    const totalFAQCandidates = repeatedPatterns.length;
    const highFrequencyPatterns = repeatedPatterns.filter((p) => p.occurrence_count >= 5).length;
    return { avgEfficiency, totalRequests, avgResponseLength, totalFAQCandidates, highFrequencyPatterns };
  }, [efficiencyTrend, correlation, repeatedPatterns]);

  const refetch = () => {
    efficiencyQuery.refetch();
    correlationQuery.refetch();
    patternsQuery.refetch();
  };

  return {
    efficiencyTrend,
    correlation,
    repeatedPatterns,
    kpis,
    isLoading,
    isEfficiencyLoading: efficiencyQuery.isLoading,
    isCorrelationLoading: correlationQuery.isLoading,
    isPatternsLoading: patternsQuery.isLoading,
    error: error as Error | null,
    refetch,
  };
}

// ==================== Detail Fetch ====================

/**
 * ScatterPlot 클릭 시 상세 질문/응답 조회
 */
export async function fetchCorrelationDetail(
  projectId: string,
  timestamp: string,
  tenantId: string,
): Promise<CorrelationDetailData | null> {
  const url = `${API_BASE}/projects/${projectId}/api/quality/query-response-detail?timestamp=${encodeURIComponent(timestamp)}&tenantId=${encodeURIComponent(tenantId)}`;
  const response = await fetch(url);
  if (!response.ok) return null;
  const json: ApiResponse<CorrelationDetailData | null> = await response.json();
  return json.data;
}
