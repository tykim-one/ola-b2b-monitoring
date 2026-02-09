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
  /** 사용자 입력 텍스트 (상세 분석용) */
  user_input?: string;
  /** LLM 응답 텍스트 (상세 분석용) */
  llm_response?: string;
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

// ==================== 문제 채팅 모니터링 타입 ====================

// --- 필드/연산자 레지스트리 ---

/** 필드 데이터 타입 */
export type RuleFieldDataType = 'numeric' | 'text' | 'boolean';

/** 규칙에서 사용할 수 있는 필드 정의 */
export interface RuleFieldDefinition {
  field: string;
  label: string;
  dataType: RuleFieldDataType;
  sqlExpression: string;
  description?: string;
  requiresCTE?: boolean;
}

/** 연산자에서 기대하는 값 타입 */
export type RuleValueType = 'number' | 'string' | 'string_array' | 'boolean';

/** 연산자 정의 */
export interface RuleOperatorDefinition {
  operator: string;
  label: string;
  sqlTemplate: string;
  applicableTo: RuleFieldDataType[];
  valueType: RuleValueType;
}

/** 사용 가능한 BigQuery 필드 화이트리스트 */
export const RULE_FIELDS: RuleFieldDefinition[] = [
  {
    field: 'output_tokens',
    label: 'Output 토큰',
    dataType: 'numeric',
    sqlExpression: 'COALESCE(SAFE_CAST(output_tokens AS FLOAT64), 0)',
    description: 'LLM 응답 토큰 수',
  },
  {
    field: 'input_tokens',
    label: 'Input 토큰',
    dataType: 'numeric',
    sqlExpression: 'COALESCE(SAFE_CAST(input_tokens AS FLOAT64), 0)',
    description: '사용자 입력 토큰 수',
  },
  {
    field: 'total_tokens',
    label: 'Total 토큰',
    dataType: 'numeric',
    sqlExpression: 'COALESCE(SAFE_CAST(total_tokens AS FLOAT64), 0)',
    description: '전체 토큰 수 (input + output)',
  },
  {
    field: 'token_ratio',
    label: '토큰 비율 (output/input)',
    dataType: 'numeric',
    sqlExpression:
      'SAFE_DIVIDE(COALESCE(SAFE_CAST(output_tokens AS FLOAT64), 0), NULLIF(COALESCE(SAFE_CAST(input_tokens AS FLOAT64), 0), 0))',
    description: 'output 토큰 / input 토큰 비율',
  },
  {
    field: 'llm_response',
    label: 'LLM 응답',
    dataType: 'text',
    sqlExpression: 'COALESCE(llm_response, \'\')',
    description: 'LLM이 생성한 응답 텍스트',
  },
  {
    field: 'user_input',
    label: '사용자 입력',
    dataType: 'text',
    sqlExpression: 'COALESCE(user_input, \'\')',
    description: '사용자가 입력한 질문 텍스트',
  },
  {
    field: 'success',
    label: '성공 여부',
    dataType: 'boolean',
    sqlExpression: 'success',
    description: '요청 성공 여부 (true/false)',
  },
  {
    field: 'response_length',
    label: '응답 글자 수',
    dataType: 'numeric',
    sqlExpression: "LENGTH(COALESCE(llm_response, ''))",
    description: 'LLM 응답의 글자 수',
  },
  {
    field: 'korean_ratio',
    label: '한글 비율',
    dataType: 'numeric',
    sqlExpression: "SAFE_DIVIDE(LENGTH(REGEXP_REPLACE(COALESCE(llm_response, ''), '[^가-힣]', '')), NULLIF(LENGTH(REGEXP_REPLACE(COALESCE(llm_response, ''), '\\\\s', '')), 0))",
    description: '응답 텍스트 내 한글 문자 비율 (0.0~1.0)',
  },
  {
    field: 'response_ends_complete',
    label: '응답 완결성',
    dataType: 'boolean',
    sqlExpression: "(REGEXP_CONTAINS(RTRIM(COALESCE(llm_response, '')), '(습니다|세요|입니다|합니다|됩니다|에요|아요|어요|해요|다|요|음|죠|까요|네요|군요|거든요|답니다|\\\\.|!|\\\\?)\\\\s*$'))",
    description: '응답이 종결어미/마침표로 끝나는지 여부',
  },
  {
    field: 'has_unclosed_code_block',
    label: '코드블록 깨짐',
    dataType: 'boolean',
    sqlExpression: "(MOD(ARRAY_LENGTH(REGEXP_EXTRACT_ALL(COALESCE(llm_response, ''), '```')), 2) != 0)",
    description: '열린 코드블록(```)이 닫히지 않았는지 여부',
  },
  {
    field: 'response_question_count',
    label: '응답 내 물음표 수',
    dataType: 'numeric',
    sqlExpression: "ARRAY_LENGTH(REGEXP_EXTRACT_ALL(COALESCE(llm_response, ''), '\\\\?'))",
    description: '응답에 포함된 물음표(?) 개수',
  },
  {
    field: 'apology_count',
    label: '사과 표현 횟수',
    dataType: 'numeric',
    sqlExpression: "ARRAY_LENGTH(REGEXP_EXTRACT_ALL(LOWER(COALESCE(llm_response, '')), '죄송|미안|sorry|apologize|이해하지 못|답변.*어렵|도움.*드리기.*어렵'))",
    description: '응답에 포함된 사과/거부 표현 횟수',
  },
  {
    field: 'next_user_input',
    label: '다음 사용자 입력',
    dataType: 'text',
    sqlExpression: "LEAD(user_input) OVER (PARTITION BY request_metadata.session_id ORDER BY timestamp)",
    description: '같은 세션의 다음 사용자 메시지 (세션 컨텍스트)',
    requiresCTE: true,
  },
];

