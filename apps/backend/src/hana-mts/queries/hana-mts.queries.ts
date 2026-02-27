/**
 * HANA MTS 모니터링용 BigQuery 뷰 쿼리 모음
 *
 * 대상 뷰: finola-global.hana_mts_monitoring.v_hana_mts_logs (view 파라미터로 전달)
 *
 * NOTE: 뷰에 date_kst (DATE), hour_kst (INT64) 컬럼이 KST로 사전 계산되어 있음.
 * DATE(timestamp, 'Asia/Seoul') 대신 date_kst 를 직접 사용할 것.
 *
 * log_type 구분:
 *   - 'API_REQUEST' : HTTP API 요청 로그
 *   - 'BATCH_SYNC'  : 배치 동기화 로그 (cn_wind_count, jp_minkabu_count 포함)
 *   - 'OTHER'       : 기타 로그
 */
export class HanaMtsQueries {
  /**
   * 쿼리 1: 일별 API 트래픽 KPI
   * 총 요청 수, 에러 수, 에러율, 평균/P95/P99 응답시간, 고유 클라이언트 수
   */
  static apiTrafficKPI(view: string, targetDate: string): string {
    return `
SELECT
  COUNT(*) as total_requests,
  COUNTIF(status >= 400) as error_count,
  ROUND(COUNTIF(status >= 400) * 100.0 / NULLIF(COUNT(*), 0), 2) as error_rate,
  ROUND(AVG(duration_ms), 2) as avg_duration_ms,
  APPROX_QUANTILES(duration_ms, 100)[OFFSET(95)] as p95_duration_ms,
  APPROX_QUANTILES(duration_ms, 100)[OFFSET(99)] as p99_duration_ms,
  COUNT(DISTINCT client_ip) as unique_clients
FROM \`${view}\`
WHERE log_type = 'API_REQUEST' AND date_kst = '${targetDate}'`;
  }

  /**
   * 쿼리 2: 시간대별 API 트래픽 (KST 기준 0~23시)
   * hour_kst 별 요청 수, 에러 수, 평균 응답시간
   */
  static hourlyApiTraffic(view: string, targetDate: string): string {
    return `
SELECT
  hour_kst,
  COUNT(*) as request_count,
  COUNTIF(status >= 400) as error_count,
  ROUND(AVG(duration_ms), 2) as avg_duration_ms
FROM \`${view}\`
WHERE log_type = 'API_REQUEST' AND date_kst = '${targetDate}'
GROUP BY hour_kst
ORDER BY hour_kst`;
  }

  /**
   * 쿼리 3: 엔드포인트별 통계
   * path/method 기준 요청 수, 에러율, 평균 응답시간, P95 응답시간
   */
  static endpointStats(view: string, targetDate: string): string {
    return `
SELECT
  path,
  method,
  COUNT(*) as request_count,
  COUNTIF(status >= 400) as error_count,
  ROUND(COUNTIF(status >= 400) * 100.0 / NULLIF(COUNT(*), 0), 2) as error_rate,
  ROUND(AVG(duration_ms), 2) as avg_duration_ms,
  APPROX_QUANTILES(duration_ms, 100)[OFFSET(95)] as p95_duration_ms
FROM \`${view}\`
WHERE log_type = 'API_REQUEST' AND date_kst = '${targetDate}'
GROUP BY path, method
ORDER BY request_count DESC`;
  }

  /**
   * 쿼리 4: 응답 시간 상위 느린 요청 목록
   * duration_ms 기준 내림차순, 기본 20건
   */
  static slowRequests(
    view: string,
    targetDate: string,
    limit: number = 20,
  ): string {
    return `
SELECT
  FORMAT_TIMESTAMP('%Y-%m-%d %H:%M:%S', timestamp, 'Asia/Seoul') as timestamp,
  method,
  path,
  COALESCE(query, '') as query,
  status,
  duration_ms,
  COALESCE(client_ip, '') as client_ip
FROM \`${view}\`
WHERE log_type = 'API_REQUEST' AND date_kst = '${targetDate}' AND duration_ms IS NOT NULL
ORDER BY duration_ms DESC
LIMIT ${limit}`;
  }

