import apiClient from '../lib/api-client';

// Types
export interface JobScoreStats {
  avgQualityScore: number | null;
  avgRelevance: number | null;
  avgCompleteness: number | null;
  avgClarity: number | null;
  avgScore: number | null;
  scoredCount: number;
}

export interface BatchAnalysisJob {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  targetDate: string;
  tenantId: string | null;
  sampleSize: number;
  promptTemplate: string;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  cancelRequested: boolean;
  createdAt: string;
  _count?: { results: number };
  scoreStats?: JobScoreStats;
}

export interface BatchAnalysisResult {
  id: string;
  jobId: string;
  originalTimestamp: string;
  tenantId: string;
  sessionId: string | null;
  userInput: string;
  llmResponse: string;
  analysisPrompt: string;
  analysisResult: string;
  modelName: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  status: 'SUCCESS' | 'FAILED';
  errorMessage: string | null;
  createdAt: string;
  job?: BatchAnalysisJob;

  // 파싱된 분석 결과 필드들 (DB에 저장된 구조화된 데이터)
  qualityScore: number | null;
  relevance: number | null;
  completeness: number | null;
  clarity: number | null;
  sentiment: string | null;
  summaryText: string | null;
  issues: string | null;        // JSON stringified array
  improvements: string | null;  // JSON stringified array
  missingData: string | null;   // JSON stringified array
  issueCount: number | null;
  avgScore: number | null;
}