/** 사용 가능한 연산자 목록 */
export const RULE_OPERATORS: RuleOperatorDefinition[] = [
  { operator: 'lt', label: '미만 (<)', sqlTemplate: '{field} < {value}', applicableTo: ['numeric'], valueType: 'number' },
  { operator: 'lte', label: '이하 (≤)', sqlTemplate: '{field} <= {value}', applicableTo: ['numeric'], valueType: 'number' },
  { operator: 'gt', label: '초과 (>)', sqlTemplate: '{field} > {value}', applicableTo: ['numeric'], valueType: 'number' },
  { operator: 'gte', label: '이상 (≥)', sqlTemplate: '{field} >= {value}', applicableTo: ['numeric'], valueType: 'number' },
  { operator: 'eq', label: '같음 (=)', sqlTemplate: '{field} = {value}', applicableTo: ['numeric', 'boolean'], valueType: 'number' },
  { operator: 'neq', label: '다름 (≠)', sqlTemplate: '{field} != {value}', applicableTo: ['numeric', 'boolean'], valueType: 'number' },
  { operator: 'contains', label: '포함', sqlTemplate: 'LOWER({field}) LIKE LOWER(\'%{value}%\')', applicableTo: ['text'], valueType: 'string' },
  { operator: 'not_contains', label: '미포함', sqlTemplate: 'LOWER({field}) NOT LIKE LOWER(\'%{value}%\')', applicableTo: ['text'], valueType: 'string' },
  { operator: 'contains_any', label: '하나라도 포함 (OR)', sqlTemplate: '', applicableTo: ['text'], valueType: 'string_array' },
  { operator: 'not_contains_any', label: '모두 미포함 (AND)', sqlTemplate: '', applicableTo: ['text'], valueType: 'string_array' },
];

/** 특정 필드에 사용 가능한 연산자 목록 반환 */
export function getOperatorsForField(fieldKey: string): RuleOperatorDefinition[] {
  const fieldDef = RULE_FIELDS.find((f) => f.field === fieldKey);
  if (!fieldDef) return [];
  return RULE_OPERATORS.filter((op) => op.applicableTo.includes(fieldDef.dataType));
}

/** 필드 정의 조회 */
export function getFieldDefinition(fieldKey: string): RuleFieldDefinition | undefined {
  return RULE_FIELDS.find((f) => f.field === fieldKey);
}

/** 연산자 정의 조회 */
export function getOperatorDefinition(operatorKey: string): RuleOperatorDefinition | undefined {
  return RULE_OPERATORS.find((op) => op.operator === operatorKey);
}

// --- 규칙 config 타입 (동적 field + operator + value) ---

/** 단일 조건 */
export interface SingleCondition {
  field: string;
  operator: string;
  value: number | string | boolean | string[];
}

/** 복합 규칙 설정 (v2 - 다중 조건) */
export interface CompoundRuleConfig {
  version: 2;
  logic: 'AND' | 'OR';
  conditions: SingleCondition[];
}

/** 단순 규칙 설정 (v1 - 하위 호환) */
export type SimpleRuleConfig = SingleCondition;

