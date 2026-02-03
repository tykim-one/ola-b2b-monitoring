import {
  RealtimeKPI,
  HourlyTraffic,
  DailyTraffic,
  TenantUsage,
  UsageHeatmapCell,
  ErrorAnalysis,
  TokenEfficiency,
  AnomalyStats,
  CostTrend,
  QueryPattern,
  B2BLog,
  TokenEfficiencyTrend,
  QueryResponseCorrelation,
  RepeatedQueryPattern,
  UserRequestCount,
  UserTokenUsage,
  UserQuestionPattern,
  UserListItem,
  UserActivityDetail,
  EmergingQueryPattern,
  SentimentAnalysisResult,
  RephrasedQueryPattern,
  SessionAnalytics,
  TenantQualitySummary,
  ResponseQualityMetrics,
} from '@ola/shared-types';

/**
 * Core interface for metrics data sources.
 * All data source implementations (BigQuery, PostgreSQL, MySQL, etc.) must implement this interface.
 */
export interface MetricsDataSource {
  // ==================== Lifecycle Methods ====================

  /**
   * Initialize the data source connection and validate configuration.
   * Called once when the module is initialized.
   */
  initialize(): Promise<void>;

  /**
   * Clean up resources and close connections.
   * Called when the application is shutting down.
   */
  dispose(): Promise<void>;

  /**
   * Check if the data source is healthy and responsive.
   * Used for health checks and monitoring.
   */
  isHealthy(): Promise<boolean>;

  // ==================== Metrics Methods ====================

  /**
   * Get real-time KPI metrics for the last 24 hours.
   * Returns aggregate statistics including request counts, tokens, and error rates.
   */
  getRealtimeKPI(): Promise<RealtimeKPI>;

  /**
   * Get hourly traffic breakdown for the last 24 hours.
   * Returns request counts and token usage per hour.
   */
  getHourlyTraffic(): Promise<HourlyTraffic[]>;

  /**
   * Get daily traffic breakdown for the specified number of days.
   * @param days Number of days to look back (default: 30)
   */
  getDailyTraffic(days?: number): Promise<DailyTraffic[]>;

  /**
   * Get usage statistics per tenant.
   * @param days Number of days to look back (default: 7)
   */
  getTenantUsage(days?: number): Promise<TenantUsage[]>;

  /**
   * Get usage heatmap data (day of week x hour).
   * Returns a grid of request counts for visualization.
   */
  getUsageHeatmap(): Promise<UsageHeatmapCell[]>;

  /**
   * Get error analysis data.
   * Returns failure counts grouped by tenant.
   */
  getErrorAnalysis(): Promise<ErrorAnalysis[]>;

  /**
   * Get token efficiency metrics.
   * Returns input/output token ratios per request.
   * @param days Number of days to look back (default: 7)
   */
  getTokenEfficiency(days?: number): Promise<TokenEfficiency[]>;

  /**
   * Get anomaly detection statistics.
   * Returns statistical measures (mean, stddev, percentiles) for anomaly detection.
   * @param days Number of days to look back (default: 30)
   */
  getAnomalyStats(days?: number): Promise<AnomalyStats[]>;

  /**
   * Get daily cost trend data.
   * Returns token usage and estimated costs per day.
   */
  getCostTrend(): Promise<CostTrend[]>;

  /**
   * Get user query patterns.
   * Returns query length and token usage for pattern analysis.
   */
  getQueryPatterns(): Promise<QueryPattern[]>;

  /**
   * Get sample log entries.
   * @param limit Maximum number of logs to return (default: 100)
   */
  getSampleLogs(limit?: number): Promise<B2BLog[]>;

  // ==================== Quality Analysis Methods ====================

  /**
   * Get daily token efficiency trend.
   * Returns efficiency ratios (output/input) aggregated by day.
   */
  getTokenEfficiencyTrend(): Promise<TokenEfficiencyTrend[]>;

  /**
   * Get query-response length correlation data.
   * Returns query length, response length, and token usage per request.
   */
  getQueryResponseCorrelation(): Promise<QueryResponseCorrelation[]>;

