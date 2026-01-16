import apiClient from '../lib/api-client';

// Types
export interface BatchAnalysisJob {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  targetDate: string;
  tenantId: string | null;
  sampleSize: number;
  promptTemplate: string;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  _count?: { results: number };
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

  // Statistics
  async getStatistics(): Promise<JobStatistics> {
    const response = await apiClient.get<JobStatistics>(
      '/api/admin/batch-analysis/stats'
    );
    return response.data;
  },
};
