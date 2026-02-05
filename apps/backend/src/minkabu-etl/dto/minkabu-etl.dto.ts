/**
 * Minkabu ETL 모니터링 DTO
 * 테이블: ops.jp_minkabu_etl_runs
 */

/** 단일 ETL 실행 레코드 */
export interface MinkabuETLRun {
  id: number;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  indexCount: number | null;
  todayHeadlines: number | null;
  yesterdayHeadlines: number | null;
  articlesFetched: number | null;
  errorCount: number;
  errors: string[] | null;
  durationMs: number | null;
}

/** 실행 현황 요약 */
export interface MinkabuETLSummary {
  totalRuns: number;
  successCount: number;
  failureCount: number;
  runningCount: number;
  successRate: number;
  avgDurationMs: number;
  avgArticlesFetched: number;
  avgTodayHeadlines: number;
  /** 오늘 총 처리 기사 수 (SUM) */
  todayTotalArticles: number;
  /** 오늘 총 헤드라인 수 (SUM) */
  todayTotalHeadlines: number;
  lastRunAt: string | null;
  lastRunStatus: string | null;
}

/** 일별/시간별 트렌드 */
export interface MinkabuETLTrend {
  period: string; // 날짜 또는 시간
  runCount: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  totalArticlesFetched: number;
  totalTodayHeadlines: number;
  avgDurationMs: number;
}

/** 에러 분석 */
export interface MinkabuETLError {
  errorMessage: string;
  occurrenceCount: number;
  firstSeen: string;
  lastSeen: string;
  affectedRuns: number[];
}

/** 헤드라인 수집 통계 */
export interface MinkabuETLHeadlineStats {
  date: string;
  totalTodayHeadlines: number;
  totalYesterdayHeadlines: number;
  totalArticlesFetched: number;
  avgHeadlinesPerRun: number;
}

/** 인덱스 통계 */
export interface MinkabuETLIndexStats {
  date: string;
  totalIndexCount: number;
  avgIndexPerRun: number;
  runCount: number;
}
