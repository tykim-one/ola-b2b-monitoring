export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

export interface B2BLog {
  user_input: string;
  timestamp: { value: string } | string;
  tenant_id: string;
  llm_response: string;
  // Optional legacy fields or future fields
  id?: string;
  level?: LogLevel;
  message?: string;
  service?: string;
  latencyMs?: number;
  partnerId?: string;
  traceId?: string;
  statusCode?: number;
}

// ==================== 메트릭 타입 ====================

export interface RealtimeKPI {
  total_requests: number;
  success_count: number;
  fail_count: number;
  error_rate: number;
  total_tokens: number;
  avg_tokens: number;
  total_input_tokens: number;
  total_output_tokens: number;
  active_tenants: number;
}

export interface HourlyTraffic {
  hour: string;
  request_count: number;
  success_count: number;
  fail_count: number;
  total_tokens: number;
  avg_tokens: number;
}

export interface DailyTraffic {
  date: string;
  request_count: number;
  success_count: number;
  fail_count: number;
  total_tokens: number;
  avg_tokens: number;
  active_tenants: number;
}

export interface TenantUsage {
  tenant_id: string;
  request_count: number;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  avg_tokens: number;
  fail_count: number;
  error_rate: number;
}

export interface UsageHeatmapCell {
  day_of_week: number; // 1-7 (Sunday-Saturday)
  hour: number; // 0-23
  request_count: number;
  avg_tokens: number;
}

export interface CostTrend {
  date: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  input_cost: number;
  output_cost: number;
  total_cost: number;
}

export interface ErrorAnalysis {
  fail_reason: string | null;
  count: number;
  tenant_id: string;
}

export interface TokenEfficiency {
  tenant_id: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  efficiency_ratio: number;
  success: boolean;
  timestamp: string;
}

export interface AnomalyStats {
  tenant_id: string;
  avg_tokens: number;
  stddev_tokens: number;
  avg_input_tokens: number;
  stddev_input_tokens: number;
  sample_count: number;
  p99_tokens: number;
}

export interface QueryPattern {
  tenant_id: string;
  query_length: number;
  total_tokens: number;
  timestamp: string;
}

// ==================== 유저 분석 메트릭 ====================

/** 유저별 요청 수 통계 */
export interface UserRequestCount {
  userId: string; // x_enc_data value
  requestCount: number;
  successCount: number;
  errorCount: number;
  successRate: number;
}

/** 유저별 토큰 사용량 */
export interface UserTokenUsage {
  userId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  avgInputTokens: number;
  avgOutputTokens: number;
  requestCount: number;
}

/** 유저별 질문 패턴 */
export interface UserQuestionPattern {
  userId: string;
  question: string; // truncated user_input
  frequency: number;
  lastAsked: string; // ISO timestamp
}

/** 유저 분석 요약 */
export interface UserAnalyticsSummary {
  totalUsers: number;
  totalRequests: number;
  avgRequestsPerUser: number;
  topUsers: UserRequestCount[];
}

/** 유저 목록 아이템 (통합 통계) */
export interface UserListItem {
  userId: string;
  questionCount: number;
  successCount: number;
  errorCount: number;
  successRate: number;
  totalTokens: number;
  avgTokens: number;
  firstActivity: string;
  lastActivity: string;
}

/** 유저 활동 상세 */
export interface UserActivityDetail {
  timestamp: string;
  userInput: string;
  llmResponse: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  success: boolean;
}

// ==================== 품질 분석 메트릭 ====================

/** 일별 토큰 효율성 트렌드 */
export interface TokenEfficiencyTrend {
  date: string;
  avg_efficiency_ratio: number;
  min_efficiency_ratio: number;
  max_efficiency_ratio: number;
  total_requests: number;
  avg_input_tokens: number;
  avg_output_tokens: number;
}

/** 질문-응답 길이 상관관계 */
export interface QueryResponseCorrelation {
  tenant_id: string;
  query_length: number;
  response_length: number;
  input_tokens: number;
  output_tokens: number;
  efficiency_ratio: number;
  timestamp: string;
}

