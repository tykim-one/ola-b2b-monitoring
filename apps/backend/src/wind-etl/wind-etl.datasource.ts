import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolConfig } from 'pg';
import {
  WindETLRun,
  WindETLSummary,
  WindETLTrend,
  WindETLError,
  WindETLFileStats,
  WindETLRecordStats,
} from './dto/wind-etl.dto';

/**
 * Wind ETL PostgreSQL DataSource
 * 테이블: ops.cn_wind_etl_runs
 */
@Injectable()
export class WindETLDataSource implements OnModuleDestroy {
  private readonly logger = new Logger(WindETLDataSource.name);
  private pool: Pool | null = null;
  private readonly schema = 'ops';
  private readonly table = 'cn_wind_etl_runs';

  constructor(private readonly configService: ConfigService) {}

  /**
   * PostgreSQL 연결 풀 초기화
   */
  private async getPool(): Promise<Pool> {
    if (this.pool) {
      return this.pool;
    }

    const config: PoolConfig = {
      host: this.configService.get<string>('WIND_PG_HOST', 'localhost'),
      port: this.configService.get<number>('WIND_PG_PORT', 5432),
      database: this.configService.get<string>('WIND_PG_DATABASE'),
      user: this.configService.get<string>('WIND_PG_USER'),
      password: this.configService.get<string>('WIND_PG_PASSWORD'),
      max: 10, // 최대 연결 수
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

    this.pool = new Pool(config);

    this.pool.on('error', (err: Error) => {
      this.logger.error(`Unexpected PostgreSQL error: ${err.message}`);
    });

    this.logger.log('Wind ETL PostgreSQL pool initialized');
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
      this.logger.log('Wind ETL PostgreSQL pool closed');
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
  async getRecentRuns(limit = 50): Promise<WindETLRun[]> {
    const sql = `
      SELECT
        id,
        started_at as "startedAt",
        finished_at as "finishedAt",
        status,
        files_found as "filesFound",
        files_processed as "filesProcessed",
        files_skipped as "filesSkipped",
        files_moved as "filesMoved",
        records_inserted as "recordsInserted",
        records_updated as "recordsUpdated",
        total_records as "totalRecords",
        error_count as "errorCount",
        errors,
        duration_ms as "durationMs"
      FROM ${this.schema}.${this.table}
      ORDER BY started_at DESC
      LIMIT $1
    `;

    return this.query<WindETLRun>(sql, [limit]);
  }

  /**
   * 실행 현황 요약
   */
  async getSummary(days = 7): Promise<WindETLSummary> {
    const sql = `
      WITH stats AS (
        SELECT
          COUNT(*) as total_runs,
          COUNT(*) FILTER (WHERE status = 'success') as success_count,
          COUNT(*) FILTER (WHERE status = 'failed') as failure_count,
          COUNT(*) FILTER (WHERE status = 'running') as running_count,
          AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) as avg_duration_ms,
          AVG(files_processed) as avg_files_processed,
          AVG(records_inserted) as avg_records_inserted
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
        COALESCE(ROUND(s.avg_files_processed::numeric, 0), 0) as "avgFilesProcessed",
        COALESCE(ROUND(s.avg_records_inserted::numeric, 0), 0) as "avgRecordsInserted",
        l.started_at as "lastRunAt",
        l.status as "lastRunStatus"
      FROM stats s
      LEFT JOIN last_run l ON true
    `;

    const rows = await this.query<WindETLSummary>(sql);
    return rows[0] || this.getEmptySummary();
  }

  /**
   * 일별 트렌드
   */
  async getDailyTrend(days = 30): Promise<WindETLTrend[]> {
    const sql = `
      SELECT
        DATE(started_at)::text as period,
        COUNT(*) as "runCount",
        COUNT(*) FILTER (WHERE status = 'success') as "successCount",
        COUNT(*) FILTER (WHERE status = 'failed') as "failureCount",
        CASE WHEN COUNT(*) > 0
          THEN ROUND((COUNT(*) FILTER (WHERE status = 'success')::numeric / COUNT(*)) * 100, 2)
          ELSE 0
        END as "successRate",
        COALESCE(SUM(files_processed), 0) as "totalFilesProcessed",
        COALESCE(SUM(records_inserted), 0) as "totalRecordsInserted",
        COALESCE(ROUND(AVG(duration_ms)::numeric, 0), 0) as "avgDurationMs"
      FROM ${this.schema}.${this.table}
      WHERE started_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(started_at)
      ORDER BY period DESC
    `;

    return this.query<WindETLTrend>(sql);
  }

  /**
   * 시간별 트렌드 (최근 N시간)
   */
  async getHourlyTrend(hours = 24): Promise<WindETLTrend[]> {
    const sql = `
      SELECT
        TO_CHAR(DATE_TRUNC('hour', started_at), 'YYYY-MM-DD HH24:00') as period,
        COUNT(*) as "runCount",
        COUNT(*) FILTER (WHERE status = 'success') as "successCount",
        COUNT(*) FILTER (WHERE status = 'failed') as "failureCount",
        CASE WHEN COUNT(*) > 0
          THEN ROUND((COUNT(*) FILTER (WHERE status = 'success')::numeric / COUNT(*)) * 100, 2)
          ELSE 0
        END as "successRate",
        COALESCE(SUM(files_processed), 0) as "totalFilesProcessed",
        COALESCE(SUM(records_inserted), 0) as "totalRecordsInserted",
        COALESCE(ROUND(AVG(duration_ms)::numeric, 0), 0) as "avgDurationMs"
      FROM ${this.schema}.${this.table}
      WHERE started_at >= NOW() - INTERVAL '${hours} hours'
      GROUP BY DATE_TRUNC('hour', started_at)
      ORDER BY period DESC
    `;

    return this.query<WindETLTrend>(sql);
  }

  /**
   * 에러 분석
   */
  async getErrorAnalysis(days = 7): Promise<WindETLError[]> {
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

    return this.query<WindETLError>(sql);
  }

  /**
   * 파일 처리 통계 (일별)
   */
  async getFileProcessingStats(days = 30): Promise<WindETLFileStats[]> {
    const sql = `
      SELECT
        DATE(started_at)::text as date,
        COALESCE(SUM(files_found), 0) as "totalFilesFound",
        COALESCE(SUM(files_processed), 0) as "totalFilesProcessed",
        COALESCE(SUM(files_skipped), 0) as "totalFilesSkipped",
        COALESCE(SUM(files_moved), 0) as "totalFilesMoved",
        CASE WHEN SUM(files_found) > 0
          THEN ROUND((SUM(files_processed)::numeric / SUM(files_found)) * 100, 2)
          ELSE 0
        END as "processingRate"
      FROM ${this.schema}.${this.table}
      WHERE started_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(started_at)
      ORDER BY date DESC
    `;

    return this.query<WindETLFileStats>(sql);
  }

  /**
   * 레코드 처리 통계 (일별)
   */
  async getRecordStats(days = 30): Promise<WindETLRecordStats[]> {
    const sql = `
      SELECT
        DATE(started_at)::text as date,
        COALESCE(SUM(records_inserted), 0) as "totalRecordsInserted",
        COALESCE(SUM(records_updated), 0) as "totalRecordsUpdated",
        COALESCE(SUM(total_records), 0) as "totalRecords",
        CASE WHEN COUNT(*) > 0
          THEN ROUND(AVG(records_inserted)::numeric, 0)
          ELSE 0
        END as "avgRecordsPerRun"
      FROM ${this.schema}.${this.table}
      WHERE started_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(started_at)
      ORDER BY date DESC
    `;

    return this.query<WindETLRecordStats>(sql);
  }

  /**
   * 빈 요약 반환
   */
  private getEmptySummary(): WindETLSummary {
    return {
      totalRuns: 0,
      successCount: 0,
      failureCount: 0,
      runningCount: 0,
      successRate: 0,
      avgDurationMs: 0,
      avgFilesProcessed: 0,
      avgRecordsInserted: 0,
      lastRunAt: null,
      lastRunStatus: null,
    };
  }
}
