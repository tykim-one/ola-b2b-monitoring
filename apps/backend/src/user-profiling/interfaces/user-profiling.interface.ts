/**
 * 유저 프로필링 인터페이스 정의
 */

// 질문 카테고리 enum
export enum QuestionCategory {
  PRODUCT_INQUIRY = 'product_inquiry', // 상품/서비스 문의
  COMPLAINT = 'complaint', // 불만/항의
  TECHNICAL_SUPPORT = 'technical_support', // 기술 지원
  GENERAL_QUESTION = 'general_question', // 일반 질문
  PRICING = 'pricing', // 가격/비용 문의
  ACCOUNT = 'account', // 계정/인증 관련
  FEATURE_REQUEST = 'feature_request', // 기능 요청
  OTHER = 'other', // 기타
}

// 카테고리 한글 라벨
export const CategoryLabels: Record<QuestionCategory, string> = {
  [QuestionCategory.PRODUCT_INQUIRY]: '상품/서비스 문의',
  [QuestionCategory.COMPLAINT]: '불만/항의',
  [QuestionCategory.TECHNICAL_SUPPORT]: '기술 지원',
  [QuestionCategory.GENERAL_QUESTION]: '일반 질문',
  [QuestionCategory.PRICING]: '가격/비용 문의',
  [QuestionCategory.ACCOUNT]: '계정/인증',
  [QuestionCategory.FEATURE_REQUEST]: '기능 요청',
  [QuestionCategory.OTHER]: '기타',
};

// 감정 타입
export type Sentiment = 'positive' | 'neutral' | 'negative';

// BigQuery에서 가져온 유저 메시지
export interface UserMessage {
  timestamp: Date;
  userInput: string;
  llmResponse: string;
  success: boolean;
  tenantId: string;
  sessionId?: string;
}

// 카테고리 분류 결과
export interface CategoryClassificationResult {
  category: QuestionCategory;
  confidence: number; // 0-1
  sentiment: Sentiment;
  isAggressive: boolean;
  reasoning?: string;
}

// 카테고리 분포
export interface CategoryDistribution {
  [category: string]: number;
}

// 감정 분석 결과
export interface SentimentAnalysisResult {
  positive: number; // 긍정 비율
  neutral: number; // 중립 비율
  negative: number; // 부정 비율
  aggressiveCount: number; // 공격적 표현 수
  complaintCount: number; // 불만 표현 수
  frustrationLevel: number; // 불만 수준 (0-1)
  trend: 'increasing' | 'decreasing' | 'stable';
}

// 유저 프로필 요약
export interface UserProfileSummary {
  userId: string;
  tenantId: string;

  // 기본 통계
  totalMessages: number;
  analyzedMessages: number;
  lastAnalyzedAt: Date | null;

  // 감정 분석
  frustrationRate: number;
  aggressiveCount: number;
  sentiment: SentimentAnalysisResult;

  // 카테고리
  categoryDistribution: CategoryDistribution;
  topCategories: Array<{
    category: QuestionCategory;
    label: string;
    count: number;
    percentage: number;
  }>;

  // LLM 생성 요약
  behaviorSummary: string | null;
  mainInterests: string | null;
  painPoints: string | null;
}

// 프로필 생성 결과 (LLM 응답)
export interface ProfileGenerationResult {
  behaviorSummary: string;
  mainInterests: string;
  painPoints: string;
}

// 배치 작업 상태
export type JobStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

// 배치 작업 정보
export interface ProfilingJobInfo {
  id: string;
  status: JobStatus;
  targetDate: Date;
  tenantId: string | null;
  totalUsers: number;
  processedUsers: number;
  failedUsers: number;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
}
