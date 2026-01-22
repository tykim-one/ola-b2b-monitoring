import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolConfig } from 'pg';
import {
  MinkabuETLRun,
  MinkabuETLSummary,
  MinkabuETLTrend,
  MinkabuETLError,
  MinkabuETLHeadlineStats,
  MinkabuETLIndexStats,
} from './dto/minkabu-etl.dto';

/**
 * Minkabu ETL PostgreSQL DataSource
 * 테이블: ops.jp_minkabu_etl_runs
 */
@Injectable()
export class MinkabuETLDataSource implements OnModuleDestroy {
  private readonly logger = new Logger(MinkabuETLDataSource.name);
  private pool: Pool | null = null;
  private readonly schema = 'ops';
  private readonly table = 'jp_minkabu_etl_runs';

  constructor(private readonly configService: ConfigService) {}

  /**
   * PostgreSQL 연결 풀 초기화
   */
  private async getPool(): Promise<Pool> {
    if (this.pool) {
      return this.pool;
    }

    const config: PoolConfig = {
      host: this.configService.get<string>('MINKABU_PG_HOST', 'localhost'),
      port: this.configService.get<number>('MINKABU_PG_PORT', 5432),
      database: this.configService.get<string>('MINKABU_PG_DATABASE'),
      user: this.configService.get<string>('MINKABU_PG_USER'),
      password: this.configService.get<string>('MINKABU_PG_PASSWORD'),
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

    this.pool = new Pool(config);

    this.pool.on('error', (err: Error) => {
      this.logger.error(`Unexpected PostgreSQL error: ${err.message}`);
    });

    this.logger.log('Minkabu ETL PostgreSQL pool initialized');
    return this.pool;
  }

  /**
   * 쿼리 실행 헬퍼
   */
  private async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const pool = await this.getPool();
    try {
      const result = await pool.query(sql, params);
      return result.rows as T[];
    } catch (error) {
      this.logger.error(`Query failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 연결 종료
   */
  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
      this.logger.log('Minkabu ETL PostgreSQL pool closed');
    }
  }

  /**
   * 헬스 체크
   */
  async isHealthy(): Promise<boolean> {
    try {
      const pool = await this.getPool();
      await pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  // ==================== 쿼리 메서드 ====================

  /**
   * 최근 실행 목록 조회
   */
  async getRecentRuns(limit = 50): Promise<MinkabuETLRun[]> {
    const sql = `
      SELECT
        id,
        started_at as "startedAt",
        finished_at as "finishedAt",
        status,
        index_count as "indexCount",
        today_headlines as "todayHeadlines",
        yesterday_headlines as "yesterdayHeadlines",
        articles_fetched as "articlesFetched",
        error_count as "errorCount",
        errors,
        duration_ms as "durationMs"
      FROM ${this.schema}.${this.table}
      ORDER BY started_at DESC
      LIMIT $1
    `;

    return this.query<MinkabuETLRun>(sql, [limit]);
  }

  /**
   * 실행 현황 요약
   */
  async getSummary(days = 7): Promise<MinkabuETLSummary> {
    const sql = `
      WITH stats AS (
        SELECT
          COUNT(*) as total_runs,
          COUNT(*) FILTER (WHERE status = 'SUCCESS') as success_count,
          COUNT(*) FILTER (WHERE status = 'FAILED') as failure_count,
          COUNT(*) FILTER (WHERE status = 'RUNNING') as running_count,
          AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) as avg_duration_ms,
          AVG(articles_fetched) as avg_articles_fetched,
          AVG(today_headlines) as avg_today_headlines
        FROM ${this.schema}.${this.table}
        WHERE started_at >= NOW() - INTERVAL '${days} days'
      ),
      last_run AS (
        SELECT started_at, status
        FROM ${this.schema}.${this.table}
        ORDER BY started_at DESC
        LIMIT 1
      )
      SELECT
        s.total_runs as "totalRuns",
        s.success_count as "successCount",
        s.failure_count as "failureCount",
        s.running_count as "runningCount",
        CASE WHEN s.total_runs > 0
          THEN ROUND((s.success_count::numeric / s.total_runs) * 100, 2)
          ELSE 0
        END as "successRate",
        COALESCE(ROUND(s.avg_duration_ms::numeric, 0), 0) as "avgDurationMs",
        COALESCE(ROUND(s.avg_articles_fetched::numeric, 0), 0) as "avgArticlesFetched",
        COALESCE(ROUND(s.avg_today_headlines::numeric, 0), 0) as "avgTodayHeadlines",
        l.started_at as "lastRunAt",
        l.status as "lastRunStatus"
      FROM stats s
      LEFT JOIN last_run l ON true
    `;

    const rows = await this.query<MinkabuETLSummary>(sql);
    return rows[0] || this.getEmptySummary();
  }

  /**
   * 일별 트렌드
   */
  async getDailyTrend(days = 30): Promise<MinkabuETLTrend[]> {
    const sql = `
      SELECT
        DATE(started_at)::text as period,
        COUNT(*) as "runCount",
        COUNT(*) FILTER (WHERE status = 'SUCCESS') as "successCount",
        COUNT(*) FILTER (WHERE status = 'FAILED') as "failureCount",
        CASE WHEN COUNT(*) > 0
          THEN ROUND((COUNT(*) FILTER (WHERE status = 'SUCCESS')::numeric / COUNT(*)) * 100, 2)
          ELSE 0
        END as "successRate",
        COALESCE(SUM(articles_fetched), 0) as "totalArticlesFetched",
        COALESCE(SUM(today_headlines), 0) as "totalTodayHeadlines",
        COALESCE(ROUND(AVG(duration_ms)::numeric, 0), 0) as "avgDurationMs"
      FROM ${this.schema}.${this.table}
      WHERE started_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(started_at)
      ORDER BY period DESC
    `;

    return this.query<MinkabuETLTrend>(sql);
  }

  /**
   * 시간별 트렌드 (최근 N시간)
   */
  async getHourlyTrend(hours = 24): Promise<MinkabuETLTrend[]> {
    const sql = `
      SELECT
        TO_CHAR(DATE_TRUNC('hour', started_at), 'YYYY-MM-DD HH24:00') as period,
        COUNT(*) as "runCount",
        COUNT(*) FILTER (WHERE status = 'SUCCESS') as "successCount",
        COUNT(*) FILTER (WHERE status = 'FAILED') as "failureCount",
        CASE WHEN COUNT(*) > 0
          THEN ROUND((COUNT(*) FILTER (WHERE status = 'SUCCESS')::numeric / COUNT(*)) * 100, 2)
          ELSE 0
        END as "successRate",
        COALESCE(SUM(articles_fetched), 0) as "totalArticlesFetched",
        COALESCE(SUM(today_headlines), 0) as "totalTodayHeadlines",
        COALESCE(ROUND(AVG(duration_ms)::numeric, 0), 0) as "avgDurationMs"
      FROM ${this.schema}.${this.table}
      WHERE started_at >= NOW() - INTERVAL '${hours} hours'
      GROUP BY DATE_TRUNC('hour', started_at)
      ORDER BY period DESC
    `;

    return this.query<MinkabuETLTrend>(sql);
  }

  /**
   * 에러 분석
   */
  async getErrorAnalysis(days = 7): Promise<MinkabuETLError[]> {
    const sql = `
      WITH error_runs AS (
        SELECT
          id,
          started_at,
          UNNEST(errors) as error_message
        FROM ${this.schema}.${this.table}
        WHERE error_count > 0
          AND errors IS NOT NULL
          AND started_at >= NOW() - INTERVAL '${days} days'
      )
      SELECT
        error_message as "errorMessage",
        COUNT(*) as "occurrenceCount",
        MIN(started_at)::text as "firstSeen",
        MAX(started_at)::text as "lastSeen",
        ARRAY_AGG(DISTINCT id) as "affectedRuns"
      FROM error_runs
      GROUP BY error_message
      ORDER BY "occurrenceCount" DESC
      LIMIT 50
    `;

    return this.query<MinkabuETLError>(sql);
  }

  /**
   * 헤드라인 수집 통계 (일별)
   */
  async getHeadlineStats(days = 30): Promise<MinkabuETLHeadlineStats[]> {
    const sql = `
      SELECT
        DATE(started_at)::text as date,
        COALESCE(SUM(today_headlines), 0) as "totalTodayHeadlines",
        COALESCE(SUM(yesterday_headlines), 0) as "totalYesterdayHeadlines",
        COALESCE(SUM(articles_fetched), 0) as "totalArticlesFetched",
        CASE WHEN COUNT(*) > 0
          THEN ROUND(AVG(today_headlines)::numeric, 0)
          ELSE 0
        END as "avgHeadlinesPerRun"
      FROM ${this.schema}.${this.table}
      WHERE started_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(started_at)
      ORDER BY date DESC
    `;

    return this.query<MinkabuETLHeadlineStats>(sql);
  }

  /**
   * 인덱스 통계 (일별)
   */
  async getIndexStats(days = 30): Promise<MinkabuETLIndexStats[]> {
    const sql = `
      SELECT
        DATE(started_at)::text as date,
        COALESCE(SUM(index_count), 0) as "totalIndexCount",
        CASE WHEN COUNT(*) > 0
          THEN ROUND(AVG(index_count)::numeric, 0)
          ELSE 0
        END as "avgIndexPerRun",
        COUNT(*) as "runCount"
      FROM ${this.schema}.${this.table}
      WHERE started_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(started_at)
      ORDER BY date DESC
    `;

    return this.query<MinkabuETLIndexStats>(sql);
  }

  /**
   * 빈 요약 반환
   */
  private getEmptySummary(): MinkabuETLSummary {
    return {
      totalRuns: 0,
      successCount: 0,
      failureCount: 0,
      runningCount: 0,
      successRate: 0,
      avgDurationMs: 0,
      avgArticlesFetched: 0,
      avgTodayHeadlines: 0,
      lastRunAt: null,
      lastRunStatus: null,
    };
  }
}
