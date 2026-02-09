const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/report-monitoring`;

// Types (Date → string으로 직렬화)
export type ReportType = 'ai_stock' | 'commodity' | 'forex' | 'dividend' | 'summary';

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

export interface MonitoringHistoryItem {
  id: string;
  trigger: 'manual' | 'scheduled';
  totalReports: number;
  healthyReports: number;
  issueReports: number;
  totalMissing: number;
  totalIncomplete: number;
  totalSuspicious: number;
  totalStale: number;
  hasIssues: boolean;
  checkedAt: string;
}

export interface MonitoringHistoryResponse {
  items: MonitoringHistoryItem[];
  total: number;
}

// 타입 가드 함수 (Critical Issue #1)
export function isMonitoringResult(
  data: MonitoringResult | NoCheckMessage
): data is MonitoringResult {
  return 'results' in data && 'summary' in data;
}

// UI Check Config Types
export interface UiCheckConfigCheck {
  type: string;
  description: string;
  selector?: string;
  minCount?: number;
  minContentLength?: number;
  patterns?: string[];
  sections?: Array<{ name: string; sectionSelector: string; headingText?: string }>;
  minItems?: number;
  sectionName?: string;
}

export interface UiCheckConfigTarget {
  id: string;
  name: string;
  urlTemplate: string;
  theme?: string;
  reportType?: string;
  checksCount: number;
  checks: UiCheckConfigCheck[];
}

export interface UiCheckConfigResponse {
  defaults: { timeout: number; waitForSelector: string; viewport: { width: number; height: number } };
  targets: UiCheckConfigTarget[];
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

  async getHistory(params?: {
    limit?: number;
    offset?: number;
    hasIssues?: boolean;
  }): Promise<MonitoringHistoryResponse> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    if (params?.hasIssues !== undefined) searchParams.set('hasIssues', String(params.hasIssues));

    const qs = searchParams.toString();
    const response = await fetch(`${API_BASE}/history${qs ? '?' + qs : ''}`);
    if (!response.ok) throw new Error('Failed to fetch history');
    return response.json();
  },

  // UI Check endpoints
  async runUiCheck(): Promise<import('@ola/shared-types').UiMonitoringResult> {
    const response = await fetch(`${API_BASE}/ui-check`, { method: 'POST' });
    if (!response.ok) throw new Error('Failed to run UI check');
    return response.json();
  },

  async getUiCheckStatus(): Promise<import('@ola/shared-types').UiMonitoringResult | NoCheckMessage> {
    const response = await fetch(`${API_BASE}/ui-check/status`);
    if (!response.ok) throw new Error('Failed to fetch UI check status');
    return response.json();
  },

  async getUiCheckHistory(params?: {
    limit?: number;
    offset?: number;
    hasIssues?: boolean;
  }): Promise<import('@ola/shared-types').UiCheckHistoryResponse> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    if (params?.hasIssues !== undefined) searchParams.set('hasIssues', String(params.hasIssues));

    const qs = searchParams.toString();
    const response = await fetch(`${API_BASE}/ui-check/history${qs ? '?' + qs : ''}`);
    if (!response.ok) throw new Error('Failed to fetch UI check history');
    return response.json();
  },

  async getUiCheckHistoryDetail(id: string): Promise<import('@ola/shared-types').UiMonitoringResult | NoCheckMessage> {
    const response = await fetch(`${API_BASE}/ui-check/history/${id}`);
    if (!response.ok) throw new Error('Failed to fetch UI check history detail');
    return response.json();
  },

  async updateUiCheckConfig(params: {
    targetId: string;
    checkIndex: number;
    values: Record<string, unknown>;
  }): Promise<UiCheckConfigResponse> {
    const response = await fetch(`${API_BASE}/ui-check/config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!response.ok) throw new Error('Failed to update UI check config');
    return response.json();
  },

  async getUiCheckConfig(): Promise<UiCheckConfigResponse> {
    const response = await fetch(`${API_BASE}/ui-check/config`);
    if (!response.ok) throw new Error('Failed to fetch UI check config');
    return response.json();
  },

  async getUiCheckHealth(): Promise<{
    scheduler: {
      isRunning: boolean;
      cronExpression: string;
      timezone: string;
      nextExecution: string | null;
    };
    lastCheck: {
      timestamp: string;
      hasIssues: boolean;
      summary: import('@ola/shared-types').UiMonitoringSummary;
    } | null;
  }> {
    const response = await fetch(`${API_BASE}/ui-check/health`);
    if (!response.ok) throw new Error('Failed to fetch UI check health');
    return response.json();
  },
};
