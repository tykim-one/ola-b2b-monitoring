-- ============================================================
-- hana-mts 통합 모니터링 View
-- 원본: finola-global.hana_mts_monitoring.hana_securities_api
-- 대상: finola-global.hana_mts_monitoring.v_hana_mts_logs
--
-- Cloud Logging Sink 원본 테이블의 중첩 구조를 플랫하게 펼침
-- log_type 컬럼으로 API_REQUEST / BATCH_SYNC 구분
-- ============================================================

CREATE OR REPLACE VIEW `finola-global.hana_mts_monitoring.v_hana_mts_logs` AS
SELECT
  -- ── 공통 필드 ──────────────────────────────────────────
  timestamp,
  DATE(timestamp, 'Asia/Seoul') AS date_kst,
  EXTRACT(HOUR FROM timestamp AT TIME ZONE 'Asia/Seoul') AS hour_kst,
  severity,
  insertId AS insert_id,
  resource.labels.pod_name AS pod_name,

  -- ── 로그 유형 분류 ────────────────────────────────────
  jsonPayload.message AS message,
  CASE
    WHEN jsonPayload.message = 'http request' THEN 'API_REQUEST'
    WHEN jsonPayload.message LIKE 'batch sync%'
      OR jsonPayload.message = 'starting batch sync' THEN 'BATCH_SYNC'
    ELSE 'OTHER'
  END AS log_type,

  -- ── API 요청 필드 ─────────────────────────────────────
  jsonPayload.method AS method,
  jsonPayload.path AS path,
  jsonPayload.query AS query,
  CAST(SAFE_CAST(jsonPayload.status AS FLOAT64) AS INT64) AS status,
  SAFE_CAST(jsonPayload.duration_ms AS FLOAT64) AS duration_ms,
  jsonPayload.client_ip AS client_ip,
  jsonPayload.request_id AS request_id,

  -- ── 배치 동기화 필드 ──────────────────────────────────
  -- duration은 나노초 단위 → 초 단위로 변환
  ROUND(SAFE_CAST(jsonPayload.duration AS FLOAT64) / 1e9, 2) AS batch_duration_sec,
  CAST(SAFE_CAST(jsonPayload.cn_wind_count AS FLOAT64) AS INT64) AS cn_wind_count,
  CAST(SAFE_CAST(jsonPayload.jp_minkabu_count AS FLOAT64) AS INT64) AS jp_minkabu_count

FROM `finola-global.hana_mts_monitoring.hana_securities_api`;
