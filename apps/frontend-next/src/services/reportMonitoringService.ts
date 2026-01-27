const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/report-monitoring`;

// Types (Date → string으로 직렬화)
export type ReportType = 'ai_stock' | 'commodity' | 'forex' | 'dividend';

export interface StaleDetail {
  symbol: string;
  updatedAt: string; // ISO date string
  daysBehind: number;
}

export interface IncompleteDetail {
  symbol: string;
  missingFields: string[]; // NULL인 필드 목록
}

export interface SuspiciousDetail {
  symbol: string;
  unchangedFields: string[]; // 전날과 동일한 필드 목록
}

export interface ReportCheckResult {
  reportType: ReportType;
  totalTargets: number;

  // 존재 여부
  existingCount: number;
  missingSymbols: string[];

  // 완전성 (NEW)
  completeCount: number;
  incompleteSymbols: string[];
  incompleteDetails: IncompleteDetail[];
  suspiciousSymbols: string[];
  suspiciousDetails: SuspiciousDetail[];

  // 신선도
  freshCount: number;
  staleSymbols: string[];
  staleDetails: StaleDetail[];

  hasCriticalIssues: boolean;
  checkedAt: string;
}

export interface MonitoringSummary {
  totalReports: number;
  healthyReports: number;
  issueReports: number;
  totalMissing: number;
  totalIncomplete: number; // NEW
  totalSuspicious: number; // NEW
  totalStale: number;
}

export interface MonitoringResult {
  results: ReportCheckResult[];
  summary: MonitoringSummary;
  timestamp: string;
}

export interface NoCheckMessage {
  message: string; // "No check has been executed yet"
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  db: { connected: boolean; type: string | null };
  scheduler: {
    isRunning: boolean;
    cronExpression: string;
    timezone: string;
    nextExecution: string | null;
  };
  targetFiles: Array<{ reportType: ReportType; filename: string }>;
}

// 타입 가드 함수 (Critical Issue #1)
export function isMonitoringResult(
  data: MonitoringResult | NoCheckMessage
): data is MonitoringResult {
  return 'results' in data && 'summary' in data;
}

// API Methods
export const reportMonitoringApi = {
  async getStatus(): Promise<MonitoringResult | NoCheckMessage> {
    const response = await fetch(`${API_BASE}/status`);
    if (!response.ok) throw new Error('Failed to fetch status');
    return response.json();
  },

  async runFullCheck(): Promise<MonitoringResult> {
    const response = await fetch(`${API_BASE}/check`, { method: 'POST' });
    if (!response.ok) throw new Error('Failed to run check');
    return response.json();
  },

  async getHealth(): Promise<HealthResponse> {
    const response = await fetch(`${API_BASE}/health`);
    if (!response.ok) throw new Error('Failed to fetch health');
    return response.json();
  },
};
