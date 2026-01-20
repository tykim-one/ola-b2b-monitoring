import apiClient from '@/lib/api-client';

/**
 * FAQ 분석 요청 파라미터
 */
export interface FAQAnalysisRequest {
  tenantId?: string;
  periodDays: 7 | 14 | 30;
  topN: 10 | 20 | 50;
}

/**
 * FAQ 클러스터 내 개별 질문
 */
export interface FAQClusterQuestion {
  text: string;
  count: number;
  tenantId: string;
}

/**
 * FAQ 클러스터
 */
export interface FAQCluster {
  id: string;
  representativeQuestion: string;
  frequency: number;
  questions: FAQClusterQuestion[];
  reasonAnalysis: string;
  isMerged: boolean;
}

/**
 * FAQ 분석 응답
 */
export interface FAQAnalysisResponse {
  analyzedAt: string;
  totalQuestions: number;
  period: {
    start: string;
    end: string;
    days: number;
  };
  clusters: FAQCluster[];
  filters: {
    tenantId?: string;
    topN: number;
  };
  llmMergeApplied: boolean;
}

/**
 * FAQ 분석 실행
 */
export async function runFAQAnalysis(
  request: FAQAnalysisRequest
): Promise<FAQAnalysisResponse> {
  const response = await apiClient.post<FAQAnalysisResponse>(
    '/api/quality/faq-analysis',
    request
  );
  return response.data;
}

/**
 * FAQ 분석용 테넌트 목록 조회
 */
export async function getFAQTenants(periodDays?: number): Promise<string[]> {
  const params = periodDays ? `?periodDays=${periodDays}` : '';
  const response = await apiClient.get<string[]>(
    `/api/quality/faq-analysis/tenants${params}`
  );
  return response.data;
}

// ==================== Job 관련 타입 ====================

/**
 * FAQ Job
 */
export interface FAQJob {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  tenantId: string | null;
  periodDays: number;
  topN: number;
  totalQuestions: number | null;
  clusterCount: number | null;
  llmMergeApplied: boolean;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  resultCount: number;
}

/**
 * FAQ Job 생성 요청
 */
export interface CreateFAQJobRequest {
  tenantId?: string;
  periodDays: 7 | 14 | 30;
  topN: 10 | 20 | 50;
}

/**
 * FAQ Job 결과 (클러스터)
 */
export interface FAQJobResult {
  id: string;
  jobId: string;
  rank: number;
  representativeQuestion: string;
  frequency: number;
  reasonAnalysis: string;
  isMerged: boolean;
  questions: FAQClusterQuestion[];
  createdAt: string;
}

// ==================== Job API 함수 ====================

/**
 * FAQ Job 목록 조회
 */
export async function getFAQJobs(filter?: {
  status?: string;
  tenantId?: string;
}): Promise<FAQJob[]> {
  const params = new URLSearchParams();
  if (filter?.status) params.append('status', filter.status);
  if (filter?.tenantId) params.append('tenantId', filter.tenantId);

  const queryString = params.toString();
  const url = `/api/quality/faq-analysis/jobs${queryString ? `?${queryString}` : ''}`;
  const response = await apiClient.get<FAQJob[]>(url);
  return response.data;
}

/**
 * FAQ Job 상세 조회
 */
export async function getFAQJob(id: string): Promise<FAQJob> {
  const response = await apiClient.get<FAQJob>(`/api/quality/faq-analysis/jobs/${id}`);
  return response.data;
}

/**
 * FAQ Job 생성
 */
export async function createFAQJob(request: CreateFAQJobRequest): Promise<FAQJob> {
  const response = await apiClient.post<FAQJob>('/api/quality/faq-analysis/jobs', request);
  return response.data;
}

/**
 * FAQ Job 실행
 */
export async function runFAQJob(id: string): Promise<FAQJob> {
  const response = await apiClient.post<FAQJob>(`/api/quality/faq-analysis/jobs/${id}/run`);
  return response.data;
}

/**
 * FAQ Job 삭제
 */
export async function deleteFAQJob(id: string): Promise<void> {
  await apiClient.delete(`/api/quality/faq-analysis/jobs/${id}`);
}

/**
 * FAQ Job 결과 조회
 */
export async function getFAQJobResults(jobId: string): Promise<FAQJobResult[]> {
  const response = await apiClient.get<FAQJobResult[]>(
    `/api/quality/faq-analysis/jobs/${jobId}/results`
  );
  return response.data;
}

export const faqAnalysisApi = {
  // 온디맨드 분석
  runAnalysis: runFAQAnalysis,
  getTenants: getFAQTenants,
  // Job 관리
  getJobs: getFAQJobs,
  getJob: getFAQJob,
  createJob: createFAQJob,
  runJob: runFAQJob,
  deleteJob: deleteFAQJob,
  getJobResults: getFAQJobResults,
};