/** 반복 질문 패턴 */
export interface RepeatedQueryPattern {
  query_pattern: string;
  occurrence_count: number;
  unique_tenants: number;
  avg_response_length: number;
  avg_output_tokens: number;
  first_seen: string;
  last_seen: string;
}

// ==================== 파생 지표 ====================

export interface DerivedMetrics {
  tokenEfficiency: number;      // output_tokens / input_tokens
  successRate: number;          // 성공 요청 / 전체 요청 (%)
  errorRate: number;            // 실패 요청 / 전체 요청 (%)
  requestsPerMinute: number;    // 분당 요청 수
  avgTokensPerRequest: number;  // 요청당 평균 토큰
  tokenCostEstimate: number;    // 예상 비용 ($)
}

// ==================== 캐시 통계 ====================

export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  hitRate: number;
}

// ==================== 차트 설정 ====================

export interface ChartConfig {
  id: string;
  type: 'AreaChart' | 'BarChart' | 'PieChart' | 'RadialBarChart' | 'ScatterChart' | 'ComposedChart' | 'Heatmap';
  title: string;
  dataKey: string;
  xAxis?: string;
  yAxis?: string;
  refreshInterval?: number; // ms
}

// ==================== API 응답 타입 ====================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  cached?: boolean;
  cacheTTL?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  message: string;
}

// ==================== 어드민 시스템 타입 ====================

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: UserInfo;
}

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
}

export interface TokenPayload {
  sub: string; // user id
  email: string;
  roles: string[];
  permissions: string[];
  iat?: number;
  exp?: number;
}

export interface RefreshTokenResponse {
  accessToken: string;
}

// User Management Types
export interface User {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  roles?: Role[];
}

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  roleIds?: string[];
}

