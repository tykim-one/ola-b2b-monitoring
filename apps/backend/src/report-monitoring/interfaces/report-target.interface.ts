/**
 * 리포트 타입 정의
 */
export type ReportType =
  | 'ai_stock'
  | 'commodity'
  | 'forex'
  | 'dividend'
  | 'summary';

export const REPORT_TYPES: ReportType[] = [
  'ai_stock',
  'commodity',
  'forex',
  'dividend',
  'summary',
];

/**
 * 리포트 타겟 (CSV에서 로드된 항목)
 */
export interface ReportTarget {
  symbol: string;
  displayName: string;
  // 배당주의 경우 추가 필드
  dividendYield?: number;
}

/**
 * DB에서 조회된 데이터 상세
 */
export interface SymbolData {
  symbol: string;
  updatedAt: Date;
  // 추가 필드는 리포트 타입별로 다를 수 있음
  [key: string]: unknown;
}

/**
 * 존재 여부 체크 결과
 */
export interface ExistenceCheckResult {
  existing: string[];
  missing: string[];
}

/**
 * 신선도 체크 결과
 */
export interface FreshnessCheckResult {
  fresh: string[]; // updated_at이 오늘인 항목
  stale: string[]; // updated_at이 오늘 이전인 항목
  staleDetails: Array<{
    symbol: string;
    updatedAt: Date;
    daysBehind: number;
  }>;
}

/**
 * 완전성 체크 결과 (필수 필드 NULL 체크 + 전날 비교)
 */
export interface CompletenessCheckResult {
  complete: string[]; // 모든 필수 필드가 존재하고 값 변동 확인됨
  incomplete: string[]; // 필수 필드 중 NULL인 것이 있음
  suspicious: string[]; // 전날과 값이 동일함 (데이터 파이프라인 이슈 의심)
  incompleteDetails: Array<{
    symbol: string;
    missingFields: string[]; // NULL인 필드 목록
  }>;
  suspiciousDetails: Array<{
    symbol: string;
    unchangedFields: string[]; // 전날과 동일한 필드 목록
  }>;
}

/**
 * 단일 리포트 체크 결과
 */
export interface ReportCheckResult {
  reportType: ReportType;
  totalTargets: number;

  // 존재 여부 체크 결과
  existingCount: number;
  missingSymbols: string[];

  // 완전성 체크 결과 (NEW)
  completeCount: number;
  incompleteSymbols: string[];
  incompleteDetails: Array<{
    symbol: string;
    missingFields: string[];
  }>;
  suspiciousSymbols: string[];
  suspiciousDetails: Array<{
    symbol: string;
    unchangedFields: string[];
  }>;

  // 신선도 체크 결과
  freshCount: number;
  staleSymbols: string[];
  staleDetails: Array<{
    symbol: string;
    updatedAt: Date;
    daysBehind: number;
  }>;

  hasCriticalIssues: boolean;
  checkedAt: Date;
}

/**
 * 전체 모니터링 결과
 */
export interface MonitoringResult {
  results: ReportCheckResult[];
  summary: {
    totalReports: number;
    healthyReports: number;
    issueReports: number;
    totalMissing: number;
    totalIncomplete: number; // NEW: 필수 필드 NULL
    totalSuspicious: number; // NEW: 전날과 동일
    totalStale: number;
  };
  timestamp: Date;
}

/**
 * 리포트 타입별 테이블 매핑 설정
 */
export interface ReportTableConfig {
  reportType: ReportType;
  tableName: string;
  symbolColumn: string;
  updatedAtColumn: string;
}
