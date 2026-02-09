/**
 * BigQuery 메트릭 쿼리 모음
 * Cloud Logging Export 구조 (플랫 스키마)
 * - success: BOOL 타입 (TRUE/FALSE)
 * - 토큰 값: STRING 타입 (FLOAT64로 캐스팅 필요)
 * - tenant_id: 루트 레벨 STRING
 */

import {
  FRUSTRATION_REGEX_KR_SQL,
  FRUSTRATION_REGEX_EN_SQL,
  FRUSTRATION_REGEX_ALL_SQL,
} from '../../common/constants/frustration-keywords';

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
      DATE(timestamp, 'Asia/Seoul') as date,
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
  tenantUsage: (
    projectId: string,
    datasetId: string,
    tableName: string,
    days: number = 7,
  ) => `
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
   * @param days Number of days to look back (default: 7)
   */
  tokenEfficiency: (
    projectId: string,
    datasetId: string,
    tableName: string,
    days: number = 7,
  ) => `
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
    WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)
      AND SAFE_CAST(total_tokens AS FLOAT64) > 0
    ORDER BY timestamp DESC
    LIMIT 1000
  `,

  /**
   * 이상 탐지용 통계 (평균, 표준편차)
   * @param days Number of days to look back (default: 30)
   */
  anomalyStats: (
    projectId: string,
    datasetId: string,
    tableName: string,
    days: number = 30,
  ) => `
    SELECT
      tenant_id,
      AVG(CAST(total_tokens AS FLOAT64)) as avg_tokens,
      STDDEV(CAST(total_tokens AS FLOAT64)) as stddev_tokens,
      AVG(CAST(input_tokens AS FLOAT64)) as avg_input_tokens,
      STDDEV(CAST(input_tokens AS FLOAT64)) as stddev_input_tokens,
      COUNT(*) as sample_count,
      APPROX_QUANTILES(CAST(CAST(total_tokens AS FLOAT64) AS INT64), 100)[OFFSET(99)] as p99_tokens
    FROM \`${projectId}.${datasetId}.${tableName}\`
    WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)
    GROUP BY tenant_id
  `,

  /**
   * 비용 트렌드 (일별)
   */
  costTrend: (
    projectId: string,
    datasetId: string,
    tableName: string,
    inputPricePerMillion: number = 3,
    outputPricePerMillion: number = 15,
  ) => `
    SELECT
      DATE(timestamp, 'Asia/Seoul') as date,
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
  tokenEfficiencyTrend: (
    projectId: string,
    datasetId: string,
    tableName: string,
    days: number = 30,
  ) => `
    SELECT
      DATE(timestamp, 'Asia/Seoul') as date,
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
    WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)
      AND SAFE_CAST(input_tokens AS FLOAT64) > 0
      AND SAFE_CAST(output_tokens AS FLOAT64) > 0
    GROUP BY date
    ORDER BY date ASC
  `,

  /**
   * 질문-응답 길이 상관관계 분석
   * - user_input, llm_response: 상세 분석용 (각 최대 2000자)
   */
  queryResponseCorrelation: (
    projectId: string,
    datasetId: string,
    tableName: string,
    days: number = 7,
  ) => `
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
    WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)
      AND user_input IS NOT NULL
      AND llm_response IS NOT NULL
      AND LENGTH(user_input) > 0
      AND LENGTH(llm_response) > 0
    ORDER BY timestamp DESC
    LIMIT 300
  `,

  /**
   * 질문-응답 상세 조회 (클릭 시 단건)
   */
  queryResponseDetail: (
    projectId: string,
    datasetId: string,
    tableName: string,
    timestamp: string,
    tenantId: string,
  ) => ({
    query: `
    SELECT
      tenant_id,
      SUBSTR(user_input, 1, 2000) as user_input,
      SUBSTR(llm_response, 1, 2000) as llm_response,
      timestamp
    FROM \`${projectId}.${datasetId}.${tableName}\`
    WHERE timestamp = TIMESTAMP(@timestamp)
      AND tenant_id = @tenantId
    LIMIT 1
  `,
    params: { timestamp, tenantId },
  }),

  /**
   * 반복 질문 패턴 분석 (정규화된 질문으로 그룹핑)
   * - 질문 앞 100자로 패턴 추출
   * - 2회 이상 반복된 패턴만 추출
   */
  repeatedQueryPatterns: (
    projectId: string,
    datasetId: string,
    tableName: string,
    days: number = 30,
  ) => `
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
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)
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

  // ==================== 유저 분석 쿼리 ====================

  /**
   * 유저별 요청 수 (x_enc_data 기준)
   */
  userRequestCounts: (
    projectId: string,
    datasetId: string,
    tableName: string,
    days: number = 7,
    limit: number = 1000,
  ) => `
    SELECT
      request_metadata.x_enc_data AS userId,
      COUNT(*) AS requestCount,
      COUNTIF(success = TRUE) AS successCount,
      COUNTIF(success = FALSE) AS errorCount,
      ROUND(COUNTIF(success = TRUE) * 100.0 / NULLIF(COUNT(*), 0), 2) AS successRate
    FROM \`${projectId}.${datasetId}.${tableName}\`
    WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)
      AND request_metadata.x_enc_data IS NOT NULL
    GROUP BY userId
    ORDER BY requestCount DESC
    LIMIT ${limit}
  `,

  /**
   * 유저별 토큰 사용량 (x_enc_data 기준)
   */
  userTokenUsage: (
    projectId: string,
    datasetId: string,
    tableName: string,
    days: number = 7,
    limit: number = 1000,
  ) => `
    SELECT
      request_metadata.x_enc_data AS userId,
      CAST(COALESCE(SUM(CAST(input_tokens AS FLOAT64)), 0) AS INT64) AS inputTokens,
      CAST(COALESCE(SUM(CAST(output_tokens AS FLOAT64)), 0) AS INT64) AS outputTokens,
      CAST(COALESCE(SUM(CAST(total_tokens AS FLOAT64)), 0) AS INT64) AS totalTokens,
      ROUND(AVG(CAST(input_tokens AS FLOAT64)), 2) AS avgInputTokens,
      ROUND(AVG(CAST(output_tokens AS FLOAT64)), 2) AS avgOutputTokens,
      COUNT(*) AS requestCount
    FROM \`${projectId}.${datasetId}.${tableName}\`
    WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)
      AND request_metadata.x_enc_data IS NOT NULL
    GROUP BY userId
    ORDER BY totalTokens DESC
    LIMIT ${limit}
  `,

  /**
   * 유저별 자주 묻는 질문 패턴
   */
  userQuestionPatterns: (
    projectId: string,
    datasetId: string,
    tableName: string,
    userId: string | null = null,
    days: number = 7,
    limit: number = 1000,
  ) => ({
    query: `
    SELECT
      request_metadata.x_enc_data AS userId,
      LEFT(user_input, 100) AS question,
      COUNT(*) AS frequency,
      MAX(timestamp) AS lastAsked
    FROM \`${projectId}.${datasetId}.${tableName}\`
    WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)
      AND request_metadata.x_enc_data IS NOT NULL
      AND user_input IS NOT NULL
      AND LENGTH(user_input) > 5
      ${userId ? `AND request_metadata.x_enc_data = @userId` : ''}
    GROUP BY userId, question
    HAVING COUNT(*) >= 2
    ORDER BY frequency DESC
    LIMIT ${limit}
  `,
    params: userId ? { userId } : {},
  }),

  /**
   * 유저 목록 (통합 통계)
   */
  userList: (
    projectId: string,
    datasetId: string,
    tableName: string,
    days: number = 7,
    limit: number = 1000,
  ) => `
    SELECT
      request_metadata.x_enc_data AS userId,
      COUNT(*) AS questionCount,
      COUNTIF(success = TRUE) AS successCount,
      COUNTIF(success = FALSE) AS errorCount,
      ROUND(COUNTIF(success = TRUE) * 100.0 / NULLIF(COUNT(*), 0), 2) AS successRate,
      CAST(COALESCE(SUM(CAST(total_tokens AS FLOAT64)), 0) AS INT64) AS totalTokens,
      ROUND(AVG(CAST(total_tokens AS FLOAT64)), 2) AS avgTokens,
      MIN(timestamp) AS firstActivity,
      MAX(timestamp) AS lastActivity
    FROM \`${projectId}.${datasetId}.${tableName}\`
    WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)
      AND request_metadata.x_enc_data IS NOT NULL
    GROUP BY userId
    ORDER BY questionCount DESC
    LIMIT ${limit}
  `,

  /**
   * 유저 활동 상세
   */
  userActivityDetail: (
    projectId: string,
    datasetId: string,
    tableName: string,
    userId: string,
    days: number = 7,
    limit: number = 20,
    offset: number = 0,
  ) => ({
    query: `
    SELECT
      timestamp,
      SUBSTR(user_input, 1, 500) AS userInput,
      SUBSTR(llm_response, 1, 500) AS llmResponse,
      CAST(COALESCE(CAST(input_tokens AS FLOAT64), 0) AS INT64) AS inputTokens,
      CAST(COALESCE(CAST(output_tokens AS FLOAT64), 0) AS INT64) AS outputTokens,
      CAST(COALESCE(CAST(total_tokens AS FLOAT64), 0) AS INT64) AS totalTokens,
      success
    FROM \`${projectId}.${datasetId}.${tableName}\`
    WHERE request_metadata.x_enc_data = @userId
      AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)
    ORDER BY timestamp DESC
    LIMIT ${limit} OFFSET ${offset}
  `,
    params: { userId },
  }),

  // ==================== 챗봇 품질 분석 쿼리 ====================

  /**
   * 신규/급증 질문 패턴 탐지
   * - 최근 7일 대비 이전 90일 패턴과 비교
   * - NEW: 이전에 없던 패턴
   * - EMERGING: 3배 이상 급증한 패턴
   */
  emergingQueryPatterns: (
    projectId: string,
    datasetId: string,
    tableName: string,
    recentDays: number = 7,
    historicalDays: number = 90,
  ) => `
    WITH recent_patterns AS (
      SELECT
        LOWER(REGEXP_REPLACE(TRIM(SUBSTR(user_input, 1, 100)), r'[0-9]+', 'N')) AS normalized_query,
        COUNT(*) as recent_count,
        MIN(timestamp) as first_seen_recent,
        MAX(timestamp) as last_seen
      FROM \`${projectId}.${datasetId}.${tableName}\`
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${recentDays} DAY)
        AND user_input IS NOT NULL
        AND LENGTH(user_input) > 10
      GROUP BY normalized_query
      HAVING COUNT(*) >= 2
    ),
    historical_patterns AS (
      SELECT
        LOWER(REGEXP_REPLACE(TRIM(SUBSTR(user_input, 1, 100)), r'[0-9]+', 'N')) AS normalized_query,
        COUNT(*) as historical_count,
        MIN(timestamp) as first_seen_historical
      FROM \`${projectId}.${datasetId}.${tableName}\`
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${historicalDays} DAY)
        AND timestamp < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${recentDays} DAY)
        AND user_input IS NOT NULL
        AND LENGTH(user_input) > 10
      GROUP BY normalized_query
    )
    SELECT
      r.normalized_query AS normalizedQuery,
      r.recent_count AS recentCount,
      COALESCE(h.historical_count, 0) AS historicalCount,
      CASE
        WHEN h.historical_count IS NULL THEN 'NEW'
        ELSE 'EMERGING'
      END AS patternType,
      CASE
        WHEN h.historical_count IS NULL THEN NULL
        ELSE ROUND(r.recent_count * 1.0 / h.historical_count, 2)
      END AS growthRate,
      COALESCE(FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%SZ', h.first_seen_historical),
               FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%SZ', r.first_seen_recent)) AS firstSeen,
      FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%SZ', r.last_seen) AS lastSeen
    FROM recent_patterns r
    LEFT JOIN historical_patterns h ON r.normalized_query = h.normalized_query
    WHERE h.historical_count IS NULL
       OR r.recent_count > h.historical_count * 3
    ORDER BY r.recent_count DESC
    LIMIT 100
  `,

  /**
   * 감정/불만 키워드 기반 분석
   * - 불만 키워드 (한국어/영어)
   * - 감정 표현 패턴 (이모티콘, 특수문자)
   * - 긴급 키워드
   */
  sentimentAnalysis: (
    projectId: string,
    datasetId: string,
    tableName: string,
    days: number = 7,
  ) => `
    WITH sentiment_data AS (
      SELECT
        timestamp,
        tenant_id,
        request_metadata.x_enc_data AS user_id,
        user_input,
        success,
        request_metadata.session_id AS session_id,
        -- 불만 키워드 탐지 (한국어)
        REGEXP_CONTAINS(LOWER(user_input), r'${FRUSTRATION_REGEX_KR_SQL}') AS has_kr_frustration,
        -- 불만 키워드 탐지 (영어)
        REGEXP_CONTAINS(LOWER(user_input), r'${FRUSTRATION_REGEX_EN_SQL}') AS has_en_frustration,
        -- 감정 표현 패턴
        REGEXP_CONTAINS(user_input, r'(ㅠㅠ|ㅜㅜ|ㅡㅡ|;;|!{3,}|\\?{3,})') AS has_emotional_pattern,
        -- 긴급 키워드
        REGEXP_CONTAINS(LOWER(user_input), r'(급해|빨리|긴급|urgent|asap|immediately|hurry|지금당장)') AS has_urgency,
        -- 키워드 추출
        REGEXP_EXTRACT_ALL(LOWER(user_input), r'${FRUSTRATION_REGEX_ALL_SQL}') AS frustration_keywords
      FROM \`${projectId}.${datasetId}.${tableName}\`
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)
        AND user_input IS NOT NULL
        AND LENGTH(user_input) > 5
    )
    SELECT
      FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%SZ', timestamp) AS timestamp,
      tenant_id AS tenantId,
      user_id AS userId,
      user_input AS userInput,
      CASE
        WHEN has_kr_frustration OR has_en_frustration THEN 'FRUSTRATED'
        WHEN has_urgency THEN 'URGENT'
        WHEN has_emotional_pattern THEN 'EMOTIONAL'
        ELSE 'NEUTRAL'
      END AS sentimentFlag,
      frustration_keywords AS frustrationKeywords,
      success,
      session_id AS sessionId
    FROM sentiment_data
    WHERE has_kr_frustration OR has_en_frustration OR has_emotional_pattern OR has_urgency
    ORDER BY timestamp DESC
    LIMIT 200
  `,

  /**
   * 재질문 패턴 탐지 (세션 내 유사 질문 반복)
   * - 동일 세션에서 여러 번 유사한 질문
   * - 응답에 불만족하여 재질문하는 패턴 탐지
   */
  rephrasedQueryPatterns: (
    projectId: string,
    datasetId: string,
    tableName: string,
    days: number = 7,
  ) => `
    WITH session_queries AS (
      SELECT
        request_metadata.session_id AS session_id,
        tenant_id,
        request_metadata.x_enc_data AS user_id,
        ARRAY_AGG(STRUCT(
          user_input AS query,
          FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%SZ', timestamp) AS ts,
          success
        ) ORDER BY timestamp LIMIT 20) AS queries_arr,
        COUNT(*) AS query_count,
        COUNTIF(success = TRUE) AS success_count
      FROM \`${projectId}.${datasetId}.${tableName}\`
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)
        AND user_input IS NOT NULL
        AND LENGTH(user_input) > 10
        AND request_metadata.session_id IS NOT NULL
      GROUP BY session_id, tenant_id, user_id
      HAVING COUNT(*) >= 3
    )
    SELECT
      session_id AS sessionId,
      tenant_id AS tenantId,
      user_id AS userId,
      query_count AS queryCount,
      (SELECT COUNT(DISTINCT LOWER(SUBSTR(q.query, 1, 50))) FROM UNNEST(queries_arr) q) AS uniqueQueries,
      ROUND(1.0 - (SELECT COUNT(DISTINCT LOWER(SUBSTR(q.query, 1, 50))) FROM UNNEST(queries_arr) q) * 1.0 / query_count, 2) AS similarityScore,
      (SELECT ARRAY_AGG(q.query LIMIT 10) FROM UNNEST(queries_arr) q) AS queries,
      (SELECT ARRAY_AGG(q.ts LIMIT 10) FROM UNNEST(queries_arr) q) AS timestamps,
      success_count > 0 AS hasResolution
    FROM session_queries
    WHERE query_count > (SELECT COUNT(DISTINCT LOWER(SUBSTR(q.query, 1, 50))) FROM UNNEST(queries_arr) q) * 1.5
    ORDER BY similarityScore DESC, query_count DESC
    LIMIT 100
  `,

  /**
   * 세션별 대화 분석
   */
  sessionAnalytics: (
    projectId: string,
    datasetId: string,
    tableName: string,
    days: number = 7,
  ) => `
    WITH session_data AS (
      SELECT
        request_metadata.session_id AS session_id,
        tenant_id,
        request_metadata.x_enc_data AS user_id,
        COUNT(*) AS turn_count,
        COUNTIF(success = TRUE) AS success_count,
        COUNTIF(success = FALSE) AS fail_count,
        MIN(timestamp) AS session_start,
        MAX(timestamp) AS session_end,
        -- 불만 표현 포함 여부
        LOGICAL_OR(
          REGEXP_CONTAINS(LOWER(user_input), r'(왜|도대체|짜증|화나|답답|이상해|바보|멍청|안돼|못해|실망|최악|쓰레기|환불|고소|신고|stupid|useless|terrible|worst|angry|frustrated)')
        ) AS has_frustration
      FROM \`${projectId}.${datasetId}.${tableName}\`
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)
        AND request_metadata.session_id IS NOT NULL
      GROUP BY session_id, tenant_id, user_id
    )
    SELECT
      session_id AS sessionId,
      tenant_id AS tenantId,
      user_id AS userId,
      turn_count AS turnCount,
      success_count AS successCount,
      fail_count AS failCount,
      ROUND(success_count * 100.0 / NULLIF(turn_count, 0), 2) AS sessionSuccessRate,
      FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%SZ', session_start) AS sessionStart,
      FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%SZ', session_end) AS sessionEnd,
      ROUND(TIMESTAMP_DIFF(session_end, session_start, SECOND) / 60.0, 2) AS durationMinutes,
      has_frustration AS hasFrustration
    FROM session_data
    WHERE turn_count >= 2
    ORDER BY session_start DESC
    LIMIT 500
  `,

  /**
   * 테넌트별 품질 요약
   */
  tenantQualitySummary: (
    projectId: string,
    datasetId: string,
    tableName: string,
    days: number = 7,
  ) => `
    WITH session_stats AS (
      SELECT
        tenant_id,
        request_metadata.session_id AS session_id,
        COUNT(*) AS turn_count,
        COUNTIF(success = TRUE) AS success_count,
        MIN(timestamp) AS session_start,
        MAX(timestamp) AS session_end,
        LOGICAL_OR(
          REGEXP_CONTAINS(LOWER(user_input), r'(왜|도대체|짜증|화나|답답|이상해|바보|멍청|안돼|못해|실망|최악|쓰레기|환불|고소|신고|stupid|useless|terrible|worst|angry|frustrated)')
        ) AS has_frustration
      FROM \`${projectId}.${datasetId}.${tableName}\`
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)
        AND request_metadata.session_id IS NOT NULL
      GROUP BY tenant_id, session_id
    )
    SELECT
      tenant_id AS tenantId,
      COUNT(*) AS totalSessions,
      ROUND(AVG(turn_count), 2) AS avgTurnsPerSession,
      ROUND(AVG(success_count * 100.0 / NULLIF(turn_count, 0)), 2) AS sessionSuccessRate,
      ROUND(COUNTIF(turn_count = 1) * 100.0 / COUNT(*), 2) AS singleTurnRate,
      COUNTIF(has_frustration) AS frustratedSessionCount,
      ROUND(COUNTIF(has_frustration) * 100.0 / COUNT(*), 2) AS frustrationRate,
      ROUND(AVG(TIMESTAMP_DIFF(session_end, session_start, SECOND) / 60.0), 2) AS avgSessionDurationMinutes
    FROM session_stats
    GROUP BY tenant_id
    ORDER BY totalSessions DESC
  `,

  /**
   * 응답 품질 지표 (응답 길이 분포)
   */
  responseQualityMetrics: (
    projectId: string,
    datasetId: string,
    tableName: string,
    days: number = 30,
  ) => `
    SELECT
      DATE(timestamp, 'Asia/Seoul') AS date,
      tenant_id AS tenantId,
      ROUND(AVG(LENGTH(llm_response)), 0) AS avgResponseLength,
      COUNTIF(LENGTH(llm_response) < 50) AS tooShortCount,
      COUNTIF(LENGTH(llm_response) > 2000) AS tooLongCount,
      ROUND(AVG(CASE WHEN success = FALSE THEN LENGTH(user_input) END), 0) AS failedQueryAvgLength,
      COUNT(*) AS totalRequests
    FROM \`${projectId}.${datasetId}.${tableName}\`
    WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)
      AND llm_response IS NOT NULL
    GROUP BY date, tenant_id
    ORDER BY date DESC, tenantId
  `,

  // ==================== 배치 분석용 쿼리 ====================

  /**
   * 특정 날짜의 채팅 데이터 랜덤 샘플링
   * 배치 분석용 - 테넌트별 샘플 추출
   */
  chatSamplesForAnalysis: (
    projectId: string,
    datasetId: string,
    tableName: string,
    tenantId: string | null,
    targetDate: string, // 'YYYY-MM-DD'
    sampleSize: number,
  ) => `
    SELECT
      timestamp,
      tenant_id,
      request_metadata.session_id AS session_id,
      user_input,
      llm_response,
      success
    FROM \`${projectId}.${datasetId}.${tableName}\`
    WHERE DATE(timestamp, 'Asia/Seoul') = '${targetDate}'
      ${tenantId ? `AND tenant_id = '${tenantId}'` : ''}
      AND user_input IS NOT NULL
      AND llm_response IS NOT NULL
      AND LENGTH(user_input) > 10
      AND LENGTH(llm_response) > 10
    ORDER BY RAND()
    LIMIT ${sampleSize}
  `,

  /**
   * 특정 날짜의 테넌트 목록 조회
   * 배치 분석 스케줄러에서 사용
   */
  tenantsForDate: (
    projectId: string,
    datasetId: string,
    tableName: string,
    targetDate: string, // 'YYYY-MM-DD'
  ) => `
    SELECT DISTINCT
      tenant_id,
      COUNT(*) AS chat_count
    FROM \`${projectId}.${datasetId}.${tableName}\`
    WHERE DATE(timestamp, 'Asia/Seoul') = '${targetDate}'
      AND user_input IS NOT NULL
      AND llm_response IS NOT NULL
    GROUP BY tenant_id
    HAVING COUNT(*) >= 10
    ORDER BY chat_count DESC
  `,

  // ==================== 세션 분석용 쿼리 ====================

  /**
   * 세션별 전체 대화 내역 조회
   * 특정 세션의 타임라인을 가져옴
   */
  sessionConversationHistory: (
    projectId: string,
    datasetId: string,
    tableName: string,
    sessionId: string,
  ) => `
    SELECT
      timestamp,
      user_input AS userInput,
      llm_response AS llmResponse,
      success,
      CAST(COALESCE(SAFE_CAST(input_tokens AS FLOAT64), 0) AS INT64) AS inputTokens,
      CAST(COALESCE(SAFE_CAST(output_tokens AS FLOAT64), 0) AS INT64) AS outputTokens
    FROM \`${projectId}.${datasetId}.${tableName}\`
    WHERE request_metadata.session_id = '${sessionId}'
    ORDER BY timestamp ASC
  `,

  /**
   * 세션 해결 통계 (기간별)
   * 해결률, 평균 턴 수, 이탈률 등 집계
   */
  sessionResolutionStats: (
    projectId: string,
    datasetId: string,
    tableName: string,
    days: number = 7,
    tenantId?: string,
  ) => `
    WITH session_data AS (
      SELECT
        request_metadata.session_id AS session_id,
        tenant_id,
        request_metadata.x_enc_data AS user_id,
        COUNT(*) AS turn_count,
        COUNTIF(success = TRUE) AS success_count,
        MIN(timestamp) AS session_start,
        MAX(timestamp) AS session_end,
        -- 불만 표현 포함 여부
        LOGICAL_OR(
          REGEXP_CONTAINS(LOWER(user_input), r'(왜|도대체|짜증|화나|답답|이상해|바보|멍청|안돼|못해|실망|최악|쓰레기|환불|고소|신고|stupid|useless|terrible|worst|angry|frustrated)')
        ) AS has_frustration,
        -- 감사 표현으로 종료 여부 (휴리스틱 해결 판단)
        LOGICAL_OR(
          REGEXP_CONTAINS(LOWER(user_input), r'(감사|고마워|thanks|thank you|got it|알겠|해결|완료|좋아|perfect|great)')
        ) AS has_thanks
      FROM \`${projectId}.${datasetId}.${tableName}\`
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)
        AND request_metadata.session_id IS NOT NULL
        ${tenantId ? `AND tenant_id = '${tenantId}'` : ''}
      GROUP BY session_id, tenant_id, user_id
      HAVING turn_count >= 2
    ),
    resolution_calc AS (
      SELECT
        *,
        -- 휴리스틱 해결 판단: 감사 표현 있거나, 불만 없이 성공률 100%
        CASE
          WHEN has_thanks THEN TRUE
          WHEN NOT has_frustration AND success_count = turn_count THEN TRUE
          ELSE FALSE
        END AS is_resolved_heuristic
      FROM session_data
    )
    SELECT
      COUNT(*) AS totalSessions,
      COUNTIF(is_resolved_heuristic) AS resolvedSessions,
      ROUND(COUNTIF(is_resolved_heuristic) * 100.0 / NULLIF(COUNT(*), 0), 2) AS resolutionRate,
      ROUND(AVG(CASE WHEN is_resolved_heuristic THEN turn_count END), 2) AS avgTurnsToResolution,
      ROUND(COUNTIF(NOT is_resolved_heuristic) * 100.0 / NULLIF(COUNT(*), 0), 2) AS abandonmentRate,
      ROUND(AVG(TIMESTAMP_DIFF(session_end, session_start, SECOND) / 60.0), 2) AS avgSessionDuration,
      COUNTIF(has_frustration) AS frustratedSessions,
      ROUND(COUNTIF(has_frustration) * 100.0 / NULLIF(COUNT(*), 0), 2) AS frustrationRate
    FROM resolution_calc
  `,

  /**
   * 세션 목록 조회 (페이지네이션)
   * 필터링 및 정렬 지원
   */
  sessionList: (
    projectId: string,
    datasetId: string,
    tableName: string,
    days: number = 7,
    tenantId?: string,
    isResolved?: boolean,
    hasFrustration?: boolean,
    limit: number = 20,
    offset: number = 0,
  ) => `
    WITH session_data AS (
      SELECT
        request_metadata.session_id AS session_id,
        tenant_id,
        request_metadata.x_enc_data AS user_id,
        COUNT(*) AS turn_count,
        COUNTIF(success = TRUE) AS success_count,
        MIN(timestamp) AS session_start,
        MAX(timestamp) AS session_end,
        LOGICAL_OR(
          REGEXP_CONTAINS(LOWER(user_input), r'(왜|도대체|짜증|화나|답답|이상해|바보|멍청|안돼|못해|실망|최악|쓰레기|환불|고소|신고|stupid|useless|terrible|worst|angry|frustrated)')
        ) AS has_frustration,
        LOGICAL_OR(
          REGEXP_CONTAINS(LOWER(user_input), r'(감사|고마워|thanks|thank you|got it|알겠|해결|완료|좋아|perfect|great)')
        ) AS has_thanks
      FROM \`${projectId}.${datasetId}.${tableName}\`
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)
        AND request_metadata.session_id IS NOT NULL
        ${tenantId ? `AND tenant_id = '${tenantId}'` : ''}
      GROUP BY session_id, tenant_id, user_id
      HAVING turn_count >= 2
    ),
    resolution_calc AS (
      SELECT
        *,
        CASE
          WHEN has_thanks THEN TRUE
          WHEN NOT has_frustration AND success_count = turn_count THEN TRUE
          ELSE FALSE
        END AS is_resolved
      FROM session_data
    )
    SELECT
      session_id AS sessionId,
      tenant_id AS tenantId,
      user_id AS userId,
      turn_count AS turnCount,
      is_resolved AS isResolved,
      'HEURISTIC' AS resolutionMethod,
      has_frustration AS hasFrustration,
      FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%SZ', session_start) AS sessionStart,
      FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%SZ', session_end) AS sessionEnd,
      ROUND(TIMESTAMP_DIFF(session_end, session_start, SECOND) / 60.0, 2) AS durationMinutes
    FROM resolution_calc
    WHERE 1=1
      ${isResolved !== undefined ? `AND is_resolved = ${isResolved}` : ''}
      ${hasFrustration !== undefined ? `AND has_frustration = ${hasFrustration}` : ''}
    ORDER BY session_start DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `,

  /**
   * 세션 총 개수 조회 (페이지네이션용)
   */
  sessionCount: (
    projectId: string,
    datasetId: string,
    tableName: string,
    days: number = 7,
    tenantId?: string,
    isResolved?: boolean,
    hasFrustration?: boolean,
  ) => `
    WITH session_data AS (
      SELECT
        request_metadata.session_id AS session_id,
        COUNT(*) AS turn_count,
        COUNTIF(success = TRUE) AS success_count,
        LOGICAL_OR(
          REGEXP_CONTAINS(LOWER(user_input), r'(왜|도대체|짜증|화나|답답|이상해|바보|멍청|안돼|못해|실망|최악|쓰레기|환불|고소|신고|stupid|useless|terrible|worst|angry|frustrated)')
        ) AS has_frustration,
        LOGICAL_OR(
          REGEXP_CONTAINS(LOWER(user_input), r'(감사|고마워|thanks|thank you|got it|알겠|해결|완료|좋아|perfect|great)')
        ) AS has_thanks
      FROM \`${projectId}.${datasetId}.${tableName}\`
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)
        AND request_metadata.session_id IS NOT NULL
        ${tenantId ? `AND tenant_id = '${tenantId}'` : ''}
      GROUP BY session_id
      HAVING turn_count >= 2
    ),
    resolution_calc AS (
      SELECT
        *,
        CASE
          WHEN has_thanks THEN TRUE
          WHEN NOT has_frustration AND success_count = turn_count THEN TRUE
          ELSE FALSE
        END AS is_resolved
      FROM session_data
    )
    SELECT COUNT(*) AS total
    FROM resolution_calc
    WHERE 1=1
      ${isResolved !== undefined ? `AND is_resolved = ${isResolved}` : ''}
      ${hasFrustration !== undefined ? `AND has_frustration = ${hasFrustration}` : ''}
  `,

  /**
   * 특정 날짜의 세션 목록 조회 (배치 분석용)
   */
  sessionsForDate: (
    projectId: string,
    datasetId: string,
    tableName: string,
    targetDate: string,
    tenantId?: string,
    maxSessions: number = 100,
  ) => `
    WITH session_data AS (
      SELECT
        request_metadata.session_id AS session_id,
        tenant_id,
        request_metadata.x_enc_data AS user_id,
        COUNT(*) AS turn_count,
        MIN(timestamp) AS session_start,
        MAX(timestamp) AS session_end
      FROM \`${projectId}.${datasetId}.${tableName}\`
      WHERE DATE(timestamp, 'Asia/Seoul') = '${targetDate}'
        AND request_metadata.session_id IS NOT NULL
        ${tenantId ? `AND tenant_id = '${tenantId}'` : ''}
      GROUP BY session_id, tenant_id, user_id
      HAVING turn_count >= 2
    )
    SELECT
      session_id AS sessionId,
      tenant_id AS tenantId,
      user_id AS userId,
      turn_count AS turnCount,
      FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%SZ', session_start) AS sessionStart,
      FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%SZ', session_end) AS sessionEnd
    FROM session_data
    ORDER BY session_start DESC
    LIMIT ${maxSessions}
  `,
};
