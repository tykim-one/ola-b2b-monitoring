/**
 * Session Analysis Interfaces
 */

/**
 * Single conversation turn in a session
 */
export interface ConversationTurn {
  timestamp: Date;
  userInput: string;
  llmResponse: string;
  success: boolean;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Session resolution detection result
 */
export interface ResolutionResult {
  isResolved: boolean;
  method: 'HEURISTIC' | 'LLM' | 'UNKNOWN';
  turn: number | null;
  confidence?: number;
}

/**
 * LLM analysis result for session
 */
export interface LLMSessionAnalysis {
  isResolved: boolean;
  resolutionTurn: number | null;
  abandonmentReason: string | null;
  qualityScore: number;
  summary?: string;
}

/**
 * Session analysis result
 */
export interface SessionAnalysisResult {
  sessionId: string;
  tenantId: string;
  userId: string | null;
  turnCount: number;
  isResolved: boolean;
  resolutionMethod: 'HEURISTIC' | 'LLM' | 'UNKNOWN';
  resolutionTurn: number | null;
  hasFrustration: boolean;
  abandonmentReason: string | null;
  qualityScore: number | null;
  sessionStart: Date;
  sessionEnd: Date;
  durationMinutes: number;
}

/**
 * Session statistics summary
 */
export interface SessionStats {
  totalSessions: number;
  resolvedSessions: number;
  resolutionRate: number;
  avgTurnsToResolution: number;
  abandonmentRate: number;
  avgSessionDuration: number;
  frustratedSessions: number;
  frustrationRate: number;
}

/**
 * Session list item for table display
 */
export interface SessionListItem {
  sessionId: string;
  tenantId: string;
  userId: string | null;
  turnCount: number;
  isResolved: boolean;
  resolutionMethod: 'HEURISTIC' | 'LLM' | 'UNKNOWN';
  hasFrustration: boolean;
  sessionStart: string;
  sessionEnd: string;
  durationMinutes: number;
}

/**
 * Session timeline with conversation history
 */
export interface SessionTimeline {
  sessionId: string;
  tenantId: string;
  userId: string | null;
  turns: ConversationTurn[];
  analysis: SessionAnalysisResult | null;
}

/**
 * Paginated sessions response
 */
export interface PaginatedSessions {
  sessions: SessionListItem[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Session analysis job status
 */
export type SessionJobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

/**
 * Session analysis job
 */
export interface SessionAnalysisJob {
  id: string;
  status: SessionJobStatus;
  targetDate: Date;
  tenantId: string | null;
  totalSessions: number;
  analyzedSessions: number;
  createdAt: Date;
  completedAt: Date | null;
  errorMessage: string | null;
}
