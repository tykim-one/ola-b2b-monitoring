import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BigQuery } from '@google-cloud/bigquery';
import { QueryDto } from './dto/query.dto';
import { DefaultProjectStrategy } from '../common/strategies/default.project.strategy';
import { CacheService, CacheTTL } from '../cache/cache.service';
import { MetricsQueries } from './queries/metrics.queries';

@Injectable()
export class BigQueryService implements OnModuleInit {
  private readonly logger = new Logger(BigQueryService.name);
  private bigQueryClient: BigQuery;
  private projectId: string;
  private datasetId: string;
  private tableName: string;
  private location: string;

  constructor(
    private configService: ConfigService,
    private projectStrategy: DefaultProjectStrategy,
    private cacheService: CacheService,
  ) {}

  onModuleInit() {
    this.projectId = this.configService.get<string>('GCP_PROJECT_ID') || '';
    this.datasetId = this.configService.get<string>('BIGQUERY_DATASET') || '';
    this.tableName = this.configService.get<string>('BIGQUERY_TABLE') || 'logs';
    this.location = this.configService.get<string>('GCP_BQ_LOCATION') || 'asia-northeast3';

    const credentials = this.configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS');

    this.bigQueryClient = new BigQuery({
      projectId: this.projectId,
      keyFilename: credentials,
    });

    this.logger.log(`BigQuery client initialized for project: ${this.projectId}, dataset: ${this.datasetId}, table: ${this.tableName}`);
  }

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
      this.logger.error(`Query execution failed: ${error.message}`, error.stack);
      throw new Error(`BigQuery query failed: ${error.message}`);
    }
  }

  /**
   * Get list of datasets
   */
  async getDatasets(): Promise<string[]> {
    try {
      const [datasets] = await this.bigQueryClient.getDatasets();
      return datasets.map(dataset => dataset.id || '').filter(id => id);
    } catch (error) {
      this.logger.error(`Failed to get datasets: ${error.message}`, error.stack);
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
      return tables.map(table => table.id || '').filter(id => id);
    } catch (error) {
      this.logger.error(`Failed to get tables: ${error.message}`, error.stack);
      throw new Error(`Failed to get tables: ${error.message}`);
    }
  }

  /**
   * Get sample logs from the configured dataset
   */
  async getSampleLogs(projectId: string, limit: number = 100): Promise<any[]> {
    const filterClause = this.projectStrategy.getFilterQuery(projectId);

    const query = `
      SELECT *
      FROM \`${this.projectId}.${this.datasetId}.${this.tableName}\`
      WHERE ${filterClause}
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `;

    const rows = await this.executeQuery({ query, maxResults: limit });
    return rows.map(row => this.projectStrategy.parseLog(row));
  }

  // ==================== 메트릭 API (캐싱 적용) ====================

  /**
   * 실시간 KPI 메트릭 (캐시 TTL: 5분)
   */
  async getRealtimeKPI(): Promise<any> {
    const cacheKey = CacheService.generateKey('metrics', 'realtime', 'kpi');

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const query = MetricsQueries.realtimeKPI(this.projectId, this.datasetId, this.tableName);
        const rows = await this.executeQuery({ query, maxResults: 1 });
        return rows[0] || null;
      },
      CacheTTL.SHORT,
    );
  }

  /**
   * 시간별 트래픽 (캐시 TTL: 15분)
   */
  async getHourlyTraffic(): Promise<any[]> {
    const cacheKey = CacheService.generateKey('metrics', 'hourly', 'traffic');

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const query = MetricsQueries.hourlyTraffic(this.projectId, this.datasetId, this.tableName);
        return this.executeQuery({ query, maxResults: 100 });
      },
      CacheTTL.MEDIUM,
    );
  }

  /**
   * 일별 트래픽 (캐시 TTL: 15분)
   */
  async getDailyTraffic(): Promise<any[]> {
    const cacheKey = CacheService.generateKey('metrics', 'daily', 'traffic');

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const query = MetricsQueries.dailyTraffic(this.projectId, this.datasetId, this.tableName);
        return this.executeQuery({ query, maxResults: 100 });
      },
      CacheTTL.MEDIUM,
    );
  }

  /**
   * 테넌트별 사용량 (캐시 TTL: 15분)
   */
  async getTenantUsage(days: number = 7): Promise<any[]> {
    const cacheKey = CacheService.generateKey('metrics', 'tenant', 'usage', days);

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const query = MetricsQueries.tenantUsage(this.projectId, this.datasetId, this.tableName, days);
        return this.executeQuery({ query, maxResults: 100 });
      },
      CacheTTL.MEDIUM,
    );
  }

  /**
   * 사용량 히트맵 (캐시 TTL: 15분)
   */
  async getUsageHeatmap(): Promise<any[]> {
    const cacheKey = CacheService.generateKey('metrics', 'usage', 'heatmap');

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const query = MetricsQueries.usageHeatmap(this.projectId, this.datasetId, this.tableName);
        return this.executeQuery({ query, maxResults: 200 });
      },
      CacheTTL.MEDIUM,
    );
  }

  /**
   * 에러 분석 (캐시 TTL: 5분)
   */
  async getErrorAnalysis(): Promise<any[]> {
    const cacheKey = CacheService.generateKey('metrics', 'error', 'analysis');

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const query = MetricsQueries.errorAnalysis(this.projectId, this.datasetId, this.tableName);
        return this.executeQuery({ query, maxResults: 100 });
      },
      CacheTTL.SHORT,
    );
  }

  /**
   * 토큰 효율성 분석 (캐시 TTL: 15분)
   */
  async getTokenEfficiency(): Promise<any[]> {
    const cacheKey = CacheService.generateKey('metrics', 'token', 'efficiency');

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const query = MetricsQueries.tokenEfficiency(this.projectId, this.datasetId, this.tableName);
        return this.executeQuery({ query, maxResults: 1000 });
      },
      CacheTTL.MEDIUM,
    );
  }

  /**
   * 이상 탐지용 통계 (캐시 TTL: 5분)
   */
  async getAnomalyStats(): Promise<any[]> {
    const cacheKey = CacheService.generateKey('metrics', 'anomaly', 'stats');

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const query = MetricsQueries.anomalyStats(this.projectId, this.datasetId, this.tableName);
        return this.executeQuery({ query, maxResults: 100 });
      },
      CacheTTL.SHORT,
    );
  }

  /**
   * 비용 트렌드 (캐시 TTL: 15분)
   */
  async getCostTrend(): Promise<any[]> {
    const cacheKey = CacheService.generateKey('metrics', 'cost', 'trend');

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const query = MetricsQueries.costTrend(this.projectId, this.datasetId, this.tableName);
        return this.executeQuery({ query, maxResults: 100 });
      },
      CacheTTL.MEDIUM,
    );
  }

  /**
   * 사용자 질의 패턴 (캐시 TTL: 15분)
   */
  async getQueryPatterns(): Promise<any[]> {
    const cacheKey = CacheService.generateKey('metrics', 'query', 'patterns');

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const query = MetricsQueries.queryPatterns(this.projectId, this.datasetId, this.tableName);
        return this.executeQuery({ query, maxResults: 500 });
      },
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
