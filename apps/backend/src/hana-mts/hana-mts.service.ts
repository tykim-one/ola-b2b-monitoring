import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BigQuery } from '@google-cloud/bigquery';
import {
  ApiTrafficKPI,
  HourlyApiTraffic,
  EndpointStats,
  SlowRequest,
  ApiError,
  BatchSyncSummary,
  BatchSyncRun,
  DailyBatchTrend,
} from './interfaces/hana-mts.interface';
import { HanaMtsQueries } from './queries/hana-mts.queries';

@Injectable()
export class HanaMtsService {
  private readonly logger = new Logger(HanaMtsService.name);
  private bigQueryClient: BigQuery | null = null;
  private readonly projectId: string;
  private readonly viewPath: string;
  private readonly location: string;

  constructor(private readonly configService: ConfigService) {
    this.projectId = this.configService.get<string>(
      'HANA_MTS_BQ_PROJECT',
      this.configService.get<string>('GCP_PROJECT_ID', ''),
    );
    const dataset = this.configService.get<string>(
      'HANA_MTS_BQ_DATASET',
      'hana_mts_monitoring',
    );
    const view = this.configService.get<string>(
      'HANA_MTS_BQ_VIEW',
      'v_hana_mts_logs',
    );
    this.location = this.configService.get<string>(
      'GCP_BQ_LOCATION',
      'asia-northeast3',
    );
    this.viewPath = `${this.projectId}.${dataset}.${view}`;
    this.initializeBigQuery();
  }

  private initializeBigQuery(): void {
    try {
      const keyFilename = this.configService.get<string>(
        'GOOGLE_APPLICATION_CREDENTIALS',
      );
      this.bigQueryClient = new BigQuery({
        projectId: this.projectId,
        keyFilename: keyFilename || undefined,
      });
      this.logger.log('BigQuery client initialized for Hana MTS monitoring');
    } catch (error) {
      this.logger.error(
        `Failed to initialize BigQuery: ${(error as Error).message}`,
      );
    }
  }

  private async executeQuery<T>(query: string): Promise<T[]> {
    if (!this.bigQueryClient) {
      this.logger.error('BigQuery client not initialized');
      return [];
    }
    try {
      const [job] = await this.bigQueryClient.createQueryJob({
        query,
        location: this.location,
        maximumBytesBilled: '1000000000',
      });
      const [rows] = await job.getQueryResults();
      return rows as T[];
    } catch (error) {
      this.logger.error(
        `BigQuery query failed: ${(error as Error).message}`,
      );
      return [];
    }
  }

  private getTodayKST(): string {
    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    return kst.toISOString().split('T')[0];
  }

  // ─────────────────────────────────────────────
  // API Traffic
  // ─────────────────────────────────────────────

