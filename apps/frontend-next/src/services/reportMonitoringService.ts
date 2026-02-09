import apiClient from '../lib/api-client';

const API_PATH = '/api/report-monitoring';

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
    const response = await apiClient.get<MonitoringResult | NoCheckMessage>(`${API_PATH}/status`);
    return response.data;
  },

  async runFullCheck(): Promise<MonitoringResult> {
    const response = await apiClient.post<MonitoringResult>(`${API_PATH}/check`);
    return response.data;
  },

  async getHealth(): Promise<HealthResponse> {
    const response = await apiClient.get<HealthResponse>(`${API_PATH}/health`);
    return response.data;
  },

  async getHistory(params?: {
    limit?: number;
    offset?: number;
    hasIssues?: boolean;
  }): Promise<MonitoringHistoryResponse> {
    const response = await apiClient.get<MonitoringHistoryResponse>(`${API_PATH}/history`, {
      params: {
        ...(params?.limit && { limit: params.limit }),
        ...(params?.offset && { offset: params.offset }),
        ...(params?.hasIssues !== undefined && { hasIssues: params.hasIssues }),
      },
    });
    return response.data;
  },

  // UI Check endpoints
  async runUiCheck(): Promise<import('@ola/shared-types').UiMonitoringResult> {
    const response = await apiClient.post<import('@ola/shared-types').UiMonitoringResult>(`${API_PATH}/ui-check`);
    return response.data;
  },

  async getUiCheckStatus(): Promise<import('@ola/shared-types').UiMonitoringResult | NoCheckMessage> {
    const response = await apiClient.get<import('@ola/shared-types').UiMonitoringResult | NoCheckMessage>(`${API_PATH}/ui-check/status`);
    return response.data;
  },

  async getUiCheckHistory(params?: {
    limit?: number;
    offset?: number;
    hasIssues?: boolean;
  }): Promise<import('@ola/shared-types').UiCheckHistoryResponse> {
    const response = await apiClient.get<import('@ola/shared-types').UiCheckHistoryResponse>(`${API_PATH}/ui-check/history`, {
      params: {
        ...(params?.limit && { limit: params.limit }),
        ...(params?.offset && { offset: params.offset }),
        ...(params?.hasIssues !== undefined && { hasIssues: params.hasIssues }),
      },
    });
    return response.data;
  },

  async getUiCheckHistoryDetail(id: string): Promise<import('@ola/shared-types').UiMonitoringResult | NoCheckMessage> {
    const response = await apiClient.get<import('@ola/shared-types').UiMonitoringResult | NoCheckMessage>(`${API_PATH}/ui-check/history/${id}`);
    return response.data;
  },

  async updateUiCheckConfig(params: {
    targetId: string;
    checkIndex: number;
    values: Record<string, unknown>;
  }): Promise<UiCheckConfigResponse> {
    const response = await apiClient.patch<UiCheckConfigResponse>(`${API_PATH}/ui-check/config`, params);
    return response.data;
  },

  async getUiCheckConfig(): Promise<UiCheckConfigResponse> {
    const response = await apiClient.get<UiCheckConfigResponse>(`${API_PATH}/ui-check/config`);
    return response.data;
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
    const response = await apiClient.get(`${API_PATH}/ui-check/health`);
    return response.data;
  },
};
