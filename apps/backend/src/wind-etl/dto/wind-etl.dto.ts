/**
 * Wind ETL 모니터링 DTO
 * 테이블: ops.cn_wind_etl_runs
 */

/** 단일 ETL 실행 레코드 */
export interface WindETLRun {
  id: number;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  filesFound: number;
  filesProcessed: number;
  filesSkipped: number;
  filesMoved: number;
  recordsInserted: number;
  recordsUpdated: number;
  totalRecords: number;
  errorCount: number;
  errors: string[] | null;
  durationMs: number | null;
}

/** 실행 현황 요약 */
export interface WindETLSummary {
  totalRuns: number;
  successCount: number;
  failureCount: number;
  runningCount: number;
  successRate: number;
  avgDurationMs: number;
  avgFilesProcessed: number;
  avgRecordsInserted: number;
  lastRunAt: string | null;
  lastRunStatus: string | null;
}

/** 일별/시간별 트렌드 */
export interface WindETLTrend {
  period: string; // 날짜 또는 시간
  runCount: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  totalFilesProcessed: number;
  totalRecordsInserted: number;
  avgDurationMs: number;
}

/** 에러 분석 */
export interface WindETLError {
  errorMessage: string;
  occurrenceCount: number;
  firstSeen: string;
  lastSeen: string;
  affectedRuns: number[];
}

/** 파일 처리 통계 */
export interface WindETLFileStats {
  date: string;
  totalFilesFound: number;
  totalFilesProcessed: number;
  totalFilesSkipped: number;
  totalFilesMoved: number;
  processingRate: number; // processed / found * 100
}

/** 레코드 처리 통계 */
export interface WindETLRecordStats {
  date: string;
  totalRecordsInserted: number;
  totalRecordsUpdated: number;
  totalRecords: number;
  avgRecordsPerRun: number;
}