export interface AnalysisPromptTemplate {
  id: string;
  name: string;
  description: string | null;
  prompt: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobRequest {
  targetDate: string;
  tenantId?: string;
  sampleSize?: number;
  promptTemplateId?: string;
}

export interface CreatePromptTemplateRequest {
  name: string;
  description?: string;
  prompt: string;
  isDefault?: boolean;
}

export interface UpdatePromptTemplateRequest {
  name?: string;
  description?: string;
  prompt?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface JobFilterParams {
  status?: string;
  tenantId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface ResultFilterParams {
  jobId?: string;
  tenantId?: string;
  status?: string;
  minAvgScore?: number;
  maxAvgScore?: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
  hasIssues?: boolean;
  limit?: number;
  offset?: number;
}

export interface JobStatistics {
  jobs: {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
  };
  results: {
    total: number;
    success: number;
    failed: number;
  };
}

export interface PaginatedJobsResponse {
  jobs: BatchAnalysisJob[];
  total: number;
}

export interface PaginatedResultsResponse {
  results: BatchAnalysisResult[];
  total: number;
}

export interface BatchSchedulerConfig {
  id: string;
  name: string;
  isEnabled: boolean;
  hour: number;
  minute: number;
  daysOfWeek: string;
  timeZone: string;
  targetTenantId: string | null;
  sampleSize: number;
  promptTemplateId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleRequest {
  name: string;
  isEnabled?: boolean;
  hour?: number;
  minute?: number;
  daysOfWeek?: string;
  timeZone?: string;
  targetTenantId?: string;
  sampleSize?: number;
  promptTemplateId?: string;
}

export interface UpdateScheduleRequest {
  name?: string;
  isEnabled?: boolean;
  hour?: number;
  minute?: number;
  daysOfWeek?: string;
  timeZone?: string;
  targetTenantId?: string | null;
  sampleSize?: number;
  promptTemplateId?: string | null;
}

export interface TenantInfo {
  tenant_id: string;
  chat_count: number;
}

// Issue Frequency Types
export interface IssueFrequencyParams {
  jobId?: string;
  tenantId?: string;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

export interface IssueSampleResult {
  id: string;
  userInput: string;
  tenantId: string;
  avgScore: number | null;
}

export interface IssueFrequencyItem {
  issue: string;
  count: number;
  percentage: number;
  sampleResults: IssueSampleResult[];
}

export interface IssueFrequencyResponse {
  issues: IssueFrequencyItem[];
  totalIssues: number;
  totalResults: number;
  filters: {
    jobId?: string;
    tenantId?: string;
    startDate?: string;
    endDate?: string;
  };
}

// Batch Analysis API
export const batchAnalysisApi = {
  // Jobs
  async listJobs(params?: JobFilterParams): Promise<PaginatedJobsResponse> {
    const response = await apiClient.get<PaginatedJobsResponse>(
      '/api/admin/batch-analysis/jobs',
      { params }
    );
    return response.data;
  },

  async getJob(id: string): Promise<BatchAnalysisJob> {
    const response = await apiClient.get<BatchAnalysisJob>(
      `/api/admin/batch-analysis/jobs/${id}`
    );
    return response.data;
  },

  async createJob(data: CreateJobRequest): Promise<BatchAnalysisJob> {
    const response = await apiClient.post<BatchAnalysisJob>(
      '/api/admin/batch-analysis/jobs',
      data
    );
    return response.data;
  },

  async runJob(id: string): Promise<{ jobId: string; status: string }> {
    const response = await apiClient.post<{ jobId: string; status: string }>(
      `/api/admin/batch-analysis/jobs/${id}/run`
    );
    return response.data;
  },

  async deleteJob(id: string): Promise<{ deleted: boolean }> {
    const response = await apiClient.delete<{ deleted: boolean }>(
      `/api/admin/batch-analysis/jobs/${id}`
    );
    return response.data;
  },

  async cancelJob(id: string): Promise<{ jobId: string; message: string }> {
    const response = await apiClient.post<{ jobId: string; message: string }>(
      `/api/admin/batch-analysis/jobs/${id}/cancel`
    );
    return response.data;
  },

  // Results
  async listResults(params?: ResultFilterParams): Promise<PaginatedResultsResponse> {
    const response = await apiClient.get<PaginatedResultsResponse>(
      '/api/admin/batch-analysis/results',
      { params }
    );
    return response.data;
  },

  async getResult(id: string): Promise<BatchAnalysisResult> {
    const response = await apiClient.get<BatchAnalysisResult>(
      `/api/admin/batch-analysis/results/${id}`
    );
    return response.data;
  },

  // Prompt Templates
  async listPromptTemplates(): Promise<AnalysisPromptTemplate[]> {
    const response = await apiClient.get<AnalysisPromptTemplate[]>(
      '/api/admin/batch-analysis/prompts'
    );
    return response.data;
  },

  async getPromptTemplate(id: string): Promise<AnalysisPromptTemplate> {
    const response = await apiClient.get<AnalysisPromptTemplate>(
      `/api/admin/batch-analysis/prompts/${id}`
    );
    return response.data;
  },

  async createPromptTemplate(
    data: CreatePromptTemplateRequest
  ): Promise<AnalysisPromptTemplate> {
    const response = await apiClient.post<AnalysisPromptTemplate>(
      '/api/admin/batch-analysis/prompts',
      data
    );
    return response.data;
  },

  async updatePromptTemplate(
    id: string,
    data: UpdatePromptTemplateRequest
  ): Promise<AnalysisPromptTemplate> {
    const response = await apiClient.put<AnalysisPromptTemplate>(
      `/api/admin/batch-analysis/prompts/${id}`,
      data
    );
    return response.data;
  },

  async deletePromptTemplate(id: string): Promise<{ deleted: boolean }> {
    const response = await apiClient.delete<{ deleted: boolean }>(
      `/api/admin/batch-analysis/prompts/${id}`
    );
    return response.data;
  },

  // Issue Frequency
  async getIssueFrequency(params?: IssueFrequencyParams): Promise<IssueFrequencyResponse> {
    const response = await apiClient.get<IssueFrequencyResponse>(
      '/api/admin/batch-analysis/issue-frequency',
      { params }
    );
    return response.data;
  },

  // Statistics
  async getStatistics(): Promise<JobStatistics> {
    const response = await apiClient.get<JobStatistics>(
      '/api/admin/batch-analysis/stats'
    );
    return response.data;
  },

  // Schedules
  async listSchedules(): Promise<BatchSchedulerConfig[]> {
    const response = await apiClient.get<BatchSchedulerConfig[]>(
      '/api/admin/batch-analysis/schedules'
    );
    return response.data;
  },

  async getSchedule(id: string): Promise<BatchSchedulerConfig> {
    const response = await apiClient.get<BatchSchedulerConfig>(
      `/api/admin/batch-analysis/schedules/${id}`
    );
    return response.data;
  },

  async createSchedule(data: CreateScheduleRequest): Promise<BatchSchedulerConfig> {
    const response = await apiClient.post<BatchSchedulerConfig>(
      '/api/admin/batch-analysis/schedules',
      data
    );
    return response.data;
  },

  async updateSchedule(id: string, data: UpdateScheduleRequest): Promise<BatchSchedulerConfig> {
    const response = await apiClient.put<BatchSchedulerConfig>(
      `/api/admin/batch-analysis/schedules/${id}`,
      data
    );
    return response.data;
  },

  async deleteSchedule(id: string): Promise<{ deleted: boolean }> {
    const response = await apiClient.delete<{ deleted: boolean }>(
      `/api/admin/batch-analysis/schedules/${id}`
    );
    return response.data;
  },

  async toggleSchedule(id: string): Promise<BatchSchedulerConfig> {
    const response = await apiClient.post<BatchSchedulerConfig>(
      `/api/admin/batch-analysis/schedules/${id}/toggle`
    );
    return response.data;
  },

  // Tenants
  async getAvailableTenants(days?: number): Promise<{ tenants: TenantInfo[] }> {
    const response = await apiClient.get<{ tenants: TenantInfo[] }>(
      '/api/admin/batch-analysis/tenants',
      { params: days ? { days } : undefined }
    );
    return response.data;
  },
};
