/**
 * Hana MTS (API Server + Batch Sync) 모니터링 인터페이스
 *
 * BigQuery View 컬럼 구조:
 * - 공통: timestamp, date_kst, hour_kst, severity, insert_id, pod_name, message, log_type
 * - API 로그: method, path, query, status (INT64), duration_ms (FLOAT64), client_ip, request_id
 * - 배치 로그: batch_duration_sec (FLOAT64), cn_wind_count (INT64), jp_minkabu_count (INT64)
 */

// ─────────────────────────────────────────────
// API 트래픽 관련 인터페이스
// ─────────────────────────────────────────────

/** API 트래픽 KPI - 주어진 기간의 핵심 성능 지표 */
export interface ApiTrafficKPI {
  /** 전체 요청 수 */
  totalRequests: number;
  /** 에러(4xx/5xx) 요청 수 */
  errorCount: number;
  /** 에러율 (0.0 ~ 1.0) */
  errorRate: number;
  /** 평균 응답 시간 (ms) */
  avgDurationMs: number;
  /** 95th 백분위 응답 시간 (ms) */
  p95DurationMs: number;
  /** 99th 백분위 응답 시간 (ms) */
  p99DurationMs: number;
  /** 고유 클라이언트 IP 수 */
  uniqueClients: number;
}

/** 시간별 API 트래픽 - 한국 시간 기준 시간대별 집계 */
export interface HourlyApiTraffic {
  /** 한국 시간 기준 시간 (0 ~ 23) */
  hourKst: number;
  /** 해당 시간의 요청 수 */
  requestCount: number;
  /** 해당 시간의 에러 수 */
  errorCount: number;
  /** 해당 시간의 평균 응답 시간 (ms) */
  avgDurationMs: number;
}

/** 엔드포인트별 통계 - 경로/메서드 조합별 성능 집계 */
export interface EndpointStats {
  /** API 경로 (예: /api/v1/users) */
  path: string;
  /** HTTP 메서드 (GET, POST, PUT, DELETE 등) */
  method: string;
  /** 해당 엔드포인트 총 요청 수 */
  requestCount: number;
  /** 해당 엔드포인트 에러 수 */
  errorCount: number;
  /** 해당 엔드포인트 에러율 (0.0 ~ 1.0) */
  errorRate: number;
  /** 해당 엔드포인트 평균 응답 시간 (ms) */
  avgDurationMs: number;
  /** 해당 엔드포인트 95th 백분위 응답 시간 (ms) */
  p95DurationMs: number;
}

/** 느린 요청 - 임계값 이상의 응답 시간을 가진 요청 */
export interface SlowRequest {
  /** 요청 발생 시각 (ISO 8601 문자열) */
  timestamp: string;
  /** HTTP 메서드 */
  method: string;
  /** API 경로 */
  path: string;
  /** 쿼리 파라미터 문자열 */
  query: string;
  /** HTTP 상태 코드 */
  status: number;
  /** 응답 시간 (ms) */
  durationMs: number;
  /** 클라이언트 IP 주소 */
  clientIp: string;
}

/** 에러 요청 - 4xx/5xx 상태 코드를 가진 요청 상세 */
export interface ApiError {
  /** 요청 발생 시각 (ISO 8601 문자열) */
  timestamp: string;
  /** HTTP 메서드 */
  method: string;
  /** API 경로 */
  path: string;
  /** 쿼리 파라미터 문자열 */
  query: string;
  /** HTTP 상태 코드 (4xx/5xx) */
  status: number;
  /** 응답 시간 (ms) */
  durationMs: number;
  /** 클라이언트 IP 주소 */
  clientIp: string;
  /** 요청 추적 ID */
  requestId: string;
}

// ─────────────────────────────────────────────
// 배치 동기화 관련 인터페이스
// ─────────────────────────────────────────────

/** 배치 동기화 요약 - 전체 배치 실행 현황 */
export interface BatchSyncSummary {
  /** 총 배치 실행 횟수 */
  totalRuns: number;
  /** 평균 배치 실행 시간 (초) */
  avgDurationSec: number;
  /** 마지막 배치 실행 시각 (ISO 8601 문자열) */
  lastRunAt: string;
  /** 마지막 배치에서 동기화된 Wind(KR) 데이터 수 */
  lastWindCount: number;
  /** 마지막 배치에서 동기화된 Minkabu(JP) 데이터 수 */
  lastMinkabuCount: number;
}

/** 배치 실행 이력 - 개별 배치 실행 레코드 */
export interface BatchSyncRun {
  /** 배치 실행 시각 (ISO 8601 문자열) */
  timestamp: string;
  /** 배치 로그 메시지 */
  message: string;
  /** 배치 실행 소요 시간 (초), 미집계 시 null */
  durationSec: number | null;
  /** 동기화된 Wind(KR) 데이터 수, 미집계 시 null */
  cnWindCount: number | null;
  /** 동기화된 Minkabu(JP) 데이터 수, 미집계 시 null */
  jpMinkabuCount: number | null;
}

/** 일별 배치 트렌드 - 한국 시간 기준 날짜별 배치 집계 */
export interface DailyBatchTrend {
  /** 한국 시간 기준 날짜 (YYYY-MM-DD 형식) */
  dateKst: string;
  /** 해당 날짜의 배치 실행 횟수 */
  runCount: number;
  /** 해당 날짜의 평균 배치 실행 시간 (초) */
  avgDurationSec: number;
  /** 해당 날짜의 Wind(KR) 총 동기화 수 */
  totalWindCount: number;
  /** 해당 날짜의 Minkabu(JP) 총 동기화 수 */
  totalMinkabuCount: number;
}
