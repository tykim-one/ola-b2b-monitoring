/**
 * 유저 프로필링 API 서비스 클라이언트
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// 질문 카테고리 enum
export enum QuestionCategory {
  PRODUCT_INQUIRY = 'product_inquiry',
  COMPLAINT = 'complaint',
  TECHNICAL_SUPPORT = 'technical_support',
  GENERAL_QUESTION = 'general_question',
  PRICING = 'pricing',
  ACCOUNT = 'account',
  FEATURE_REQUEST = 'feature_request',
  OTHER = 'other',
}

// 카테고리 한글 라벨
export const CategoryLabels: Record<string, string> = {
  product_inquiry: '상품/서비스 문의',
  complaint: '불만/항의',
  technical_support: '기술 지원',
  general_question: '일반 질문',
  pricing: '가격/비용 문의',
  account: '계정/인증',
  feature_request: '기능 요청',
  other: '기타',
};

// 감정 타입
export type Sentiment = 'positive' | 'neutral' | 'negative';

// 카테고리 분포
export interface CategoryDistribution {
  [category: string]: number;
}

// 감정 분석 결과
export interface SentimentAnalysisResult {
  positive: number;
  neutral: number;
  negative: number;
  aggressiveCount: number;
  complaintCount: number;
  frustrationLevel: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

// 상위 카테고리
export interface TopCategory {
  category: string;
  label: string;
  count: number;
  percentage: number;
}

// 유저 프로필 요약
export interface UserProfileSummary {
  userId: string;
  tenantId: string;
  totalMessages: number;
  analyzedMessages: number;
  lastAnalyzedAt: string | null;
  frustrationRate: number;
  aggressiveCount: number;
  sentiment: SentimentAnalysisResult;
  categoryDistribution: CategoryDistribution;
  topCategories: TopCategory[];
  behaviorSummary: string | null;
  mainInterests: string | null;
  painPoints: string | null;
}

// 배치 작업 상태
export type JobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

// 배치 작업 정보
export interface ProfilingJobInfo {
  id: string;
  status: JobStatus;
  targetDate: string;
  tenantId: string | null;
  totalUsers: number;
  processedUsers: number;
  failedUsers: number;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

/**
 * 유저 프로필 조회
 */
export async function fetchUserProfile(
  userId: string,
  days: number = 30
): Promise<UserProfileSummary> {
  const response = await fetch(
    `${API_BASE}/api/user-profiling/${encodeURIComponent(userId)}?days=${days}`,
    { cache: 'no-store' }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch user profile');
  }

  return response.json();
}

/**
 * 유저 실시간 감정 분석
 */
export async function fetchUserSentiment(
  userId: string,
  days: number = 30
): Promise<SentimentAnalysisResult> {
  const response = await fetch(
    `${API_BASE}/api/user-profiling/${encodeURIComponent(userId)}/sentiment?days=${days}`,
    { cache: 'no-store' }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch user sentiment');
  }

  return response.json();
}

/**
 * 유저 카테고리 분포 조회
 */
export async function fetchUserCategories(
  userId: string,
  days: number = 30
): Promise<CategoryDistribution> {
  const response = await fetch(
    `${API_BASE}/api/user-profiling/${encodeURIComponent(userId)}/categories?days=${days}`,
    { cache: 'no-store' }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch user categories');
  }

  return response.json();
}

/**
 * 프로필링 배치 작업 목록 조회
 */
export async function fetchProfilingJobs(
  status?: string,
  limit: number = 20
): Promise<ProfilingJobInfo[]> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  params.append('limit', limit.toString());

  const response = await fetch(
    `${API_BASE}/api/user-profiling/jobs?${params}`,
    { cache: 'no-store' }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch profiling jobs');
  }

  return response.json();
}

/**
 * 프로필링 배치 작업 생성
 */
export async function createProfilingJob(
  targetDate: string,
  tenantId?: string
): Promise<ProfilingJobInfo> {
  const response = await fetch(`${API_BASE}/api/user-profiling/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetDate, tenantId }),
  });

  if (!response.ok) {
    throw new Error('Failed to create profiling job');
  }

  return response.json();
}

/**
 * 프로필링 배치 작업 실행
 */
export async function runProfilingJob(jobId: string): Promise<ProfilingJobInfo> {
  const response = await fetch(
    `${API_BASE}/api/user-profiling/jobs/${jobId}/run`,
    { method: 'POST' }
  );

  if (!response.ok) {
    throw new Error('Failed to run profiling job');
  }

  return response.json();
}