export interface UpdateUserRequest {
  name?: string;
  isActive?: boolean;
  roleIds?: string[];
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Role & Permission Types
export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions?: Permission[];
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
  permissionIds?: string[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissionIds?: string[];
}

// Filter Types
export interface SavedFilter {
  id: string;
  userId: string;
  name: string;
  description?: string;
  criteria: FilterCriteria;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FilterCriteria {
  dateRange?: {
    start: string;
    end: string;
  };
  tenantIds?: string[];
  severities?: string[];
  minTokens?: number;
  maxTokens?: number;
  searchQuery?: string;
}

export interface CreateFilterRequest {
  name: string;
  description?: string;
  criteria: FilterCriteria;
  isDefault?: boolean;
}

export interface UpdateFilterRequest {
  name?: string;
  description?: string;
  criteria?: FilterCriteria;
  isDefault?: boolean;
}

// Analysis Session Types
export interface AnalysisSession {
  id: string;
  userId: string;
  title: string;
  context?: AnalysisContext;
  messages?: AnalysisMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisContext {
  metricsSnapshot?: {
    realtimeKPI?: RealtimeKPI;
    tenantUsage?: TenantUsage[];
    costTrend?: CostTrend[];
    anomalyStats?: AnomalyStats[];
  };
  filterCriteria?: FilterCriteria;
}

export interface AnalysisMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: AnalysisMessageMetadata;
  createdAt: string;
}

export interface AnalysisMessageMetadata {
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  latencyMs?: number;
}

export interface CreateSessionRequest {
  title?: string;
  context?: AnalysisContext;
}

// Alias for backwards compatibility
export type CreateAnalysisSessionRequest = CreateSessionRequest;

export interface SendMessageRequest {
  content: string;
  includeMetrics?: boolean; // Include current metrics in context
}

export interface SendMessageResponse {
  message: AnalysisMessage;
  assistantResponse: AnalysisMessage;
}

// Audit Log Types
export interface AuditLog {
  id: string;
  userId?: string;
  userName?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// Paginated Response
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Standard Error Response
export interface AdminApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// Health Check
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: {
      status: 'up' | 'down';
      latencyMs?: number;
    };
    llm?: {
      status: 'up' | 'down' | 'unconfigured';
      provider?: string;
    };
  };
  timestamp: string;
}

// ==================== 챗봇 품질 분석 타입 ====================

/** 신규/급증 질문 패턴 */
export interface EmergingQueryPattern {
  normalizedQuery: string;
  recentCount: number;
  historicalCount: number;
  patternType: 'NEW' | 'EMERGING';
  growthRate: number | null;
  firstSeen: string;
  lastSeen: string;
}

/** 감정 분석 결과 (BigQuery 쿼리 결과) */
export interface SentimentAnalysisResult {
  timestamp: string;
  tenantId: string;
  userId: string | null;
  userInput: string;
  sentimentFlag: 'FRUSTRATED' | 'EMOTIONAL' | 'URGENT' | 'NEUTRAL';
  frustrationKeywords: string[];
  success: boolean;
  sessionId: string | null;
}

/** 재질문 패턴 (동일 세션 내 유사 질문) */
export interface RephrasedQueryPattern {
  sessionId: string;
  tenantId: string;
  userId: string | null;
  queryCount: number;
  uniqueQueries: number;
  similarityScore: number;
  queries: string[];
  timestamps: string[];
  hasResolution: boolean;
}

/** 세션 분석 통계 */
export interface SessionAnalytics {
  sessionId: string;
  tenantId: string;
  userId: string | null;
  turnCount: number;
  successCount: number;
  failCount: number;
  sessionSuccessRate: number;
  sessionStart: string;
  sessionEnd: string;
  durationMinutes: number;
  hasFrustration: boolean;
}

/** 테넌트별 품질 요약 */
export interface TenantQualitySummary {
  tenantId: string;
  totalSessions: number;
  avgTurnsPerSession: number;
  sessionSuccessRate: number;
  singleTurnRate: number;
  frustratedSessionCount: number;
  frustrationRate: number;
  avgSessionDurationMinutes: number;
}

/** 불만 알림 데이터 */
export interface FrustrationAlert {
  id: string;
  userId: string | null;
  tenantId: string;
  frustrationLevel: number;
  triggerReason: string;
  recentQueries: string[];
  timestamp: string;
  status: 'pending' | 'acknowledged' | 'resolved';
}

/** 응답 품질 지표 */
export interface ResponseQualityMetrics {
  date: string;
  tenantId: string;
  avgResponseLength: number;
  tooShortCount: number;
  tooLongCount: number;
  failedQueryAvgLength: number;
  totalRequests: number;
}

// ==================== 글로벌 챗봇 타입 ====================

/** 챗봇 요청 */
export interface ChatbotRequest {
  message: string;
  pageContext: string;
  sessionId?: string;
}

/** 챗봇 메시지 */
export interface ChatbotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: ChatbotMessageMetadata;
}

/** 챗봇 메시지 메타데이터 */
export interface ChatbotMessageMetadata {
  pageContext?: string;
  model?: string;
  tokens?: number;
  latencyMs?: number;
}

/** 챗봇 응답 */
export interface ChatbotResponse {
  sessionId: string;
  userMessage: ChatbotMessage;
  assistantMessage: ChatbotMessage;
}

/** 챗봇 세션 */
export interface ChatbotSession {
  id: string;
  messages: ChatbotMessage[];
  createdAt: string;
  lastActivity: string;
}

// ==================== 도메인 집계 타입 ====================

/**
 * Service domain types for grouping projects.
 */
export type ServiceDomain = 'chatbot' | 'report' | 'analytics';

/**
 * Project-level KPI with project identifier.
 */
export interface ProjectKPI {
  projectId: string;
  kpi: RealtimeKPI;
}

/**
 * Domain-level aggregated KPI summary.
 * Combines KPI data from all projects in a domain.
 */
export interface DomainSummaryKPI {
  domain: ServiceDomain;
  totalRequests: number;
  successRate: number;
  totalTokens: number;
  avgTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  projectCount: number;
  activeTenants: number;
  byProject: ProjectKPI[];
}

/**
 * Global aggregated KPI summary.
 * Combines KPI data from all projects across all domains.
 */
export interface GlobalSummaryKPI {
  totalRequests: number;
  successRate: number;
  totalTokens: number;
  avgTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  projectCount: number;
  activeTenants: number;
  domainCount: number;
  byProject: ProjectKPI[];
  byDomain: Record<ServiceDomain, DomainSummaryKPI>;
}
