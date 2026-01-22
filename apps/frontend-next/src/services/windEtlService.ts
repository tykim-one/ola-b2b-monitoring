const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/wind-etl`;

// Types
export interface WindETLRun {
  id: number;
  startedAt: string;
  finishedAt: string | null;
  status: 'SUCCESS' | 'FAILED' | 'RUNNING';
  filesFound: number;
  filesProcessed: number;
  filesSkipped: number;
  filesMoved: number;
  recordsInserted: number;
  recordsUpdated: number;
  totalRecords: number;
  errorCount: number;
  errors: string[] | null;
  durationMs: number | null;
}

export interface WindETLSummary {
  totalRuns: number;
  successCount: number;
  failureCount: number;
  runningCount: number;
  successRate: number;
  avgDurationMs: number;
  avgFilesProcessed: number;
  avgRecordsInserted: number;
  lastRunAt: string | null;
  lastRunStatus: string | null;
}

export interface WindETLTrend {
  period: string;
  runCount: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  totalFilesProcessed: number;
  totalRecordsInserted: number;
  avgDurationMs: number;
}

export interface WindETLError {
  errorMessage: string;
  occurrenceCount: number;
  firstSeen: string;
  lastSeen: string;
  affectedRuns: number[];
}

export interface WindETLFileStats {
  date: string;
  totalFilesFound: number;
  totalFilesProcessed: number;
  totalFilesSkipped: number;
  totalFilesMoved: number;
  processingRate: number;
}

export interface WindETLRecordStats {
  date: string;
  totalRecordsInserted: number;
  totalRecordsUpdated: number;
  totalRecords: number;
  avgRecordsPerRun: number;
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

// Wind ETL API
export const windEtlApi = {
  async healthCheck(): Promise<HealthCheckResponse> {
    const response = await fetch(`${API_BASE}/health`);
    if (!response.ok) throw new Error('Health check failed');
    return response.json();
  },

  async getRecentRuns(limit = 50): Promise<WindETLRun[]> {
    const response = await fetch(`${API_BASE}/runs?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch runs');
    const data: ApiResponse<WindETLRun[]> = await response.json();
    return data.data;
  },

  async getSummary(days = 7): Promise<WindETLSummary> {
    const response = await fetch(`${API_BASE}/summary?days=${days}`);
    if (!response.ok) throw new Error('Failed to fetch summary');
    const data: ApiResponse<WindETLSummary> = await response.json();
    return data.data;
  },

  async getDailyTrend(days = 30): Promise<WindETLTrend[]> {
    const response = await fetch(`${API_BASE}/trend/daily?days=${days}`);
    if (!response.ok) throw new Error('Failed to fetch daily trend');
    const data: ApiResponse<WindETLTrend[]> = await response.json();
    return data.data;
  },

  async getHourlyTrend(hours = 24): Promise<WindETLTrend[]> {
    const response = await fetch(`${API_BASE}/trend/hourly?hours=${hours}`);
    if (!response.ok) throw new Error('Failed to fetch hourly trend');
    const data: ApiResponse<WindETLTrend[]> = await response.json();
    return data.data;
  },

  async getErrorAnalysis(days = 7): Promise<WindETLError[]> {
    const response = await fetch(`${API_BASE}/errors?days=${days}`);
    if (!response.ok) throw new Error('Failed to fetch errors');
    const data: ApiResponse<WindETLError[]> = await response.json();
    return data.data;
  },

  async getFileStats(days = 30): Promise<WindETLFileStats[]> {
    const response = await fetch(`${API_BASE}/stats/files?days=${days}`);
    if (!response.ok) throw new Error('Failed to fetch file stats');
    const data: ApiResponse<WindETLFileStats[]> = await response.json();
    return data.data;
  },

  async getRecordStats(days = 30): Promise<WindETLRecordStats[]> {
    const response = await fetch(`${API_BASE}/stats/records?days=${days}`);
    if (!response.ok) throw new Error('Failed to fetch record stats');
    const data: ApiResponse<WindETLRecordStats[]> = await response.json();
    return data.data;
  },
};
