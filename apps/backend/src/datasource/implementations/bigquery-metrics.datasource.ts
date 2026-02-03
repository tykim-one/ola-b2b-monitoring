import { Logger } from '@nestjs/common';
import { BigQuery } from '@google-cloud/bigquery';
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
import { MetricsDataSource } from '../interfaces';
import { MetricsQueries } from '../../metrics/queries/metrics.queries';

/**
 * Configuration for BigQuery metrics data source.
 */
export interface BigQueryMetricsConfig {
  projectId: string;
  datasetId: string;
  tableName: string;
  location: string;
  keyFilename?: string;
}

/**
 * BigQuery implementation of the MetricsDataSource interface.
 * Executes SQL queries against BigQuery tables to retrieve metrics data.
 */
export class BigQueryMetricsDataSource implements MetricsDataSource {
  private readonly logger = new Logger(BigQueryMetricsDataSource.name);
  private bigQueryClient: BigQuery | null = null;
  private readonly config: BigQueryMetricsConfig;

  constructor(config: BigQueryMetricsConfig) {
    this.config = config;
  }

  // ==================== Lifecycle Methods ====================

  async initialize(): Promise<void> {
    try {
      const options: { projectId: string; keyFilename?: string } = {
        projectId: this.config.projectId,
      };

      if (this.config.keyFilename) {
        options.keyFilename = this.config.keyFilename;
      }

      this.bigQueryClient = new BigQuery(options);

      this.logger.log(
        `BigQuery data source initialized for project: ${this.config.projectId}, ` +
          `dataset: ${this.config.datasetId}, table: ${this.config.tableName}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to initialize BigQuery client: ${error.message}`,
      );
      throw error;
    }
  }

  async dispose(): Promise<void> {
    this.bigQueryClient = null;
    this.logger.log('BigQuery data source disposed');
  }

  async isHealthy(): Promise<boolean> {
    if (!this.bigQueryClient) {
      return false;
    }

    try {
      // Execute a simple query to verify connectivity
      const [job] = await this.bigQueryClient.createQueryJob({
        query: 'SELECT 1',
        location: this.config.location,
      });
      await job.getQueryResults();
      return true;
    } catch (error) {
      this.logger.warn(`Health check failed: ${error.message}`);
      return false;
    }
  }

  // ==================== Private Helper Methods ====================

  /**
   * Execute a SQL query and return results.
   */
  private async executeQuery<T>(
    query: string,
    maxResults: number = 1000,
  ): Promise<T[]> {
    if (!this.bigQueryClient) {
      throw new Error(
        'BigQuery client not initialized. Call initialize() first.',
      );
    }

    try {
      this.logger.debug(`Executing query: ${query.substring(0, 100)}...`);

      const options = {
        query,
        location: this.config.location,
        maxResults,
      };

      const [job] = await this.bigQueryClient.createQueryJob(options);
      this.logger.debug(`Job ${job.id} started.`);

      const [rows] = await job.getQueryResults();
      this.logger.debug(`Query returned ${rows.length} rows`);

      return rows as T[];
    } catch (error) {
      this.logger.error(
        `Query execution failed: ${error.message}`,
        error.stack,
      );
      throw new Error(`BigQuery query failed: ${error.message}`);
    }
  }

  /**
   * Get the fully qualified table reference.
   */
  private get tableRef(): {
    projectId: string;
    datasetId: string;
    tableName: string;
  } {
    return {
      projectId: this.config.projectId,
      datasetId: this.config.datasetId,
      tableName: this.config.tableName,
    };
  }