  /**
   * Get repeated query patterns.
   * Returns frequently asked questions with occurrence counts.
   */
  getRepeatedQueryPatterns(): Promise<RepeatedQueryPattern[]>;

  // ==================== User Analytics Methods ====================

  /**
   * Get request counts per user (by x_enc_data).
   * @param days Number of days to look back (default: 7)
   * @param limit Maximum number of users to return (default: 50)
   */
  getUserRequestCounts(
    days?: number,
    limit?: number,
  ): Promise<UserRequestCount[]>;

  /**
   * Get token usage per user (by x_enc_data).
   * @param days Number of days to look back (default: 7)
   * @param limit Maximum number of users to return (default: 50)
   */
  getUserTokenUsage(days?: number, limit?: number): Promise<UserTokenUsage[]>;

  /**
   * Get frequently asked question patterns per user.
   * @param userId Optional user ID (x_enc_data) to filter
   * @param days Number of days to look back (default: 7)
   * @param limit Maximum number of patterns to return (default: 100)
   */
  getUserQuestionPatterns(
    userId?: string,
    days?: number,
    limit?: number,
  ): Promise<UserQuestionPattern[]>;

  /**
   * Get user list with aggregated statistics.
   * @param days Number of days to look back (default: 7)
   * @param limit Maximum number of users to return (default: 1000)
   */
  getUserList(days?: number, limit?: number): Promise<UserListItem[]>;

  /**
   * Get user activity details (conversation history).
   * @param userId User ID (x_enc_data) to filter
   * @param days Number of days to look back (default: 7)
   * @param limit Maximum number of records to return (default: 20)
   * @param offset Offset for pagination (default: 0)
   */
  getUserActivityDetail(
    userId: string,
    days?: number,
    limit?: number,
    offset?: number,
  ): Promise<UserActivityDetail[]>;

  // ==================== Chatbot Quality Analysis Methods ====================

  /**
   * Get emerging/new query patterns.
   * Detects queries that are new or have significantly increased in frequency.
   * @param recentDays Number of recent days to analyze (default: 7)
   * @param historicalDays Number of historical days to compare against (default: 90)
   */
  getEmergingQueryPatterns(
    recentDays?: number,
    historicalDays?: number,
  ): Promise<EmergingQueryPattern[]>;

  /**
   * Get sentiment analysis results.
   * Detects frustrated, emotional, or urgent queries based on keywords and patterns.
   * @param days Number of days to look back (default: 7)
   */
  getSentimentAnalysis(days?: number): Promise<SentimentAnalysisResult[]>;

  /**
   * Get rephrased query patterns.
   * Detects sessions where users asked similar questions multiple times (dissatisfaction signal).
   * @param days Number of days to look back (default: 7)
   */
  getRephrasedQueryPatterns(days?: number): Promise<RephrasedQueryPattern[]>;

  /**
   * Get session-level analytics.
   * Returns conversation flow analysis per session.
   * @param days Number of days to look back (default: 7)
   */
  getSessionAnalytics(days?: number): Promise<SessionAnalytics[]>;

  /**
   * Get tenant quality summary.
   * Aggregated quality metrics per tenant including frustration rate.
   * @param days Number of days to look back (default: 7)
   */
  getTenantQualitySummary(days?: number): Promise<TenantQualitySummary[]>;

  /**
   * Get response quality metrics.
   * Analyzes response length distribution and quality indicators.
   * @param days Number of days to look back (default: 30)
   */
  getResponseQualityMetrics(days?: number): Promise<ResponseQualityMetrics[]>;

  // ==================== Raw Query Methods ====================

  /**
   * Execute a raw query against the data source.
   * The query string may contain {{TABLE}} placeholder which will be replaced with the actual table reference.
   * @param query The raw query string
   * @returns Array of result rows
   */
  executeRawQuery<T = Record<string, unknown>>(query: string): Promise<T[]>;
}

/**
 * Injection token for the MetricsDataSource interface.
 * Use this token with @Inject() decorator to inject the data source.
 */
export const METRICS_DATASOURCE = Symbol('METRICS_DATASOURCE');
