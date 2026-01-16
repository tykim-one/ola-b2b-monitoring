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
  async getRealtimeKPI(): Promise<RealtimeKPI> {
    const cacheKey = CacheService.generateKey('metrics', 'realtime', 'kpi');

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.metricsDataSource.getRealtimeKPI(),
      CacheTTL.SHORT,
    );
  }

  /**
   * 시간별 트래픽 (캐시 TTL: 15분)
   */
  async getHourlyTraffic(): Promise<HourlyTraffic[]> {
    const cacheKey = CacheService.generateKey('metrics', 'hourly', 'traffic');

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.metricsDataSource.getHourlyTraffic(),
      CacheTTL.MEDIUM,
    );
  }

  /**
   * 일별 트래픽 (캐시 TTL: 15분)
   */
  async getDailyTraffic(): Promise<DailyTraffic[]> {
    const cacheKey = CacheService.generateKey('metrics', 'daily', 'traffic');

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.metricsDataSource.getDailyTraffic(),
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
  async getErrorAnalysis(): Promise<ErrorAnalysis[]> {
    const cacheKey = CacheService.generateKey('metrics', 'error', 'analysis');

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.metricsDataSource.getErrorAnalysis(),
      CacheTTL.SHORT,
    );
  }

  /**
   * 토큰 효율성 분석 (캐시 TTL: 15분)
   */
  async getTokenEfficiency(): Promise<TokenEfficiency[]> {
    const cacheKey = CacheService.generateKey('metrics', 'token', 'efficiency');

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.metricsDataSource.getTokenEfficiency(),
      CacheTTL.MEDIUM,
    );
  }

  /**
   * 이상 탐지용 통계 (캐시 TTL: 5분)
   */
  async getAnomalyStats(): Promise<AnomalyStats[]> {
    const cacheKey = CacheService.generateKey('metrics', 'anomaly', 'stats');

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.metricsDataSource.getAnomalyStats(),
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
   */
  async getTokenEfficiencyTrend(): Promise<TokenEfficiencyTrend[]> {
    const cacheKey = CacheService.generateKey('quality', 'efficiency', 'trend');

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.metricsDataSource.getTokenEfficiencyTrend(),
      CacheTTL.MEDIUM,
    );
  }

  /**
   * 질문-응답 길이 상관관계 (캐시 TTL: 15분)
   */
  async getQueryResponseCorrelation(): Promise<QueryResponseCorrelation[]> {
    const cacheKey = CacheService.generateKey(
      'quality',
      'query',
      'correlation',
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.metricsDataSource.getQueryResponseCorrelation(),
      CacheTTL.MEDIUM,
    );
  }

  /**
   * 반복 질문 패턴 (캐시 TTL: 15분)
   */
  async getRepeatedQueryPatterns(): Promise<RepeatedQueryPattern[]> {
    const cacheKey = CacheService.generateKey(
      'quality',
      'repeated',
      'patterns',
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.metricsDataSource.getRepeatedQueryPatterns(),
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
    limit: number = 1000,
  ): Promise<UserQuestionPattern[]> {
    const cacheKey = CacheService.generateKey(
      'user',
      'question',
      'patterns',
      userId ?? 'all',
      limit,
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.metricsDataSource.getUserQuestionPatterns(userId, limit),
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