  /**
   * Normalize BigQuery DATE/TIMESTAMP objects to ISO string format.
   * BigQuery returns DATE as { value: '2025-01-15' } instead of plain string.
   */
  private normalizeDate(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'object' && value !== null && 'value' in value) {
      return (value as { value: string }).value;
    }
    return String(value);
  }

  // ==================== Metrics Methods ====================

  async getRealtimeKPI(): Promise<RealtimeKPI> {
    const { projectId, datasetId, tableName } = this.tableRef;
    const query = MetricsQueries.realtimeKPI(projectId, datasetId, tableName);
    const rows = await this.executeQuery<RealtimeKPI>(query, 1);
    return rows[0] ?? this.getEmptyRealtimeKPI();
  }

  async getHourlyTraffic(): Promise<HourlyTraffic[]> {
    const { projectId, datasetId, tableName } = this.tableRef;
    const query = MetricsQueries.hourlyTraffic(projectId, datasetId, tableName);
    const rows = await this.executeQuery<HourlyTraffic>(query, 100);
    return rows.map((row) => ({
      ...row,
      hour: this.normalizeDate(row.hour),
    }));
  }

  async getDailyTraffic(days: number = 30): Promise<DailyTraffic[]> {
    const { projectId, datasetId, tableName } = this.tableRef;
    const query = MetricsQueries.dailyTraffic(projectId, datasetId, tableName);
    const rows = await this.executeQuery<DailyTraffic>(query, 100);
    return rows.map((row) => ({
      ...row,
      date: this.normalizeDate(row.date),
    }));
  }

  async getTenantUsage(days: number = 7): Promise<TenantUsage[]> {
    const { projectId, datasetId, tableName } = this.tableRef;
    const query = MetricsQueries.tenantUsage(
      projectId,
      datasetId,
      tableName,
      days,
    );
    return this.executeQuery<TenantUsage>(query, 100);
  }

  async getUsageHeatmap(): Promise<UsageHeatmapCell[]> {
    const { projectId, datasetId, tableName } = this.tableRef;
    const query = MetricsQueries.usageHeatmap(projectId, datasetId, tableName);
    return this.executeQuery<UsageHeatmapCell>(query, 200);
  }

  async getErrorAnalysis(): Promise<ErrorAnalysis[]> {
    const { projectId, datasetId, tableName } = this.tableRef;
    const query = MetricsQueries.errorAnalysis(projectId, datasetId, tableName);
    return this.executeQuery<ErrorAnalysis>(query, 100);
  }

  async getTokenEfficiency(days: number = 7): Promise<TokenEfficiency[]> {
    const { projectId, datasetId, tableName } = this.tableRef;
    const query = MetricsQueries.tokenEfficiency(
      projectId,
      datasetId,
      tableName,
      days,
    );
    return this.executeQuery<TokenEfficiency>(query, 1000);
  }

  async getAnomalyStats(days: number = 30): Promise<AnomalyStats[]> {
    const { projectId, datasetId, tableName } = this.tableRef;
    const query = MetricsQueries.anomalyStats(
      projectId,
      datasetId,
      tableName,
      days,
    );
    return this.executeQuery<AnomalyStats>(query, 100);
  }

  async getCostTrend(): Promise<CostTrend[]> {
    const { projectId, datasetId, tableName } = this.tableRef;
    const query = MetricsQueries.costTrend(projectId, datasetId, tableName);
    const rows = await this.executeQuery<CostTrend>(query, 100);
    return rows.map((row) => ({
      ...row,
      date: this.normalizeDate(row.date),
    }));
  }

  async getQueryPatterns(): Promise<QueryPattern[]> {
    const { projectId, datasetId, tableName } = this.tableRef;
    const query = MetricsQueries.queryPatterns(projectId, datasetId, tableName);
    return this.executeQuery<QueryPattern>(query, 500);
  }

  async getSampleLogs(limit: number = 1000): Promise<B2BLog[]> {
    const { projectId, datasetId, tableName } = this.tableRef;
    const query = `
      SELECT *
      FROM \`${projectId}.${datasetId}.${tableName}\`
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `;
    return this.executeQuery<B2BLog>(query, limit);
  }

  // ==================== Quality Analysis Methods ====================

  async getTokenEfficiencyTrend(): Promise<TokenEfficiencyTrend[]> {
    const { projectId, datasetId, tableName } = this.tableRef;
    const query = MetricsQueries.tokenEfficiencyTrend(
      projectId,
      datasetId,
      tableName,
    );
    const rows = await this.executeQuery<TokenEfficiencyTrend>(query, 100);
    return rows.map((row) => ({
      ...row,
      date: this.normalizeDate(row.date),
    }));
  }

  async getQueryResponseCorrelation(): Promise<QueryResponseCorrelation[]> {
    const { projectId, datasetId, tableName } = this.tableRef;
    const query = MetricsQueries.queryResponseCorrelation(
      projectId,
      datasetId,
      tableName,
    );
    const rows = await this.executeQuery<QueryResponseCorrelation>(query, 1000);
    return rows.map((row) => ({
      ...row,
      timestamp: this.normalizeDate(row.timestamp),
    }));
  }

  async getRepeatedQueryPatterns(): Promise<RepeatedQueryPattern[]> {
    const { projectId, datasetId, tableName } = this.tableRef;
    const query = MetricsQueries.repeatedQueryPatterns(
      projectId,
      datasetId,
      tableName,
    );
    const rows = await this.executeQuery<RepeatedQueryPattern>(query, 100);
    return rows.map((row) => ({
      ...row,
      first_seen: this.normalizeDate(row.first_seen),
      last_seen: this.normalizeDate(row.last_seen),
    }));
  }

  // ==================== User Analytics Methods ====================

  async getUserRequestCounts(
    days: number = 7,
    limit: number = 1000,
  ): Promise<UserRequestCount[]> {
    const { projectId, datasetId, tableName } = this.tableRef;
    const query = MetricsQueries.userRequestCounts(
      projectId,
      datasetId,
      tableName,
      days,
      limit,
    );
    return this.executeQuery<UserRequestCount>(query, limit);
  }

  async getUserTokenUsage(
    days: number = 7,
    limit: number = 1000,
  ): Promise<UserTokenUsage[]> {
    const { projectId, datasetId, tableName } = this.tableRef;
    const query = MetricsQueries.userTokenUsage(
      projectId,
      datasetId,
      tableName,
      days,
      limit,
    );
    return this.executeQuery<UserTokenUsage>(query, limit);
  }

  async getUserQuestionPatterns(
    userId?: string,
    days: number = 7,
    limit: number = 1000,
  ): Promise<UserQuestionPattern[]> {
    const { projectId, datasetId, tableName } = this.tableRef;
    const query = MetricsQueries.userQuestionPatterns(
      projectId,
      datasetId,
      tableName,
      userId ?? null,
      days,
      limit,
    );
    const rows = await this.executeQuery<UserQuestionPattern>(query, limit);
    return rows.map((row) => ({
      ...row,
      lastAsked: this.normalizeDate(row.lastAsked),
    }));
  }

  async getUserList(
    days: number = 7,
    limit: number = 1000,
  ): Promise<UserListItem[]> {
    const { projectId, datasetId, tableName } = this.tableRef;
    const query = MetricsQueries.userList(
      projectId,
      datasetId,
      tableName,
      days,
      limit,
    );
    const rows = await this.executeQuery<UserListItem>(query, limit);
    return rows.map((row) => ({
      ...row,
      firstActivity: this.normalizeDate(row.firstActivity),
      lastActivity: this.normalizeDate(row.lastActivity),
    }));
  }

  async getUserActivityDetail(
    userId: string,
    days: number = 7,
    limit: number = 20,
    offset: number = 0,
  ): Promise<UserActivityDetail[]> {
    const { projectId, datasetId, tableName } = this.tableRef;
    const query = MetricsQueries.userActivityDetail(
      projectId,
      datasetId,
      tableName,
      userId,
      days,
      limit,
      offset,
    );
    const rows = await this.executeQuery<UserActivityDetail>(query, limit);
    return rows.map((row) => ({
      ...row,
      timestamp: this.normalizeDate(row.timestamp),
    }));
  }

  // ==================== Chatbot Quality Analysis Methods ====================

  async getEmergingQueryPatterns(
    recentDays: number = 7,
    historicalDays: number = 90,
  ): Promise<EmergingQueryPattern[]> {
    const { projectId, datasetId, tableName } = this.tableRef;
    const query = MetricsQueries.emergingQueryPatterns(
      projectId,
      datasetId,
      tableName,
      recentDays,
      historicalDays,
    );
    return this.executeQuery<EmergingQueryPattern>(query, 100);
  }

  async getSentimentAnalysis(
    days: number = 7,
  ): Promise<SentimentAnalysisResult[]> {
    const { projectId, datasetId, tableName } = this.tableRef;
    const query = MetricsQueries.sentimentAnalysis(
      projectId,
      datasetId,
      tableName,
      days,
    );
    return this.executeQuery<SentimentAnalysisResult>(query, 500);
  }

  async getRephrasedQueryPatterns(
    days: number = 7,
  ): Promise<RephrasedQueryPattern[]> {
    const { projectId, datasetId, tableName } = this.tableRef;
    const query = MetricsQueries.rephrasedQueryPatterns(
      projectId,
      datasetId,
      tableName,
      days,
    );
    return this.executeQuery<RephrasedQueryPattern>(query, 100);
  }

  async getSessionAnalytics(days: number = 7): Promise<SessionAnalytics[]> {
    const { projectId, datasetId, tableName } = this.tableRef;
    const query = MetricsQueries.sessionAnalytics(
      projectId,
      datasetId,
      tableName,
      days,
    );
    return this.executeQuery<SessionAnalytics>(query, 500);
  }

  async getTenantQualitySummary(
    days: number = 7,
  ): Promise<TenantQualitySummary[]> {
    const { projectId, datasetId, tableName } = this.tableRef;
    const query = MetricsQueries.tenantQualitySummary(
      projectId,
      datasetId,
      tableName,
      days,
    );
    return this.executeQuery<TenantQualitySummary>(query, 100);
  }

  async getResponseQualityMetrics(
    days: number = 30,
  ): Promise<ResponseQualityMetrics[]> {
    const { projectId, datasetId, tableName } = this.tableRef;
    const query = MetricsQueries.responseQualityMetrics(
      projectId,
      datasetId,
      tableName,
      days,
    );
    const rows = await this.executeQuery<ResponseQualityMetrics>(query, 1000);
    return rows.map((row) => ({
      ...row,
      date: this.normalizeDate(row.date),
    }));
  }

  // ==================== Raw Query Methods ====================

  /**
   * Execute a raw query against BigQuery.
   * Replaces {{TABLE}} placeholder with the actual table reference.
   * @param query The raw query string
   * @returns Array of result rows
   */
  async executeRawQuery<T = Record<string, unknown>>(query: string): Promise<T[]> {
    const { projectId, datasetId, tableName } = this.tableRef;
    const tableReference = `${projectId}.${datasetId}.${tableName}`;
    const processedQuery = query.replace(/\{\{TABLE\}\}/g, tableReference);
    return this.executeQuery<T>(processedQuery, 1000);
  }

  // ==================== Helper Methods ====================

  /**
   * Returns an empty RealtimeKPI object when no data is available.
   */
  private getEmptyRealtimeKPI(): RealtimeKPI {
    return {
      total_requests: 0,
      success_count: 0,
      fail_count: 0,
      error_rate: 0,
      total_tokens: 0,
      avg_tokens: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      active_tenants: 0,
    };
  }
}
