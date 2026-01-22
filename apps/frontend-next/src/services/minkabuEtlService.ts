const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/minkabu-etl`;

// Types
export interface MinkabuETLRun {
  id: number;
  startedAt: string;
  finishedAt: string | null;
  status: 'SUCCESS' | 'FAILED' | 'RUNNING';
  indexCount: number;
  todayHeadlines: number;
  yesterdayHeadlines: number;
  articlesFetched: number;
  errorCount: number;
  errors: string[] | null;
  durationMs: number | null;
}

export interface MinkabuETLSummary {
  totalRuns: number;
  successCount: number;
  failureCount: number;
  runningCount: number;
  successRate: number;
  avgDurationMs: number;
  avgArticlesFetched: number;
  avgTodayHeadlines: number;
  lastRunAt: string | null;
  lastRunStatus: string | null;
}

export interface MinkabuETLTrend {
  period: string;
  runCount: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  totalArticlesFetched: number;
  totalTodayHeadlines: number;
  avgDurationMs: number;
}

export interface MinkabuETLError {
  errorMessage: string;
  occurrenceCount: number;
  firstSeen: string;
  lastSeen: string;
  affectedRuns: number[];
}

export interface MinkabuETLHeadlineStats {
  date: string;
  totalTodayHeadlines: number;
  totalYesterdayHeadlines: number;
  totalArticlesFetched: number;
  avgHeadlinesPerRun: number;
}

export interface MinkabuETLIndexStats {
  date: string;
  totalIndexCount: number;
  avgIndexPerRun: number;
  runCount: number;
}

export interface HealthCheckResponse {
  success: boolean;
  healthy: boolean;
  datasource: string;
  table: string;
}

// API Response wrapper
interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  cached?: boolean;
  cacheTTL?: string;
}

// Minkabu ETL API
export const minkabuEtlApi = {
  async healthCheck(): Promise<HealthCheckResponse> {
    const response = await fetch(`${API_BASE}/health`);
    if (!response.ok) throw new Error('Health check failed');
    return response.json();
  },

  async getRecentRuns(limit = 50): Promise<MinkabuETLRun[]> {
    const response = await fetch(`${API_BASE}/runs?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch runs');
    const data: ApiResponse<MinkabuETLRun[]> = await response.json();
    return data.data;
  },

  async getSummary(days = 7): Promise<MinkabuETLSummary> {
    const response = await fetch(`${API_BASE}/summary?days=${days}`);
    if (!response.ok) throw new Error('Failed to fetch summary');
    const data: ApiResponse<MinkabuETLSummary> = await response.json();
    return data.data;
  },

  async getDailyTrend(days = 30): Promise<MinkabuETLTrend[]> {
    const response = await fetch(`${API_BASE}/trend/daily?days=${days}`);
    if (!response.ok) throw new Error('Failed to fetch daily trend');
    const data: ApiResponse<MinkabuETLTrend[]> = await response.json();
    return data.data;
  },

  async getHourlyTrend(hours = 24): Promise<MinkabuETLTrend[]> {
    const response = await fetch(`${API_BASE}/trend/hourly?hours=${hours}`);
    if (!response.ok) throw new Error('Failed to fetch hourly trend');
    const data: ApiResponse<MinkabuETLTrend[]> = await response.json();
    return data.data;
  },

  async getErrorAnalysis(days = 7): Promise<MinkabuETLError[]> {
    const response = await fetch(`${API_BASE}/errors?days=${days}`);
    if (!response.ok) throw new Error('Failed to fetch errors');
    const data: ApiResponse<MinkabuETLError[]> = await response.json();
    return data.data;
  },

  async getHeadlineStats(days = 30): Promise<MinkabuETLHeadlineStats[]> {
    const response = await fetch(`${API_BASE}/stats/headlines?days=${days}`);
    if (!response.ok) throw new Error('Failed to fetch headline stats');
    const data: ApiResponse<MinkabuETLHeadlineStats[]> = await response.json();
    return data.data;
  },

  async getIndexStats(days = 30): Promise<MinkabuETLIndexStats[]> {
    const response = await fetch(`${API_BASE}/stats/index?days=${days}`);
    if (!response.ok) throw new Error('Failed to fetch index stats');
    const data: ApiResponse<MinkabuETLIndexStats[]> = await response.json();
    return data.data;
  },
};