  /**
   * 쿼리 5: 에러 요청 목록 (status >= 400)
   * 최신 순 정렬, 기본 50건
   */
  static apiErrors(
    view: string,
    targetDate: string,
    limit: number = 50,
  ): string {
    return `
SELECT
  FORMAT_TIMESTAMP('%Y-%m-%d %H:%M:%S', timestamp, 'Asia/Seoul') as timestamp,
  method,
  path,
  COALESCE(query, '') as query,
  status,
  COALESCE(duration_ms, 0) as duration_ms,
  COALESCE(client_ip, '') as client_ip,
  COALESCE(request_id, '') as request_id
FROM \`${view}\`
WHERE log_type = 'API_REQUEST' AND date_kst = '${targetDate}' AND status >= 400
ORDER BY timestamp DESC
LIMIT ${limit}`;
  }

  /**
   * 쿼리 6: 배치 동기화 일별 요약
   * 실행 횟수, 평균 소요시간, 마지막 실행 시각, 마지막 wind/minkabu 건수
   */
  static batchSyncSummary(view: string, targetDate: string): string {
    return `
SELECT
  COUNTIF(message = 'batch sync completed') as total_runs,
  ROUND(AVG(CASE WHEN message = 'batch sync completed' THEN batch_duration_sec END), 2) as avg_duration_sec,
  FORMAT_TIMESTAMP('%Y-%m-%d %H:%M:%S',
    MAX(CASE WHEN message = 'batch sync completed' THEN timestamp END), 'Asia/Seoul') as last_run_at,
  MAX(CASE WHEN message = 'batch sync completed' THEN cn_wind_count END) as last_wind_count,
  MAX(CASE WHEN message = 'batch sync completed' THEN jp_minkabu_count END) as last_minkabu_count
FROM \`${view}\`
WHERE log_type = 'BATCH_SYNC' AND date_kst = '${targetDate}'`;
  }

  /**
   * 쿼리 7: 배치 동기화 실행 이력 (시간순)
   * 각 실행의 타임스탬프, 메시지, 소요시간, wind/minkabu 건수
   */
  static batchSyncRuns(view: string, targetDate: string): string {
    return `
SELECT
  FORMAT_TIMESTAMP('%Y-%m-%d %H:%M:%S', timestamp, 'Asia/Seoul') as timestamp,
  message,
  batch_duration_sec as duration_sec,
  cn_wind_count,
  jp_minkabu_count
FROM \`${view}\`
WHERE log_type = 'BATCH_SYNC' AND date_kst = '${targetDate}'
ORDER BY timestamp`;
  }

  /**
   * 쿼리 8: 배치 동기화 일별 트렌드 (최근 N일)
   * 날짜별 실행 횟수, 평균 소요시간, 총 wind/minkabu 건수
   * targetDate 대신 days 파라미터 사용 (기본 14일)
   */
  static dailyBatchTrend(view: string, days: number = 14): string {
    return `
SELECT
  CAST(date_kst AS STRING) as date_kst,
  COUNTIF(message = 'batch sync completed') as run_count,
  ROUND(AVG(CASE WHEN message = 'batch sync completed' THEN batch_duration_sec END), 2) as avg_duration_sec,
  MAX(CASE WHEN message = 'batch sync completed' THEN cn_wind_count END) as total_wind_count,
  MAX(CASE WHEN message = 'batch sync completed' THEN jp_minkabu_count END) as total_minkabu_count
FROM \`${view}\`
WHERE log_type = 'BATCH_SYNC'
  AND date_kst >= DATE_SUB((CURRENT_TIMESTAMP() AT TIME ZONE 'Asia/Seoul'), INTERVAL ${days} DAY)
GROUP BY date_kst
ORDER BY date_kst`;
  }
}
