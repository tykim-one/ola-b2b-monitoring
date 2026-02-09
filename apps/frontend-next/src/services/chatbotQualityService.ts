import type {
  EmergingQueryPattern,
  SentimentAnalysisResult,
  RephrasedQueryPattern,
  SessionAnalytics,
  TenantQualitySummary,
  ResponseQualityMetrics,
  ApiResponse,
} from '@ola/shared-types';
import apiClient from '@/lib/api-client';

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
  const response = await apiClient.get<ApiResponse<EmergingQueryPattern[]>>(
    `/projects/${projectId}/api/quality/emerging-patterns`,
    { params: { recentDays, historicalDays } }
  );
  return response.data.data;
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
  const response = await apiClient.get<ApiResponse<SentimentAnalysisResult[]>>(
    `/projects/${projectId}/api/quality/sentiment`,
    { params: { days } }
  );
  return response.data.data;
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
  const response = await apiClient.get<ApiResponse<RephrasedQueryPattern[]>>(
    `/projects/${projectId}/api/quality/rephrased-queries`,
    { params: { days } }
  );
  return response.data.data;
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
  const response = await apiClient.get<ApiResponse<SessionAnalytics[]>>(
    `/projects/${projectId}/api/quality/sessions`,
    { params: { days } }
  );
  return response.data.data;
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
  const response = await apiClient.get<ApiResponse<TenantQualitySummary[]>>(
    `/projects/${projectId}/api/quality/tenant-summary`,
    { params: { days } }
  );
  return response.data.data;
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
  const response = await apiClient.get<ApiResponse<ResponseQualityMetrics[]>>(
    `/projects/${projectId}/api/quality/response-metrics`,
    { params: { days } }
  );
  return response.data.data;
}
