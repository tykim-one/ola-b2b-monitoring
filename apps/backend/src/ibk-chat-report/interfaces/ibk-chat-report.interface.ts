export type ReportStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

export interface DailyKPI {
  totalRequests: number;
  successCount: number;
  failCount: number;
  successRate: number;
  p50Tokens: number;
  p90Tokens: number;
  p99Tokens: number;
  maxTokens: number;
  avgTokens: number;
}

export interface QuestionTypeRow {
  questionType: string;
  total: number;
  successCount: number;
  successRate: number;
}

export interface RepresentativeQuestion {
  questionType: string;
  userInput: string;
  responseNode: string;
  failReason: string | null;
}

export interface FailAnalysisRow {
  failCategory: string;
  responseNode: string;
  count: number;
  sampleQuestions: string[];
}

export interface TokenBurstCase {
  userInput: string;
  questionType: string;
  responseNode: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
}

export interface CandidateQuestion {
  userInput: string;
  responseNode: string;
  failReason: string;
  questionType: string;
  totalTokens: number;
}

export interface ScoredQuestion extends CandidateQuestion {
  score: number;
  tags: string[];
}

export interface CollectedReportData {
  targetDate: string;
  kpi: DailyKPI;
  questionTypeStats: QuestionTypeRow[];
  representativeQuestions: RepresentativeQuestion[];
  failAnalysis: FailAnalysisRow[];
  tokenBurstCases: TokenBurstCase[];
  highValueQuestions: ScoredQuestion[];
  exploratoryClusterSamples: CandidateQuestion[];
}
