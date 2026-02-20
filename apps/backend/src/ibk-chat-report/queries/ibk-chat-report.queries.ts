/**
 * IBK-CHAT 일일 리포트용 BigQuery 쿼리 7종
 *
 * 모든 쿼리는 KST 기준 날짜 필터 사용: DATE(timestamp, 'Asia/Seoul')
 * 성공 기준: response_node = 'FINAL'
 * 토큰 필드: STRING → SAFE_CAST AS FLOAT64 → CAST AS INT64
 */
export class IbkChatReportQueries {
  /**
   * 쿼리 1: 기본 KPI 집계 (총 요청, 성공/실패, 성공률, 토큰 분위수)
   */
  static dailyKPI(
    projectId: string,
    datasetId: string,
    tableName: string,
    targetDate: string,
  ): string {
    const table = `${projectId}.${datasetId}.${tableName}`;
    return `
SELECT
  COUNT(*) as total_requests,
  COUNTIF(response_node = 'FINAL') as success_count,
  COUNTIF(response_node != 'FINAL' AND response_node IS NOT NULL) as fail_count,
  ROUND(COUNTIF(response_node = 'FINAL') * 100.0 / NULLIF(COUNT(*), 0), 2) as success_rate,
  APPROX_QUANTILES(CAST(SAFE_CAST(total_tokens AS FLOAT64) AS INT64), 100)[OFFSET(50)] as p50_tokens,
  APPROX_QUANTILES(CAST(SAFE_CAST(total_tokens AS FLOAT64) AS INT64), 100)[OFFSET(90)] as p90_tokens,
  APPROX_QUANTILES(CAST(SAFE_CAST(total_tokens AS FLOAT64) AS INT64), 100)[OFFSET(99)] as p99_tokens,
  MAX(CAST(SAFE_CAST(total_tokens AS FLOAT64) AS INT64)) as max_tokens,
  ROUND(AVG(CAST(SAFE_CAST(total_tokens AS FLOAT64) AS FLOAT64)), 2) as avg_tokens
FROM \`${table}\`
WHERE DATE(timestamp, 'Asia/Seoul') = '${targetDate}'
  AND response_node IS NOT NULL`;
  }

  /**
   * 쿼리 2: 질문 유형별 성공률 (question_type 기준)
   */
  static questionTypeSuccess(
    projectId: string,
    datasetId: string,
    tableName: string,
    targetDate: string,
  ): string {
    const table = `${projectId}.${datasetId}.${tableName}`;
    return `
SELECT
  COALESCE(question_type, 'UNKNOWN') as question_type,
  COUNT(*) as total,
  COUNTIF(response_node = 'FINAL') as success_count,
  ROUND(COUNTIF(response_node = 'FINAL') * 100.0 / NULLIF(COUNT(*), 0), 2) as success_rate
FROM \`${table}\`
WHERE DATE(timestamp, 'Asia/Seoul') = '${targetDate}'
  AND response_node IS NOT NULL
GROUP BY question_type
ORDER BY total DESC
LIMIT 20`;
  }

  /**
   * 쿼리 3: 유형별 대표 질문 샘플 (각 10개)
   */
  static representativeQuestions(
    projectId: string,
    datasetId: string,
    tableName: string,
    targetDate: string,
  ): string {
    const table = `${projectId}.${datasetId}.${tableName}`;
    return `
WITH ranked AS (
  SELECT
    COALESCE(question_type, 'UNKNOWN') as question_type,
    SUBSTR(user_input, 1, 300) as user_input,
    response_node,
    fail_reason,
    ROW_NUMBER() OVER (PARTITION BY question_type ORDER BY RAND()) as rn
  FROM \`${table}\`
  WHERE DATE(timestamp, 'Asia/Seoul') = '${targetDate}'
    AND user_input IS NOT NULL
    AND response_node IS NOT NULL
)
SELECT question_type, user_input, response_node, fail_reason
FROM ranked WHERE rn <= 10
ORDER BY question_type`;
  }

