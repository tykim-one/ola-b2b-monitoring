/**
 * BigQuery 메트릭 쿼리 모음
 * Cloud Logging Export 구조 (플랫 스키마)
 * - success: BOOL 타입 (TRUE/FALSE)
 * - 토큰 값: STRING 타입 (FLOAT64로 캐스팅 필요)
 * - tenant_id: 루트 레벨 STRING
 */

export const MetricsQueries = {
  /**
   * 실시간 KPI 메트릭 (최근 24시간)
   */
  realtimeKPI: (projectId: string, datasetId: string, tableName: string) => `
    SELECT
      COUNT(*) as total_requests,
      COUNTIF(success = TRUE) as success_count,
      COUNTIF(success = FALSE) as fail_count,
      ROUND(COUNTIF(success = FALSE) * 100.0 / NULLIF(COUNT(*), 0), 2) as error_rate,
      CAST(COALESCE(SUM(CAST(total_tokens AS FLOAT64)), 0) AS INT64) as total_tokens,
      ROUND(AVG(CAST(total_tokens AS FLOAT64)), 2) as avg_tokens,
      CAST(COALESCE(SUM(CAST(input_tokens AS FLOAT64)), 0) AS INT64) as total_input_tokens,
      CAST(COALESCE(SUM(CAST(output_tokens AS FLOAT64)), 0) AS INT64) as total_output_tokens,
      COUNT(DISTINCT tenant_id) as active_tenants
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
      COUNTIF(success = TRUE) as success_count,
      COUNTIF(success = FALSE) as fail_count,
      CAST(COALESCE(SUM(CAST(total_tokens AS FLOAT64)), 0) AS INT64) as total_tokens,
      ROUND(AVG(CAST(total_tokens AS FLOAT64)), 2) as avg_tokens
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
      COUNTIF(success = TRUE) as success_count,
      COUNTIF(success = FALSE) as fail_count,
      CAST(COALESCE(SUM(CAST(total_tokens AS FLOAT64)), 0) AS INT64) as total_tokens,
      ROUND(AVG(CAST(total_tokens AS FLOAT64)), 2) as avg_tokens,
      COUNT(DISTINCT tenant_id) as active_tenants
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
      tenant_id,
      COUNT(*) as request_count,
      CAST(COALESCE(SUM(CAST(total_tokens AS FLOAT64)), 0) AS INT64) as total_tokens,
      CAST(COALESCE(SUM(CAST(input_tokens AS FLOAT64)), 0) AS INT64) as input_tokens,
      CAST(COALESCE(SUM(CAST(output_tokens AS FLOAT64)), 0) AS INT64) as output_tokens,
      ROUND(AVG(CAST(total_tokens AS FLOAT64)), 2) as avg_tokens,
      COUNTIF(success = FALSE) as fail_count,
      ROUND(COUNTIF(success = FALSE) * 100.0 / NULLIF(COUNT(*), 0), 2) as error_rate
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
      ROUND(AVG(CAST(total_tokens AS FLOAT64)), 2) as avg_tokens
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
      tenant_id
    FROM \`${projectId}.${datasetId}.${tableName}\`
    WHERE success = FALSE
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
      tenant_id,
      CAST(COALESCE(SAFE_CAST(input_tokens AS FLOAT64), 0) AS INT64) as input_tokens,
      CAST(COALESCE(SAFE_CAST(output_tokens AS FLOAT64), 0) AS INT64) as output_tokens,
      CAST(COALESCE(SAFE_CAST(total_tokens AS FLOAT64), 0) AS INT64) as total_tokens,
      ROUND(
        SAFE_CAST(output_tokens AS FLOAT64) / NULLIF(SAFE_CAST(input_tokens AS FLOAT64), 0),
        3
      ) as efficiency_ratio,
      success,
      timestamp
    FROM \`${projectId}.${datasetId}.${tableName}\`
    WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
      AND SAFE_CAST(total_tokens AS FLOAT64) > 0
    ORDER BY timestamp DESC
    LIMIT 1000
  `,

  /**
   * 이상 탐지용 통계 (평균, 표준편차)
   */
  anomalyStats: (projectId: string, datasetId: string, tableName: string) => `
    SELECT
      tenant_id,
      AVG(CAST(total_tokens AS FLOAT64)) as avg_tokens,
      STDDEV(CAST(total_tokens AS FLOAT64)) as stddev_tokens,
      AVG(CAST(input_tokens AS FLOAT64)) as avg_input_tokens,
      STDDEV(CAST(input_tokens AS FLOAT64)) as stddev_input_tokens,
      COUNT(*) as sample_count,
      APPROX_QUANTILES(CAST(CAST(total_tokens AS FLOAT64) AS INT64), 100)[OFFSET(99)] as p99_tokens
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
      CAST(COALESCE(SUM(CAST(input_tokens AS FLOAT64)), 0) AS INT64) as input_tokens,
      CAST(COALESCE(SUM(CAST(output_tokens AS FLOAT64)), 0) AS INT64) as output_tokens,
      CAST(COALESCE(SUM(CAST(total_tokens AS FLOAT64)), 0) AS INT64) as total_tokens,
      ROUND(COALESCE(SUM(CAST(input_tokens AS FLOAT64)), 0) * ${inputPricePerMillion} / 1000000, 4) as input_cost,
      ROUND(COALESCE(SUM(CAST(output_tokens AS FLOAT64)), 0) * ${outputPricePerMillion} / 1000000, 4) as output_cost,
      ROUND(
        COALESCE(SUM(CAST(input_tokens AS FLOAT64)), 0) * ${inputPricePerMillion} / 1000000 +
        COALESCE(SUM(CAST(output_tokens AS FLOAT64)), 0) * ${outputPricePerMillion} / 1000000, 4
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
      tenant_id,
      LENGTH(user_input) as query_length,
      CAST(CAST(total_tokens AS FLOAT64) AS INT64) as total_tokens,
      timestamp
    FROM \`${projectId}.${datasetId}.${tableName}\`
    WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
      AND user_input IS NOT NULL
    ORDER BY timestamp DESC
    LIMIT 500
  `,

  // ==================== 품질 분석 쿼리 ====================

  /**
   * 일별 토큰 효율성 트렌드 (최근 30일)
   */
  tokenEfficiencyTrend: (projectId: string, datasetId: string, tableName: string) => `
    SELECT
      DATE(timestamp) as date,
      ROUND(AVG(
        SAFE_CAST(output_tokens AS FLOAT64) / NULLIF(SAFE_CAST(input_tokens AS FLOAT64), 0)
      ), 3) as avg_efficiency_ratio,
      ROUND(MIN(
        SAFE_CAST(output_tokens AS FLOAT64) / NULLIF(SAFE_CAST(input_tokens AS FLOAT64), 0)
      ), 3) as min_efficiency_ratio,
      ROUND(MAX(
        SAFE_CAST(output_tokens AS FLOAT64) / NULLIF(SAFE_CAST(input_tokens AS FLOAT64), 0)
      ), 3) as max_efficiency_ratio,
      COUNT(*) as total_requests,
      ROUND(AVG(SAFE_CAST(input_tokens AS FLOAT64)), 0) as avg_input_tokens,
      ROUND(AVG(SAFE_CAST(output_tokens AS FLOAT64)), 0) as avg_output_tokens
    FROM \`${projectId}.${datasetId}.${tableName}\`
    WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
      AND SAFE_CAST(input_tokens AS FLOAT64) > 0
      AND SAFE_CAST(output_tokens AS FLOAT64) > 0
    GROUP BY date
    ORDER BY date ASC
  `,

  /**
   * 질문-응답 길이 상관관계 분석
   */
  queryResponseCorrelation: (projectId: string, datasetId: string, tableName: string) => `
    SELECT
      tenant_id,
      LENGTH(user_input) as query_length,
      LENGTH(llm_response) as response_length,
      CAST(COALESCE(SAFE_CAST(input_tokens AS FLOAT64), 0) AS INT64) as input_tokens,
      CAST(COALESCE(SAFE_CAST(output_tokens AS FLOAT64), 0) AS INT64) as output_tokens,
      ROUND(
        SAFE_CAST(output_tokens AS FLOAT64) / NULLIF(SAFE_CAST(input_tokens AS FLOAT64), 0),
        3
      ) as efficiency_ratio,
      timestamp
    FROM \`${projectId}.${datasetId}.${tableName}\`
    WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
      AND user_input IS NOT NULL
      AND llm_response IS NOT NULL
      AND LENGTH(user_input) > 0
      AND LENGTH(llm_response) > 0
    ORDER BY timestamp DESC
    LIMIT 1000
  `,

  /**
   * 반복 질문 패턴 분석 (정규화된 질문으로 그룹핑)
   * - 질문 앞 100자로 패턴 추출
   * - 2회 이상 반복된 패턴만 추출
   */
  repeatedQueryPatterns: (projectId: string, datasetId: string, tableName: string) => `
    WITH normalized_queries AS (
      SELECT
        REGEXP_REPLACE(
          LOWER(TRIM(SUBSTR(user_input, 1, 100))),
          r'[0-9]+',
          '#'
        ) as query_pattern,
        LENGTH(llm_response) as response_length,
        SAFE_CAST(output_tokens AS FLOAT64) as output_tokens,
        tenant_id,
        timestamp
      FROM \`${projectId}.${datasetId}.${tableName}\`
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
        AND user_input IS NOT NULL
        AND LENGTH(user_input) > 10
    )
    SELECT
      query_pattern,
      COUNT(*) as occurrence_count,
      COUNT(DISTINCT tenant_id) as unique_tenants,
      ROUND(AVG(response_length), 0) as avg_response_length,
      ROUND(AVG(output_tokens), 0) as avg_output_tokens,
      MIN(timestamp) as first_seen,
      MAX(timestamp) as last_seen
    FROM normalized_queries
    GROUP BY query_pattern
    HAVING COUNT(*) >= 2
    ORDER BY occurrence_count DESC
    LIMIT 100
  `,
};
