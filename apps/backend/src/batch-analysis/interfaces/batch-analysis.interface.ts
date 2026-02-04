/**
 * Batch Analysis Interfaces
 */

/**
 * Chat sample from BigQuery for analysis
 */
export interface ChatSample {
  timestamp: Date;
  tenant_id: string;
  session_id: string | null;
  user_input: string;
  llm_response: string;
  success: boolean;
}

/**
 * Tenant info for a specific date
 */
export interface TenantForDate {
  tenant_id: string;
  chat_count: number;
}

/**
 * Analysis result for a single chat
 */
export interface ChatAnalysisResult {
  sample: ChatSample;
  analysisPrompt: string;
  analysisResult: string;
  modelName: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
}

/**
 * Batch analysis job status
 */
export type JobStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

/**
 * Job creation options
 */
export interface CreateJobOptions {
  targetDate: Date;
  tenantId?: string;
  sampleSize?: number;
  promptTemplateId?: string;
}

/**
 * Job filter options for listing
 */
export interface JobFilterOptions {
  status?: JobStatus;
  tenantId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Result filter options
 */
export interface ResultFilterOptions {
  jobId?: string;
  tenantId?: string;
  status?: 'SUCCESS' | 'FAILED';
  limit?: number;
  offset?: number;
}