  /**
   * 쿼리 4: 실패 원인 분석 (fail_reason 집계 + 대표 질문)
   */
  static failAnalysis(
    projectId: string,
    datasetId: string,
    tableName: string,
    targetDate: string,
  ): string {
    const table = `${projectId}.${datasetId}.${tableName}`;
    return `
SELECT
  COALESCE(fail_reason, response_node) as fail_category,
  response_node,
  COUNT(*) as count,
  ARRAY_AGG(SUBSTR(user_input, 1, 200) ORDER BY RAND() LIMIT 5) as sample_questions
FROM \`${table}\`
WHERE DATE(timestamp, 'Asia/Seoul') = '${targetDate}'
  AND response_node != 'FINAL'
  AND response_node IS NOT NULL
  AND user_input IS NOT NULL
GROUP BY fail_category, response_node
ORDER BY count DESC
LIMIT 10`;
  }

  /**
   * 쿼리 5: 토큰 폭증 케이스 Top 20 (>20,000 토큰)
   */
  static tokenBurstCases(
    projectId: string,
    datasetId: string,
    tableName: string,
    targetDate: string,
  ): string {
    const table = `${projectId}.${datasetId}.${tableName}`;
    return `
SELECT
  SUBSTR(user_input, 1, 200) as user_input,
  COALESCE(question_type, 'UNKNOWN') as question_type,
  response_node,
  CAST(SAFE_CAST(total_tokens AS FLOAT64) AS INT64) as total_tokens,
  CAST(SAFE_CAST(input_tokens AS FLOAT64) AS INT64) as input_tokens,
  CAST(SAFE_CAST(output_tokens AS FLOAT64) AS INT64) as output_tokens
FROM \`${table}\`
WHERE DATE(timestamp, 'Asia/Seoul') = '${targetDate}'
  AND SAFE_CAST(total_tokens AS FLOAT64) > 20000
  AND user_input IS NOT NULL
ORDER BY SAFE_CAST(total_tokens AS FLOAT64) DESC
LIMIT 20`;
  }

  /**
   * 쿼리 6: 수준있는질문 후보 (전체 raw user_input, 길이>20자)
   */
  static candidateHighValueQuestions(
    projectId: string,
    datasetId: string,
    tableName: string,
    targetDate: string,
  ): string {
    const table = `${projectId}.${datasetId}.${tableName}`;
    return `
SELECT
  SUBSTR(user_input, 1, 500) as user_input,
  response_node,
  COALESCE(fail_reason, '') as fail_reason,
  COALESCE(question_type, 'UNKNOWN') as question_type,
  CAST(SAFE_CAST(total_tokens AS FLOAT64) AS INT64) as total_tokens
FROM \`${table}\`
WHERE DATE(timestamp, 'Asia/Seoul') = '${targetDate}'
  AND user_input IS NOT NULL
  AND LENGTH(user_input) > 20
  AND response_node IS NOT NULL
ORDER BY LENGTH(user_input) DESC
LIMIT 500`;
  }

  /**
   * 쿼리 7: 탐사용 클러스터링 후보 (OTHER/NULL/미분류)
   */
  static exploratoryClusterSamples(
    projectId: string,
    datasetId: string,
    tableName: string,
    targetDate: string,
  ): string {
    const table = `${projectId}.${datasetId}.${tableName}`;
    return `
SELECT
  SUBSTR(user_input, 1, 300) as user_input,
  response_node,
  COALESCE(question_type, 'UNKNOWN') as question_type
FROM \`${table}\`
WHERE DATE(timestamp, 'Asia/Seoul') = '${targetDate}'
  AND user_input IS NOT NULL
  AND (question_type IS NULL OR UPPER(question_type) IN ('OTHER', 'OTHERS', 'ETC', '기타'))
  AND response_node IS NOT NULL
ORDER BY RAND()
LIMIT 100`;
  }

  /**
   * 총 건수 조회 (최소 임계값 확인용)
   */
  static totalRowCount(
    projectId: string,
    datasetId: string,
    tableName: string,
    targetDate: string,
  ): string {
    const table = `${projectId}.${datasetId}.${tableName}`;
    return `
SELECT COUNT(*) as total_count
FROM \`${table}\`
WHERE DATE(timestamp, 'Asia/Seoul') = '${targetDate}'
  AND response_node IS NOT NULL`;
  }
}
