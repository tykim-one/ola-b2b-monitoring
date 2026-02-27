import { useQuery } from '@tanstack/react-query';
import { CACHE_TIME } from '@/lib/query-client';
import apiClient from '@/lib/api-client';

const API_BASE = '/api/hana-mts';

// API Traffic types
export interface ApiTrafficKPI {
  totalRequests: number;
  errorCount: number;
  errorRate: number;
  avgDurationMs: number;
  p95DurationMs: number;
  p99DurationMs: number;
  uniqueClients: number;
}

export interface HourlyApiTraffic {
  hourKst: number;
  requestCount: number;
  errorCount: number;
  avgDurationMs: number;
}

export interface EndpointStats {
  path: string;
  method: string;
  requestCount: number;
  errorCount: number;
  errorRate: number;
  avgDurationMs: number;
  p95DurationMs: number;
}

export interface SlowRequest {
  timestamp: string;
  method: string;
  path: string;
  query: string;
  status: number;
  durationMs: number;
  clientIp: string;
}

export interface ApiError {
  timestamp: string;
  method: string;
  path: string;
  query: string;
  status: number;
  durationMs: number;
  clientIp: string;
  requestId: string;
}

// Batch types
export interface BatchSyncSummary {
  totalRuns: number;
  avgDurationSec: number;
  lastRunAt: string;
  lastWindCount: number;
  lastMinkabuCount: number;
}

export interface BatchSyncRun {
  timestamp: string;
  message: string;
  durationSec: number | null;
  cnWindCount: number | null;
  jpMinkabuCount: number | null;
}

export interface DailyBatchTrend {
  dateKst: string;
  runCount: number;
  avgDurationSec: number;
  totalWindCount: number;
  totalMinkabuCount: number;
}

export const hanaMtsKeys = {
  all: ['hana-mts'] as const,
  apiTraffic: (date?: string) => [...hanaMtsKeys.all, 'api-traffic', date] as const,
  hourly: (date?: string) => [...hanaMtsKeys.all, 'hourly', date] as const,
  endpoints: (date?: string) => [...hanaMtsKeys.all, 'endpoints', date] as const,
  slowRequests: (date?: string) => [...hanaMtsKeys.all, 'slow-requests', date] as const,
  apiErrors: (date?: string) => [...hanaMtsKeys.all, 'api-errors', date] as const,
  batchSummary: (date?: string) => [...hanaMtsKeys.all, 'batch-summary', date] as const,
  batchRuns: (date?: string) => [...hanaMtsKeys.all, 'batch-runs', date] as const,
  batchTrend: (days?: number) => [...hanaMtsKeys.all, 'batch-trend', days] as const,
};

// API Traffic hooks

export function useHanaMtsApiKPI(date?: string) {
  return useQuery({
    queryKey: hanaMtsKeys.apiTraffic(date),
    queryFn: async () => {
      const response = await apiClient.get<ApiTrafficKPI>(
        `${API_BASE}/api-traffic/kpi`,
        {
          params: { ...(date && { date }) },
        },
      );
      return response.data;
    },
    staleTime: CACHE_TIME.SHORT,
  });
}

export function useHanaMtsHourlyTraffic(date?: string) {
  return useQuery({
    queryKey: hanaMtsKeys.hourly(date),
    queryFn: async () => {
      const response = await apiClient.get<HourlyApiTraffic[]>(
        `${API_BASE}/api-traffic/hourly`,
        {
          params: { ...(date && { date }) },
        },
      );
      return response.data;
    },
    staleTime: CACHE_TIME.MEDIUM,
  });
}

export function useHanaMtsEndpoints(date?: string) {
  return useQuery({
    queryKey: hanaMtsKeys.endpoints(date),
    queryFn: async () => {
      const response = await apiClient.get<EndpointStats[]>(
        `${API_BASE}/api-traffic/endpoints`,
        {
          params: { ...(date && { date }) },
        },
      );
      return response.data;
    },
    staleTime: CACHE_TIME.MEDIUM,
  });
}

export function useHanaMtsSlowRequests(date?: string, limit?: number) {
  return useQuery({
    queryKey: hanaMtsKeys.slowRequests(date),
    queryFn: async () => {
      const response = await apiClient.get<SlowRequest[]>(
        `${API_BASE}/api-traffic/slow-requests`,
        {
          params: {
            ...(date && { date }),
            ...(limit && { limit }),
          },
        },
      );
      return response.data;
    },
    staleTime: CACHE_TIME.SHORT,
  });
}

export function useHanaMtsApiErrors(date?: string, limit?: number) {
  return useQuery({
    queryKey: hanaMtsKeys.apiErrors(date),
    queryFn: async () => {
      const response = await apiClient.get<ApiError[]>(
        `${API_BASE}/api-traffic/errors`,
        {
          params: {
            ...(date && { date }),
            ...(limit && { limit }),
          },
        },
      );
      return response.data;
    },
    staleTime: CACHE_TIME.SHORT,
  });
}

// Batch hooks

export function useHanaMtsBatchSummary(date?: string) {
  return useQuery({
    queryKey: hanaMtsKeys.batchSummary(date),
    queryFn: async () => {
      const response = await apiClient.get<BatchSyncSummary>(
        `${API_BASE}/batch/summary`,
        {
          params: { ...(date && { date }) },
        },
      );
      return response.data;
    },
    staleTime: CACHE_TIME.SHORT,
  });
}

export function useHanaMtsBatchRuns(date?: string) {
  return useQuery({
    queryKey: hanaMtsKeys.batchRuns(date),
    queryFn: async () => {
      const response = await apiClient.get<BatchSyncRun[]>(
        `${API_BASE}/batch/runs`,
        {
          params: { ...(date && { date }) },
        },
      );
      return response.data;
    },
    staleTime: CACHE_TIME.SHORT,
  });
}

export function useHanaMtsBatchTrend(days?: number) {
  return useQuery({
    queryKey: hanaMtsKeys.batchTrend(days),
    queryFn: async () => {
      const response = await apiClient.get<DailyBatchTrend[]>(
        `${API_BASE}/batch/trend`,
        {
          params: { ...(days && { days }) },
        },
      );
      return response.data;
    },
    staleTime: CACHE_TIME.MEDIUM,
  });
}
