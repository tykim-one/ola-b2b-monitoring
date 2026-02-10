const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/job-monitoring`;

// Types
export interface JobExecutionLog {
  insertId: string;
  configName: string;
  durationMs: number | null;
  fetched: number | null;
  failed: number | null;
  processed: number | null;
  saved: number | null;
  successRate: number | null;
  step: string;
  message: string;
  appTimestamp: string;
  logTimestamp: string;
}

export interface JobConfigSummary {
  configName: string;
  totalRuns: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgDurationMs: number | null;
}

export interface JobMonitoringSummary {
  totalJobs: number;
  successCount: number;
  failureCount: number;
  overallSuccessRate: number;
  avgDurationMs: number | null;
  uniqueConfigs: number;
  lastRunAt: string | null;
}

export interface HealthCheckResponse {
  success: boolean;
  healthy: boolean;
  datasource: string;
  view: string;
}

// API Response wrapper
interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  cached?: boolean;
  cacheTTL?: string;
}

// Job Monitoring API
export const jobMonitoringApi = {
  async healthCheck(): Promise<HealthCheckResponse> {
    const response = await fetch(`${API_BASE}/health`);
    if (!response.ok) throw new Error('Health check failed');
    return response.json();
  },

  async getLogs(limit = 100, days = 7): Promise<JobExecutionLog[]> {
    const response = await fetch(`${API_BASE}/logs?limit=${limit}&days=${days}`);
    if (!response.ok) throw new Error('Failed to fetch logs');
    const data: ApiResponse<JobExecutionLog[]> = await response.json();
    return data.data;
  },

  async getConfigSummary(days = 7): Promise<JobConfigSummary[]> {
    const response = await fetch(`${API_BASE}/config-summary?days=${days}`);
    if (!response.ok) throw new Error('Failed to fetch config summary');
    const data: ApiResponse<JobConfigSummary[]> = await response.json();
    return data.data;
  },

  async getSummary(days = 7): Promise<JobMonitoringSummary> {
    const response = await fetch(`${API_BASE}/summary?days=${days}`);
    if (!response.ok) throw new Error('Failed to fetch summary');
    const data: ApiResponse<JobMonitoringSummary> = await response.json();
    return data.data;
  },
};