/** 문제 채팅 필터링 규칙 설정 (통합 타입) */
export type ProblematicChatRuleConfig = SimpleRuleConfig | CompoundRuleConfig;

/** 복합 규칙인지 판별 */
export function isCompoundConfig(config: ProblematicChatRuleConfig): config is CompoundRuleConfig {
  return 'version' in config && (config as CompoundRuleConfig).version === 2;
}

/** v1 설정을 v2로 정규화 */
export function normalizeToCompound(config: ProblematicChatRuleConfig): CompoundRuleConfig {
  if (isCompoundConfig(config)) return config;
  return {
    version: 2,
    logic: 'AND',
    conditions: [{ field: config.field, operator: config.operator, value: config.value }],
  };
}

/** 문제 채팅 필터링 규칙 */
export interface ProblematicChatRule {
  id: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  config: ProblematicChatRuleConfig;
  createdAt: string;
  updatedAt: string;
}

/** 문제 채팅 규칙 생성 요청 */
export interface CreateProblematicChatRuleRequest {
  name: string;
  description?: string;
  isEnabled?: boolean;
  config: ProblematicChatRuleConfig;
}

/** 문제 채팅 규칙 수정 요청 */
export interface UpdateProblematicChatRuleRequest {
  name?: string;
  description?: string;
  isEnabled?: boolean;
  config?: ProblematicChatRuleConfig;
}

/** 문제 채팅 항목 */
export interface ProblematicChat {
  id: string;
  timestamp: string;
  userId: string;
  tenantId: string;
  userInput: string;
  llmResponse: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  success: boolean;
  matchedRules: string[];  // 매칭된 규칙 ID 또는 이름 목록
  sessionId?: string;
}

/** 문제 채팅 필터 DTO */
export interface ProblematicChatFilter {
  days: number;
  ruleIds?: string[];      // 특정 규칙만 필터
  userId?: string;
  tenantId?: string;
  limit?: number;
  offset?: number;
}

/** 규칙별 문제 채팅 통계 */
export interface ProblematicChatRuleStats {
  ruleId: string;
  ruleName: string;
  count: number;
  percentage: number;
}

/** 테넌트별 문제 채팅 통계 */
export interface ProblematicChatTenantStats {
  tenantId: string;
  count: number;
}

/** 문제 채팅 전체 통계 */
export interface ProblematicChatStats {
  totalCount: number;
  byRule: ProblematicChatRuleStats[];
  byTenant: ProblematicChatTenantStats[];
}

// ==================== 서비스 구성 타입 ====================

export * from './service.types';

// ==================== UI 체크 모니터링 타입 ====================

export type UiCheckType =
  | 'element_exists'
  | 'element_count_min'
  | 'no_error_text'
  | 'chart_rendered'
  | 'no_console_errors'
  | 'no_empty_page'
  | 'section_exists'
  | 'table_structure'
  | 'no_empty_cells'
  | 'content_not_empty';

export type UiCheckStatus = 'pass' | 'fail' | 'error' | 'timeout';
export type UiTargetStatus = 'healthy' | 'degraded' | 'broken';

export interface SingleCheckResult {
  type: UiCheckType;
  description: string;
  status: UiCheckStatus;
  message?: string;
  selector?: string;
  expected?: string;
  actual?: string;
  durationMs: number;
  category?: 'structure' | 'content' | 'rendering' | 'error';
  details?: Record<string, unknown>;
}

export interface UiPageCheckResult {
  targetId: string;
  targetName: string;
  url: string;
  reportType?: string;
  status: UiTargetStatus;
  checks: SingleCheckResult[];
  passedCount: number;
  failedCount: number;
  errorCount: number;
  consoleErrors: string[];
  screenshotPath?: string;
  pageLoadTimeMs: number;
  checkedAt: string;
}

export interface UiMonitoringSummary {
  totalTargets: number;
  healthyTargets: number;
  degradedTargets: number;
  brokenTargets: number;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
}

export interface UiMonitoringResult {
  results: UiPageCheckResult[];
  summary: UiMonitoringSummary;
  authSucceeded: boolean;
  totalDurationMs: number;
  timestamp: string;
}

export interface UiCheckHistoryItem {
  id: string;
  trigger: string;
  totalTargets: number;
  healthyTargets: number;
  degradedTargets: number;
  brokenTargets: number;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  authSucceeded: boolean;
  totalDurationMs: number;
  hasIssues: boolean;
  checkedAt: string;
}

export interface UiCheckHistoryResponse {
  items: UiCheckHistoryItem[];
  total: number;
}
