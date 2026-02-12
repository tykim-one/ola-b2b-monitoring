import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BigQuery } from '@google-cloud/bigquery';
import { QueryDto } from './dto/query.dto';
import { DefaultProjectStrategy } from '../common/strategies/default.project.strategy';
import { CacheService, CacheTTL } from '../cache/cache.service';
import { METRICS_DATASOURCE } from '../datasource';
import type { MetricsDataSource } from '../datasource';
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

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly logger = new Logger(MetricsService.name);
  private bigQueryClient: BigQuery;
  private projectId: string;
  private datasetId: string;
  private tableName: string;
  private location: string;

  constructor(
    private configService: ConfigService,
    private projectStrategy: DefaultProjectStrategy,
    private cacheService: CacheService,
    @Inject(METRICS_DATASOURCE) private metricsDataSource: MetricsDataSource,
  ) {}

  onModuleInit() {
    this.projectId = this.configService.get<string>('GCP_PROJECT_ID') || '';
    this.datasetId = this.configService.get<string>('BIGQUERY_DATASET') || '';
    this.tableName = this.configService.get<string>('BIGQUERY_TABLE') || 'logs';
    this.location =
      this.configService.get<string>('GCP_BQ_LOCATION') || 'asia-northeast3';

    const credentials = this.configService.get<string>(
      'GOOGLE_APPLICATION_CREDENTIALS',
    );

    this.bigQueryClient = new BigQuery({
      projectId: this.projectId,
      keyFilename: credentials,
    });

    this.logger.log(
      `Metrics service initialized for project: ${this.projectId}, dataset: ${this.datasetId}, table: ${this.tableName}`,
    );
  }

  // ==================== BigQuery-specific admin functions ====================

  /**
   * Execute a custom SQL query
   */
  async executeQuery(queryDto: QueryDto): Promise<any[]> {
    const { query, maxResults = 1000 } = queryDto;

    try {
      this.logger.log(`Executing query: ${query.substring(0, 100)}...`);

      const options = {
        query,
        location: this.location,
        maxResults,
      };

      const [job] = await this.bigQueryClient.createQueryJob(options);
      this.logger.log(`Job ${job.id} started.`);

      const [rows] = await job.getQueryResults();
      this.logger.log(`Query returned ${rows.length} rows`);

      return rows;
    } catch (error) {
      this.logger.error(
        `Query execution failed: ${error.message}`,
        error.stack,
      );
      throw new Error(`BigQuery query failed: ${error.message}`);
    }
  }

  /**
   * Get list of datasets
   */
  async getDatasets(): Promise<string[]> {
    try {
      const [datasets] = await this.bigQueryClient.getDatasets();
      return datasets.map((dataset) => dataset.id || '').filter((id) => id);
    } catch (error) {
      this.logger.error(
        `Failed to get datasets: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to get datasets: ${error.message}`);
    }
  }

  /**
   * Get tables in a dataset
   */
  async getTables(datasetId: string): Promise<string[]> {
    try {
      const dataset = this.bigQueryClient.dataset(datasetId);
      const [tables] = await dataset.getTables();
      return tables.map((table) => table.id || '').filter((id) => id);
    } catch (error) {
      this.logger.error(`Failed to get tables: ${error.message}`, error.stack);
      throw new Error(`Failed to get tables: ${error.message}`);
    }
  }

  /**
   * Get sample logs from the configured dataset
   */
  async getSampleLogs(
    projectId: string,
    limit: number = 1000,
  ): Promise<B2BLog[]> {
    const filterClause = this.projectStrategy.getFilterQuery(projectId);

    const query = `
      SELECT *
      FROM \`${this.projectId}.${this.datasetId}.${this.tableName}\`
      WHERE ${filterClause}
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `;

    const rows = await this.executeQuery({ query, maxResults: limit });
    return rows.map((row) => this.projectStrategy.parseLog(row));
  }

  // ==================== 메트릭 API (캐싱 적용, MetricsDataSource 사용) ====================

  /**
   * 실시간 KPI 메트릭 (캐시 TTL: 5분)
   */
  async getRealtimeKPI(days: number = 1): Promise<RealtimeKPI> {
    const cacheKey = CacheService.generateKey('metrics', 'realtime', 'kpi', days);

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.metricsDataSource.getRealtimeKPI(days),
      CacheTTL.SHORT,
    );
  }

  /**
   * 시간별 트래픽 (캐시 TTL: 15분)
   */
  async getHourlyTraffic(days: number = 1): Promise<HourlyTraffic[]> {
    const cacheKey = CacheService.generateKey('metrics', 'hourly', 'traffic', days);

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.metricsDataSource.getHourlyTraffic(days),
      CacheTTL.MEDIUM,
    );
  }

  /**
   * 일별 트래픽 (캐시 TTL: 15분)
   */
  async getDailyTraffic(days: number = 30): Promise<DailyTraffic[]> {
    const cacheKey = CacheService.generateKey(
      'metrics',
      'daily',
      'traffic',
      days,
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.metricsDataSource.getDailyTraffic(days),
      CacheTTL.MEDIUM,
    );
  }

  /**
   * 테넌트별 사용량 (캐시 TTL: 15분)
   */
  async getTenantUsage(days: number = 7): Promise<TenantUsage[]> {
    const cacheKey = CacheService.generateKey(
      'metrics',
      'tenant',
      'usage',
      days,
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.metricsDataSource.getTenantUsage(days),
      CacheTTL.MEDIUM,
    );
  }

  /**
   * 사용량 히트맵 (캐시 TTL: 15분)
   */
  async getUsageHeatmap(): Promise<UsageHeatmapCell[]> {
    const cacheKey = CacheService.generateKey('metrics', 'usage', 'heatmap');

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.metricsDataSource.getUsageHeatmap(),
      CacheTTL.MEDIUM,
    );
  }

  /**
   * 에러 분석 (캐시 TTL: 5분)
   */
  async getErrorAnalysis(days: number = 7): Promise<ErrorAnalysis[]> {
    const cacheKey = CacheService.generateKey('metrics', 'error', 'analysis', days);

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.metricsDataSource.getErrorAnalysis(days),
      CacheTTL.SHORT,
    );
  }

  /**
   * 토큰 효율성 분석 (캐시 TTL: 15분)
   * @param days Number of days to look back (default: 7)
   */
  async getTokenEfficiency(days: number = 7): Promise<TokenEfficiency[]> {
    const cacheKey = CacheService.generateKey(
      'metrics',
      'token',
      'efficiency',
      `days_${days}`,
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.metricsDataSource.getTokenEfficiency(days),
      CacheTTL.MEDIUM,
    );
  }

  /**
   * 이상 탐지용 통계 (캐시 TTL: 5분)
   * @param days Number of days to look back (default: 30)
   */
  async getAnomalyStats(days: number = 30): Promise<AnomalyStats[]> {
    const cacheKey = CacheService.generateKey(
      'metrics',
      'anomaly',
      'stats',
      `days_${days}`,
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.metricsDataSource.getAnomalyStats(days),
      CacheTTL.SHORT,
    );
  }

  /**
   * 비용 트렌드 (캐시 TTL: 15분)
   */
  async getCostTrend(): Promise<CostTrend[]> {
    const cacheKey = CacheService.generateKey('metrics', 'cost', 'trend');

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.metricsDataSource.getCostTrend(),
      CacheTTL.MEDIUM,
    );
  }

  /**
   * 사용자 질의 패턴 (캐시 TTL: 15분)
   */
  async getQueryPatterns(): Promise<QueryPattern[]> {
    const cacheKey = CacheService.generateKey('metrics', 'query', 'patterns');

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.metricsDataSource.getQueryPatterns(),
      CacheTTL.MEDIUM,
    );
  }

  // ==================== 품질 분석 API ====================

  /**
   * 일별 토큰 효율성 트렌드 (캐시 TTL: 15분)
   * @param days Number of days to look back (default: 30)
   */
  async getTokenEfficiencyTrend(
    days: number = 30,
  ): Promise<TokenEfficiencyTrend[]> {
    const cacheKey = CacheService.generateKey(
      'quality',
      'efficiency',
      'trend',
      days,
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.metricsDataSource.getTokenEfficiencyTrend(days),
      CacheTTL.MEDIUM,
    );
  }

  /**
   * 질문-응답 길이 상관관계 (캐시 TTL: 15분)
   * @param days Number of days to look back (default: 7)
   */
  async getQueryResponseCorrelation(
    days: number = 7,
  ): Promise<QueryResponseCorrelation[]> {
    const cacheKey = CacheService.generateKey(
      'quality',
      'query',
      'correlation',
      days,
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.metricsDataSource.getQueryResponseCorrelation(days),
      CacheTTL.MEDIUM,
    );
  }

  /**
   * 질문-응답 상세 조회 (캐시 없음 - 온디맨드)
   */
  async getQueryResponseDetail(timestamp: string, tenantId: string) {
    return this.metricsDataSource.getQueryResponseDetail(timestamp, tenantId);
  }

  /**
   * 반복 질문 패턴 (캐시 TTL: 15분)
   * @param days Number of days to look back (default: 30)
   */
  async getRepeatedQueryPatterns(
    days: number = 30,
  ): Promise<RepeatedQueryPattern[]> {
    const cacheKey = CacheService.generateKey(
      'quality',
      'repeated',
      'patterns',
      days,
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.metricsDataSource.getRepeatedQueryPatterns(days),
      CacheTTL.MEDIUM,
    );
  }

  // ==================== 유저 분석 API ====================

  /**
   * 유저별 요청 수 (캐시 TTL: 15분)
   */
  async getUserRequestCounts(
    days: number = 7,
    limit: number = 1000,
  ): Promise<UserRequestCount[]> {
    const cacheKey = CacheService.generateKey(
      'user',
      'request',
      'counts',
      days,
      limit,
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.metricsDataSource.getUserRequestCounts(days, limit),
      CacheTTL.MEDIUM,
    );
  }

  /**
   * 유저별 토큰 사용량 (캐시 TTL: 15분)
   */
  async getUserTokenUsage(
    days: number = 7,
    limit: number = 1000,
  ): Promise<UserTokenUsage[]> {
    const cacheKey = CacheService.generateKey(
      'user',
      'token',
      'usage',
      days,
      limit,
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.metricsDataSource.getUserTokenUsage(days, limit),
      CacheTTL.MEDIUM,
    );
  }

  /**
   * 유저별 질문 패턴 (캐시 TTL: 15분)
   */
  async getUserQuestionPatterns(
    userId?: string,
    days: number = 7,
    limit: number = 1000,
  ): Promise<UserQuestionPattern[]> {
    const cacheKey = CacheService.generateKey(
      'user',
      'question',
      'patterns',
      userId ?? 'all',
      days,
      limit,
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () =>
        this.metricsDataSource.getUserQuestionPatterns(userId, days, limit),
      CacheTTL.MEDIUM,
    );
  }

  /**
   * 유저 목록 (통합 통계) (캐시 TTL: 15분)
   */
  async getUserList(
    days: number = 7,
    limit: number = 1000,
  ): Promise<UserListItem[]> {
    const cacheKey = CacheService.generateKey('user', 'list', days, limit);

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.metricsDataSource.getUserList(days, limit),
      CacheTTL.MEDIUM,
    );
  }

  /**
   * 유저 활동 상세 (캐시 TTL: 5분)
   */
  async getUserActivityDetail(
    userId: string,
    days: number = 7,
    limit: number = 20,
    offset: number = 0,
  ): Promise<UserActivityDetail[]> {
    const cacheKey = CacheService.generateKey(
      'user',
      'activity',
      userId,
      days,
      limit,
      offset,
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () =>
        this.metricsDataSource.getUserActivityDetail(
          userId,
          days,
          limit,
          offset,
        ),
      CacheTTL.SHORT,
    );
  }

  // ==================== 챗봇 품질 분석 API ====================

  /**
   * 신규/급증 질문 패턴 (캐시 TTL: 15분)
   */
  async getEmergingQueryPatterns(
    recentDays: number = 7,
    historicalDays: number = 90,
  ): Promise<EmergingQueryPattern[]> {
    const cacheKey = CacheService.generateKey(
      'quality',
      'emerging',
      'patterns',
      recentDays,
      historicalDays,
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () =>
        this.metricsDataSource.getEmergingQueryPatterns(
          recentDays,
          historicalDays,
        ),
      CacheTTL.MEDIUM,
    );
  }

  /**
   * 감정 분석 결과 (캐시 TTL: 5분)
   */
  async getSentimentAnalysis(
    days: number = 7,
  ): Promise<SentimentAnalysisResult[]> {
    const cacheKey = CacheService.generateKey('quality', 'sentiment', days);

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.metricsDataSource.getSentimentAnalysis(days),
      CacheTTL.SHORT,
    );
  }

  /**
   * 재질문 패턴 (캐시 TTL: 15분)
   */
  async getRephrasedQueryPatterns(
    days: number = 7,
  ): Promise<RephrasedQueryPattern[]> {
    const cacheKey = CacheService.generateKey('quality', 'rephrased', days);

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.metricsDataSource.getRephrasedQueryPatterns(days),
      CacheTTL.MEDIUM,
    );
  }

  /**
   * 세션 분석 (캐시 TTL: 15분)
   */
  async getSessionAnalytics(days: number = 7): Promise<SessionAnalytics[]> {
    const cacheKey = CacheService.generateKey('quality', 'session', days);

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.metricsDataSource.getSessionAnalytics(days),
      CacheTTL.MEDIUM,
    );
  }

  /**
   * 테넌트별 품질 요약 (캐시 TTL: 15분)
   */
  async getTenantQualitySummary(
    days: number = 7,
  ): Promise<TenantQualitySummary[]> {
    const cacheKey = CacheService.generateKey(
      'quality',
      'tenant',
      'summary',
      days,
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.metricsDataSource.getTenantQualitySummary(days),
      CacheTTL.MEDIUM,
    );
  }

  /**
   * 응답 품질 지표 (캐시 TTL: 15분)
   */
  async getResponseQualityMetrics(
    days: number = 30,
  ): Promise<ResponseQualityMetrics[]> {
    const cacheKey = CacheService.generateKey('quality', 'response', days);

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.metricsDataSource.getResponseQualityMetrics(days),
      CacheTTL.MEDIUM,
    );
  }

  /**
   * 캐시 통계 조회
   */
  getCacheStats() {
    return this.cacheService.getStats();
  }

  /**
   * 캐시 초기화
   */
  flushCache() {
    this.cacheService.flush();
    return { message: 'Cache flushed successfully' };
  }
}
