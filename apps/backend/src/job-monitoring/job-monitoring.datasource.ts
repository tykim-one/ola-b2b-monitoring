import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BigQuery } from '@google-cloud/bigquery';
import {
  JobExecutionLog,
  JobConfigSummary,
  JobMonitoringSummary,
} from './dto/job-monitoring.dto';

@Injectable()
export class JobMonitoringDataSource {
  private readonly logger = new Logger(JobMonitoringDataSource.name);
  private bigQueryClient: BigQuery | null = null;
  private readonly location: string;

  constructor(private readonly configService: ConfigService) {
    this.location = this.configService.get<string>(
      'GCP_BQ_LOCATION',
      'asia-northeast3',
    );
  }

  private getBigQueryClient(): BigQuery {
    if (this.bigQueryClient) return this.bigQueryClient;
    const projectId = this.configService.get<string>(
      'JOB_LOGS_BQ_PROJECT',
      'finola-global',
    );
    this.bigQueryClient = new BigQuery({ projectId });
    return this.bigQueryClient;
  }

  private getViewRef(): string {
    const projectId = this.configService.get<string>(
      'JOB_LOGS_BQ_PROJECT',
      'finola-global',
    );
    const datasetId = this.configService.get<string>(
      'JOB_LOGS_BQ_DATASET',
      'ola_logging_monitoring',
    );
    const viewName = this.configService.get<string>(
      'JOB_LOGS_BQ_VIEW',
      'v_job_execution_logs',
    );
    return `\`${projectId}.${datasetId}.${viewName}\``;
  }

  private async executeQuery<T>(
    query: string,
    maxResults: number = 1000,
  ): Promise<T[]> {
    const client = this.getBigQueryClient();
    try {
      const options = {
        query,
        location: this.location,
        maxResults,
        jobTimeoutMs: 30000,
      };
      const [job] = await client.createQueryJob(options);
      const [rows] = await job.getQueryResults();
      return rows as T[];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Query execution failed: ${message}`);
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.executeQuery('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async getLogs(limit = 100, days = 7): Promise<JobExecutionLog[]> {
    const view = this.getViewRef();
    const query = `
      SELECT
        insertId,
        config_name AS configName,
        SAFE_CAST(duration_ms AS FLOAT64) AS durationMs,
        SAFE_CAST(fetched AS FLOAT64) AS fetched,
        SAFE_CAST(failed AS FLOAT64) AS failed,
        SAFE_CAST(processed AS FLOAT64) AS processed,
        SAFE_CAST(saved AS FLOAT64) AS saved,
        SAFE_CAST(success_rate AS FLOAT64) AS successRate,
        step,
        message,
        FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%S', app_timestamp, 'Asia/Seoul') AS appTimestamp,
        FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%S', log_timestamp, 'Asia/Seoul') AS logTimestamp
      FROM ${view}
      WHERE DATE(app_timestamp, 'Asia/Seoul') >= DATE_SUB(CURRENT_DATE('Asia/Seoul'), INTERVAL ${days} DAY)
      ORDER BY app_timestamp DESC
      LIMIT ${limit}
    `;
    return this.executeQuery<JobExecutionLog>(query, limit);
  }

  async getConfigSummary(days = 7): Promise<JobConfigSummary[]> {
    const view = this.getViewRef();
    const query = `
      SELECT
        config_name AS configName,
        COUNT(*) AS totalRuns,
        COUNTIF(SAFE_CAST(success_rate AS FLOAT64) = 100) AS successCount,
        COUNTIF(SAFE_CAST(success_rate AS FLOAT64) < 100 OR success_rate IS NULL) AS failureCount,
        ROUND(SAFE_DIVIDE(
          COUNTIF(SAFE_CAST(success_rate AS FLOAT64) = 100),
          COUNT(*)
        ) * 100, 2) AS successRate,
        ROUND(AVG(SAFE_CAST(duration_ms AS FLOAT64)), 0) AS avgDurationMs
      FROM ${view}
      WHERE DATE(app_timestamp, 'Asia/Seoul') >= DATE_SUB(CURRENT_DATE('Asia/Seoul'), INTERVAL ${days} DAY)
        AND step = 'job_complete'
      GROUP BY config_name
      ORDER BY totalRuns DESC
    `;
    return this.executeQuery<JobConfigSummary>(query);
  }

  async getSummary(days = 7): Promise<JobMonitoringSummary> {
    const view = this.getViewRef();
    const query = `
      SELECT
        COUNT(*) AS totalJobs,
        COUNTIF(SAFE_CAST(success_rate AS FLOAT64) = 100) AS successCount,
        COUNTIF(SAFE_CAST(success_rate AS FLOAT64) < 100 OR success_rate IS NULL) AS failureCount,
        ROUND(SAFE_DIVIDE(
          COUNTIF(SAFE_CAST(success_rate AS FLOAT64) = 100),
          COUNT(*)
        ) * 100, 2) AS overallSuccessRate,
        ROUND(AVG(SAFE_CAST(duration_ms AS FLOAT64)), 0) AS avgDurationMs,
        COUNT(DISTINCT config_name) AS uniqueConfigs,
        FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%S', MAX(app_timestamp), 'Asia/Seoul') AS lastRunAt
      FROM ${view}
      WHERE DATE(app_timestamp, 'Asia/Seoul') >= DATE_SUB(CURRENT_DATE('Asia/Seoul'), INTERVAL ${days} DAY)
        AND step = 'job_complete'
    `;
    const rows = await this.executeQuery<JobMonitoringSummary>(query);
    return rows[0] || this.getEmptySummary();
  }

  async getRecentFailedJobs(
    configNames: string[],
    minutesAgo: number = 10,
  ): Promise<JobExecutionLog[]> {
    const view = this.getViewRef();
    const nameList = configNames.map(n => `'${n}'`).join(', ');
    const query = `
      SELECT
        insertId,
        config_name AS configName,
        SAFE_CAST(duration_ms AS FLOAT64) AS durationMs,
        SAFE_CAST(fetched AS FLOAT64) AS fetched,
        SAFE_CAST(failed AS FLOAT64) AS failed,
        SAFE_CAST(processed AS FLOAT64) AS processed,
        SAFE_CAST(saved AS FLOAT64) AS saved,
        SAFE_CAST(success_rate AS FLOAT64) AS successRate,
        step,
        message,
        FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%S', app_timestamp, 'Asia/Seoul') AS appTimestamp,
        FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%S', log_timestamp, 'Asia/Seoul') AS logTimestamp
      FROM ${view}
      WHERE config_name IN (${nameList})
        AND step = 'job_complete'
        AND SAFE_CAST(failed AS FLOAT64) > 0
        AND app_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${minutesAgo} MINUTE)
      ORDER BY app_timestamp DESC
    `;
    return this.executeQuery<JobExecutionLog>(query);
  }

  private getEmptySummary(): JobMonitoringSummary {
    return {
      totalJobs: 0,
      successCount: 0,
      failureCount: 0,
      overallSuccessRate: 0,
      avgDurationMs: null,
      uniqueConfigs: 0,
      lastRunAt: null,
    };
  }
}