  async getApiTrafficKPI(date?: string): Promise<ApiTrafficKPI> {
    const targetDate = date ?? this.getTodayKST();
    try {
      const query = HanaMtsQueries.apiTrafficKPI(this.viewPath, targetDate);
      const rows = await this.executeQuery<Record<string, unknown>>(query);
      const row = rows[0];
      if (!row) {
        return this.emptyApiTrafficKPI();
      }
      return {
        totalRequests: Number(row.total_requests ?? 0),
        errorCount: Number(row.error_count ?? 0),
        errorRate: Number(row.error_rate ?? 0),
        avgDurationMs: Number(row.avg_duration_ms ?? 0),
        p95DurationMs: Number(row.p95_duration_ms ?? 0),
        p99DurationMs: Number(row.p99_duration_ms ?? 0),
        uniqueClients: Number(row.unique_clients ?? 0),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get API traffic KPI: ${(error as Error).message}`,
      );
      return this.emptyApiTrafficKPI();
    }
  }

  async getHourlyApiTraffic(date?: string): Promise<HourlyApiTraffic[]> {
    const targetDate = date ?? this.getTodayKST();
    try {
      const query = HanaMtsQueries.hourlyApiTraffic(this.viewPath, targetDate);
      const rows = await this.executeQuery<Record<string, unknown>>(query);
      return rows.map((row) => ({
        hourKst: Number(row.hour_kst ?? 0),
        requestCount: Number(row.request_count ?? 0),
        errorCount: Number(row.error_count ?? 0),
        avgDurationMs: Number(row.avg_duration_ms ?? 0),
      }));
    } catch (error) {
      this.logger.error(
        `Failed to get hourly API traffic: ${(error as Error).message}`,
      );
      return [];
    }
  }

  async getEndpointStats(date?: string): Promise<EndpointStats[]> {
    const targetDate = date ?? this.getTodayKST();
    try {
      const query = HanaMtsQueries.endpointStats(this.viewPath, targetDate);
      const rows = await this.executeQuery<Record<string, unknown>>(query);
      return rows.map((row) => ({
        path: String(row.path ?? ''),
        method: String(row.method ?? ''),
        requestCount: Number(row.request_count ?? 0),
        errorCount: Number(row.error_count ?? 0),
        errorRate: Number(row.error_rate ?? 0),
        avgDurationMs: Number(row.avg_duration_ms ?? 0),
        p95DurationMs: Number(row.p95_duration_ms ?? 0),
      }));
    } catch (error) {
      this.logger.error(
        `Failed to get endpoint stats: ${(error as Error).message}`,
      );
      return [];
    }
  }

  async getSlowRequests(
    date?: string,
    limit?: number,
  ): Promise<SlowRequest[]> {
    const targetDate = date ?? this.getTodayKST();
    try {
      const query = HanaMtsQueries.slowRequests(
        this.viewPath,
        targetDate,
        limit,
      );
      const rows = await this.executeQuery<Record<string, unknown>>(query);
      return rows.map((row) => ({
        timestamp: String(row.timestamp ?? ''),
        method: String(row.method ?? ''),
        path: String(row.path ?? ''),
        query: String(row.query ?? ''),
        status: Number(row.status ?? 0),
        durationMs: Number(row.duration_ms ?? 0),
        clientIp: String(row.client_ip ?? ''),
      }));
    } catch (error) {
      this.logger.error(
        `Failed to get slow requests: ${(error as Error).message}`,
      );
      return [];
    }
  }

  async getApiErrors(date?: string, limit?: number): Promise<ApiError[]> {
    const targetDate = date ?? this.getTodayKST();
    try {
      const query = HanaMtsQueries.apiErrors(
        this.viewPath,
        targetDate,
        limit,
      );
      const rows = await this.executeQuery<Record<string, unknown>>(query);
      return rows.map((row) => ({
        timestamp: String(row.timestamp ?? ''),
        method: String(row.method ?? ''),
        path: String(row.path ?? ''),
        query: String(row.query ?? ''),
        status: Number(row.status ?? 0),
        durationMs: Number(row.duration_ms ?? 0),
        clientIp: String(row.client_ip ?? ''),
        requestId: String(row.request_id ?? ''),
      }));
    } catch (error) {
      this.logger.error(
        `Failed to get API errors: ${(error as Error).message}`,
      );
      return [];
    }
  }

  // ─────────────────────────────────────────────
  // Batch Sync
  // ─────────────────────────────────────────────

  async getBatchSyncSummary(date?: string): Promise<BatchSyncSummary> {
    const targetDate = date ?? this.getTodayKST();
    try {
      const query = HanaMtsQueries.batchSyncSummary(this.viewPath, targetDate);
      const rows = await this.executeQuery<Record<string, unknown>>(query);
      const row = rows[0];
      if (!row) {
        return this.emptyBatchSyncSummary();
      }
      return {
        totalRuns: Number(row.total_runs ?? 0),
        avgDurationSec: Number(row.avg_duration_sec ?? 0),
        lastRunAt: String(row.last_run_at ?? ''),
        lastWindCount: Number(row.last_wind_count ?? 0),
        lastMinkabuCount: Number(row.last_minkabu_count ?? 0),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get batch sync summary: ${(error as Error).message}`,
      );
      return this.emptyBatchSyncSummary();
    }
  }

  async getBatchSyncRuns(date?: string): Promise<BatchSyncRun[]> {
    const targetDate = date ?? this.getTodayKST();
    try {
      const query = HanaMtsQueries.batchSyncRuns(this.viewPath, targetDate);
      const rows = await this.executeQuery<Record<string, unknown>>(query);
      return rows.map((row) => ({
        timestamp: String(row.timestamp ?? ''),
        message: String(row.message ?? ''),
        durationSec:
          row.duration_sec !== null && row.duration_sec !== undefined
            ? Number(row.duration_sec)
            : null,
        cnWindCount:
          row.cn_wind_count !== null && row.cn_wind_count !== undefined
            ? Number(row.cn_wind_count)
            : null,
        jpMinkabuCount:
          row.jp_minkabu_count !== null && row.jp_minkabu_count !== undefined
            ? Number(row.jp_minkabu_count)
            : null,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to get batch sync runs: ${(error as Error).message}`,
      );
      return [];
    }
  }

  async getDailyBatchTrend(days?: number): Promise<DailyBatchTrend[]> {
    try {
      const query = HanaMtsQueries.dailyBatchTrend(this.viewPath, days);
      const rows = await this.executeQuery<Record<string, unknown>>(query);
      return rows.map((row) => ({
        dateKst: String(row.date_kst ?? ''),
        runCount: Number(row.run_count ?? 0),
        avgDurationSec: Number(row.avg_duration_sec ?? 0),
        totalWindCount: Number(row.total_wind_count ?? 0),
        totalMinkabuCount: Number(row.total_minkabu_count ?? 0),
      }));
    } catch (error) {
      this.logger.error(
        `Failed to get daily batch trend: ${(error as Error).message}`,
      );
      return [];
    }
  }

  // ─────────────────────────────────────────────
  // Defaults
  // ─────────────────────────────────────────────

  private emptyApiTrafficKPI(): ApiTrafficKPI {
    return {
      totalRequests: 0,
      errorCount: 0,
      errorRate: 0,
      avgDurationMs: 0,
      p95DurationMs: 0,
      p99DurationMs: 0,
      uniqueClients: 0,
    };
  }

  private emptyBatchSyncSummary(): BatchSyncSummary {
    return {
      totalRuns: 0,
      avgDurationSec: 0,
      lastRunAt: '',
      lastWindCount: 0,
      lastMinkabuCount: 0,
    };
  }
}
