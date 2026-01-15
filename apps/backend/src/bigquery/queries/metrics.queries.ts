/**
 * BigQuery 메트릭 쿼리 모음
 * Cloud Logging Export 구조에 맞춤
 * jsonPayload는 STRUCT(RECORD) 타입이므로 직접 필드 접근 사용
 * success는 BOOL 타입, 토큰 값은 FLOAT64 타입
 */

export const MetricsQueries = {
  /**
   * 실시간 KPI 메트릭 (최근 24시간)
   */
  realtimeKPI: (projectId: string, datasetId: string, tableName: string) => `
    SELECT
      COUNT(*) as total_requests,
      COUNTIF(jsonPayload.success = TRUE) as success_count,
      COUNTIF(jsonPayload.success = FALSE) as fail_count,
      ROUND(COUNTIF(jsonPayload.success = FALSE) * 100.0 / NULLIF(COUNT(*), 0), 2) as error_rate,
      CAST(COALESCE(SUM(jsonPayload.total_tokens), 0) AS INT64) as total_tokens,
      ROUND(AVG(jsonPayload.total_tokens), 2) as avg_tokens,
      CAST(COALESCE(SUM(jsonPayload.input_tokens), 0) AS INT64) as total_input_tokens,
      CAST(COALESCE(SUM(jsonPayload.output_tokens), 0) AS INT64) as total_output_tokens,
      COUNT(DISTINCT jsonPayload.tenant_id) as active_tenants
    FROM \`${projectId}.${datasetId}.${tableName}\`
    WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
  `,

  /**
   * 시간별 트래픽 (최근 24시간)
   */
  hourlyTraffic: (projectId: string, datasetId: string, tableName: string) => `
    SELECT
      TIMESTAMP_TRUNC(timestamp, HOUR) as hour,
      COUNT(*) as request_count,
      COUNTIF(jsonPayload.success = TRUE) as success_count,
      COUNTIF(jsonPayload.success = FALSE) as fail_count,
      CAST(COALESCE(SUM(jsonPayload.total_tokens), 0) AS INT64) as total_tokens,
      ROUND(AVG(jsonPayload.total_tokens), 2) as avg_tokens
    FROM \`${projectId}.${datasetId}.${tableName}\`
    WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
    GROUP BY hour
    ORDER BY hour DESC
  `,

  /**
   * 일별 트래픽 (최근 30일)
   */
  dailyTraffic: (projectId: string, datasetId: string, tableName: string) => `
    SELECT
      DATE(timestamp) as date,
      COUNT(*) as request_count,
      COUNTIF(jsonPayload.success = TRUE) as success_count,
      COUNTIF(jsonPayload.success = FALSE) as fail_count,
      CAST(COALESCE(SUM(jsonPayload.total_tokens), 0) AS INT64) as total_tokens,
      ROUND(AVG(jsonPayload.total_tokens), 2) as avg_tokens,
      COUNT(DISTINCT jsonPayload.tenant_id) as active_tenants
    FROM \`${projectId}.${datasetId}.${tableName}\`
    WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
    GROUP BY date
    ORDER BY date DESC
  `,

  /**
   * 테넌트별 사용량
   */
  tenantUsage: (projectId: string, datasetId: string, tableName: string, days: number = 7) => `
    SELECT
      jsonPayload.tenant_id as tenant_id,
      COUNT(*) as request_count,
      CAST(COALESCE(SUM(jsonPayload.total_tokens), 0) AS INT64) as total_tokens,
      CAST(COALESCE(SUM(jsonPayload.input_tokens), 0) AS INT64) as input_tokens,
      CAST(COALESCE(SUM(jsonPayload.output_tokens), 0) AS INT64) as output_tokens,
      ROUND(AVG(jsonPayload.total_tokens), 2) as avg_tokens,
      COUNTIF(jsonPayload.success = FALSE) as fail_count,
      ROUND(COUNTIF(jsonPayload.success = FALSE) * 100.0 / NULLIF(COUNT(*), 0), 2) as error_rate
    FROM \`${projectId}.${datasetId}.${tableName}\`
    WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)
    GROUP BY tenant_id
    ORDER BY total_tokens DESC
  `,

  /**
   * 사용량 히트맵 (요일 x 시간)
   */
  usageHeatmap: (projectId: string, datasetId: string, tableName: string) => `
    SELECT
      EXTRACT(DAYOFWEEK FROM timestamp) as day_of_week,
      EXTRACT(HOUR FROM timestamp) as hour,
      COUNT(*) as request_count,
      ROUND(AVG(jsonPayload.total_tokens), 2) as avg_tokens
    FROM \`${projectId}.${datasetId}.${tableName}\`
    WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
    GROUP BY day_of_week, hour
    ORDER BY day_of_week, hour
  `,

  /**
   * 에러 분석 (success = FALSE인 경우)
   */
  errorAnalysis: (projectId: string, datasetId: string, tableName: string) => `
    SELECT
      'Request Failed' as fail_reason,
      COUNT(*) as count,
      jsonPayload.tenant_id as tenant_id
    FROM \`${projectId}.${datasetId}.${tableName}\`
    WHERE jsonPayload.success = FALSE
      AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
    GROUP BY tenant_id
    ORDER BY count DESC
    LIMIT 100
  `,

  /**
   * 토큰 효율성 분석
   */
  tokenEfficiency: (projectId: string, datasetId: string, tableName: string) => `
    SELECT
      jsonPayload.tenant_id as tenant_id,
      CAST(jsonPayload.input_tokens AS INT64) as input_tokens,
      CAST(jsonPayload.output_tokens AS INT64) as output_tokens,
      CAST(jsonPayload.total_tokens AS INT64) as total_tokens,
      ROUND(jsonPayload.output_tokens / NULLIF(jsonPayload.input_tokens, 0), 3) as efficiency_ratio,
      jsonPayload.success as success,
      timestamp
    FROM \`${projectId}.${datasetId}.${tableName}\`
    WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
      AND jsonPayload.input_tokens IS NOT NULL
      AND jsonPayload.input_tokens > 0
    ORDER BY timestamp DESC
    LIMIT 1000
  `,

  /**
   * 이상 탐지용 통계 (평균, 표준편차)
   */
  anomalyStats: (projectId: string, datasetId: string, tableName: string) => `
    SELECT
      jsonPayload.tenant_id as tenant_id,
      AVG(jsonPayload.total_tokens) as avg_tokens,
      STDDEV(jsonPayload.total_tokens) as stddev_tokens,
      AVG(jsonPayload.input_tokens) as avg_input_tokens,
      STDDEV(jsonPayload.input_tokens) as stddev_input_tokens,
      COUNT(*) as sample_count,
      APPROX_QUANTILES(CAST(jsonPayload.total_tokens AS INT64), 100)[OFFSET(99)] as p99_tokens
    FROM \`${projectId}.${datasetId}.${tableName}\`
    WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
    GROUP BY tenant_id
  `,

  /**
   * 비용 트렌드 (일별)
   */
  costTrend: (projectId: string, datasetId: string, tableName: string, inputPricePerMillion: number = 3, outputPricePerMillion: number = 15) => `
    SELECT
      DATE(timestamp) as date,
      CAST(COALESCE(SUM(jsonPayload.input_tokens), 0) AS INT64) as input_tokens,
      CAST(COALESCE(SUM(jsonPayload.output_tokens), 0) AS INT64) as output_tokens,
      CAST(COALESCE(SUM(jsonPayload.total_tokens), 0) AS INT64) as total_tokens,
      ROUND(COALESCE(SUM(jsonPayload.input_tokens), 0) * ${inputPricePerMillion} / 1000000, 4) as input_cost,
      ROUND(COALESCE(SUM(jsonPayload.output_tokens), 0) * ${outputPricePerMillion} / 1000000, 4) as output_cost,
      ROUND(
        COALESCE(SUM(jsonPayload.input_tokens), 0) * ${inputPricePerMillion} / 1000000 +
        COALESCE(SUM(jsonPayload.output_tokens), 0) * ${outputPricePerMillion} / 1000000, 4
      ) as total_cost
    FROM \`${projectId}.${datasetId}.${tableName}\`
    WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
    GROUP BY date
    ORDER BY date DESC
  `,

  /**
   * 사용자 질의 패턴 (user_input 길이 분포)
   */
  queryPatterns: (projectId: string, datasetId: string, tableName: string) => `
    SELECT
      jsonPayload.tenant_id as tenant_id,
      LENGTH(jsonPayload.user_input) as query_length,
      CAST(jsonPayload.total_tokens AS INT64) as total_tokens,
      timestamp
    FROM \`${projectId}.${datasetId}.${tableName}\`
    WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
      AND jsonPayload.user_input IS NOT NULL
    ORDER BY timestamp DESC
    LIMIT 500
  `,
};
