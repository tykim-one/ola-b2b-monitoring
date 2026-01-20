import type {
  EmergingQueryPattern,
  SentimentAnalysisResult,
  RephrasedQueryPattern,
  SessionAnalytics,
  TenantQualitySummary,
  ResponseQualityMetrics,
  ApiResponse,
} from '@ola/shared-types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * 신규/급증 질문 패턴 조회
 * @param projectId - 프로젝트 ID
 * @param recentDays - 최근 기간 (기본: 7일)
 * @param historicalDays - 과거 비교 기간 (기본: 30일)
 */
export async function getEmergingPatterns(
  projectId: string,
  recentDays = 7,
  historicalDays = 30
): Promise<EmergingQueryPattern[]> {
  const url = `${API_BASE_URL}/projects/${projectId}/api/quality/emerging-patterns?recentDays=${recentDays}&historicalDays=${historicalDays}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch emerging patterns');
  const data: ApiResponse<EmergingQueryPattern[]> = await response.json();
  return data.data;
}

/**
 * 감정 분석 결과 조회 (불만/감정 표현 쿼리)
 * @param projectId - 프로젝트 ID
 * @param days - 조회 기간 (기본: 7일)
 */
export async function getSentimentAnalysis(
  projectId: string,
  days = 7
): Promise<SentimentAnalysisResult[]> {
  const url = `${API_BASE_URL}/projects/${projectId}/api/quality/sentiment?days=${days}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch sentiment analysis');
  const data: ApiResponse<SentimentAnalysisResult[]> = await response.json();
  return data.data;
}

/**
 * 재질문 패턴 조회 (동일 세션 내 유사 질문)
 * @param projectId - 프로젝트 ID
 * @param days - 조회 기간 (기본: 7일)
 */
export async function getRephrasedQueries(
  projectId: string,
  days = 7
): Promise<RephrasedQueryPattern[]> {
  const url = `${API_BASE_URL}/projects/${projectId}/api/quality/rephrased-queries?days=${days}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch rephrased queries');
  const data: ApiResponse<RephrasedQueryPattern[]> = await response.json();
  return data.data;
}

/**
 * 세션 분석 통계 조회
 * @param projectId - 프로젝트 ID
 * @param days - 조회 기간 (기본: 7일)
 */
export async function getSessionAnalytics(
  projectId: string,
  days = 7
): Promise<SessionAnalytics[]> {
  const url = `${API_BASE_URL}/projects/${projectId}/api/quality/sessions?days=${days}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch session analytics');
  const data: ApiResponse<SessionAnalytics[]> = await response.json();
  return data.data;
}

/**
 * 테넌트별 품질 요약 조회
 * @param projectId - 프로젝트 ID
 * @param days - 조회 기간 (기본: 30일)
 */
export async function getTenantQualitySummary(
  projectId: string,
  days = 30
): Promise<TenantQualitySummary[]> {
  const url = `${API_BASE_URL}/projects/${projectId}/api/quality/tenant-summary?days=${days}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch tenant quality summary');
  const data: ApiResponse<TenantQualitySummary[]> = await response.json();
  return data.data;
}

/**
 * 응답 품질 지표 조회
 * @param projectId - 프로젝트 ID
 * @param days - 조회 기간 (기본: 30일)
 */
export async function getResponseQualityMetrics(
  projectId: string,
  days = 30
): Promise<ResponseQualityMetrics[]> {
  const url = `${API_BASE_URL}/projects/${projectId}/api/quality/response-metrics?days=${days}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch response quality metrics');
  const data: ApiResponse<ResponseQualityMetrics[]> = await response.json();
  return data.data;
}
