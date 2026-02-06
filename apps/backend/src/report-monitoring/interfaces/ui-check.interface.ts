import { ReportType } from './index';

// ==================== UI Check Configuration Types ====================

export interface UiCheckConfig {
  auth: AuthConfig;
  defaults: DefaultsConfig;
  targets: UiCheckTarget[];
}

export interface AuthConfig {
  loginUrl: string;
  usernameSelector: string;
  passwordSelector: string;
  submitSelector: string;
  successIndicator: string;
  storageStatePath: string;
}

export interface DefaultsConfig {
  timeout: number;
  waitForSelector: string;
  viewport: { width: number; height: number };
}

export interface UiCheckTarget {
  id: string;
  name: string;
  url: string;
  reportType?: ReportType;
  checks: UiCheckDefinition[];
}

export type UiCheckType =
  | 'element_exists'
  | 'element_count_min'
  | 'no_error_text'
  | 'chart_rendered'
  | 'no_console_errors'
  | 'no_empty_page';

export interface UiCheckDefinition {
  type: UiCheckType;
  selector?: string;
  minCount?: number;
  patterns?: string[];
  minContentLength?: number;
  description: string;
}
