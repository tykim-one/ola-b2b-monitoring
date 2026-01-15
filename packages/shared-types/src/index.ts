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
  success: string;
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
