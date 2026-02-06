import { ReportType } from './index';
import { UiCheckType } from './ui-check.interface';

// ==================== UI Check Result Types ====================

export type UiCheckStatus = 'pass' | 'fail' | 'error' | 'timeout';
export type UiTargetStatus = 'healthy' | 'degraded' | 'broken';

export interface SingleCheckResult {
  type: UiCheckType;
  description: string;
  status: UiCheckStatus;
  message?: string;
  selector?: string;
  expected?: string;
  actual?: string;
  durationMs: number;
}

export interface UiPageCheckResult {
  targetId: string;
  targetName: string;
  url: string;
  reportType?: ReportType;
  status: UiTargetStatus;
  checks: SingleCheckResult[];
  passedCount: number;
  failedCount: number;
  errorCount: number;
  consoleErrors: string[];
  screenshotPath?: string;
  pageLoadTimeMs: number;
  checkedAt: Date;
}

export interface UiMonitoringSummary {
  totalTargets: number;
  healthyTargets: number;
  degradedTargets: number;
  brokenTargets: number;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
}

export interface UiMonitoringResult {
  results: UiPageCheckResult[];
  summary: UiMonitoringSummary;
  authSucceeded: boolean;
  totalDurationMs: number;
  timestamp: Date;
}
