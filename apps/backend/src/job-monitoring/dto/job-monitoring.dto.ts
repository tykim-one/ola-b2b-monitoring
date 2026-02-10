/**
 * Job Monitoring DTO
 * BigQuery View: finola-global.ola_logging_monitoring.v_job_execution_logs
 */

/** 단일 Job 실행 로그 */
export interface JobExecutionLog {
  insertId: string;
  configName: string;
  durationMs: number | null;
  fetched: number | null;
  failed: number | null;
  processed: number | null;
  saved: number | null;
  successRate: number | null;
  step: string;
  message: string;
  appTimestamp: string;
  logTimestamp: string;
}

/** config_name별 성공/실패 집계 */
export interface JobConfigSummary {
  configName: string;
  totalRuns: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgDurationMs: number | null;
}

/** 전체 요약 KPI */
export interface JobMonitoringSummary {
  totalJobs: number;
  successCount: number;
  failureCount: number;
  overallSuccessRate: number;
  avgDurationMs: number | null;
  uniqueConfigs: number;
  lastRunAt: string | null;
}
