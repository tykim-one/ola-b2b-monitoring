import apiClient from '@/lib/api-client';

// ==================== Interfaces ====================

/**
 * Conversation turn in a session
 */
export interface ConversationTurn {
  timestamp: string;
  userInput: string;
  llmResponse: string;
  success: boolean;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Session statistics
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
 * Session list item
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
 * LLM session analysis result
 */
export interface LLMSessionAnalysis {
  isResolved: boolean;
  resolutionTurn: number | null;
  abandonmentReason: string | null;
  qualityScore: number;
  summary?: string;
}

/**
 * Session filter parameters
 */
export interface SessionFilter {
  days?: number;
  tenantId?: string;
  isResolved?: boolean;
  hasFrustration?: boolean;
  limit?: number;
  offset?: number;
}

// ==================== API Functions ====================

/**
 * Get session statistics
 */
export async function getSessionStats(filter?: SessionFilter): Promise<SessionStats> {
  const params = new URLSearchParams();
  if (filter?.days) params.append('days', filter.days.toString());
  if (filter?.tenantId) params.append('tenantId', filter.tenantId);

  const queryString = params.toString();
  const url = `/api/admin/session-analysis/stats${queryString ? `?${queryString}` : ''}`;
  const response = await apiClient.get<SessionStats>(url);
  return response.data;
}

/**
 * Get paginated session list
 */
export async function getSessions(filter?: SessionFilter): Promise<PaginatedSessions> {
  const params = new URLSearchParams();
  if (filter?.days) params.append('days', filter.days.toString());
  if (filter?.tenantId) params.append('tenantId', filter.tenantId);
  if (filter?.isResolved !== undefined) params.append('isResolved', filter.isResolved.toString());
  if (filter?.hasFrustration !== undefined) params.append('hasFrustration', filter.hasFrustration.toString());
  if (filter?.limit) params.append('limit', filter.limit.toString());
  if (filter?.offset) params.append('offset', filter.offset.toString());

  const queryString = params.toString();
  const url = `/api/admin/session-analysis/sessions${queryString ? `?${queryString}` : ''}`;
  const response = await apiClient.get<PaginatedSessions>(url);
  return response.data;
}

/**
 * Get session timeline with conversation history
 */
export async function getSessionTimeline(sessionId: string): Promise<SessionTimeline> {
  const response = await apiClient.get<SessionTimeline>(
    `/api/admin/session-analysis/sessions/${sessionId}/timeline`
  );
  return response.data;
}

/**
 * Analyze session with LLM
 */
export async function analyzeSession(sessionId: string): Promise<LLMSessionAnalysis> {
  const response = await apiClient.post<LLMSessionAnalysis>(
    `/api/admin/session-analysis/sessions/${sessionId}/analyze`
  );
  return response.data;
}

/**
 * Get available tenants for filtering
 */
export async function getSessionTenants(days?: number): Promise<string[]> {
  const params = days ? `?days=${days}` : '';
  const response = await apiClient.get<string[]>(
    `/api/admin/session-analysis/tenants${params}`
  );
  return response.data;
}

// ==================== Export API Object ====================

export const sessionAnalysisApi = {
  getStats: getSessionStats,
  getSessions,
  getTimeline: getSessionTimeline,
  analyzeWithLLM: analyzeSession,
  getTenants: getSessionTenants,
};
