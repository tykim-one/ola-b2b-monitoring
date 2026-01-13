export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

export interface B2BLog {
  user_input: string;
  timestamp: { value: string } | string; // Handle both BigQuery object format and potential strings
  tenant_id: string;
  llm_response: string;
  // Optional legacy fields or future fields
  id?: string;
  level?: LogLevel;
  service?: string;
  latencyMs?: number;
  traceId?: string;
  statusCode?: number;
}

export interface MetricData {
  time: string;
  requests: number;
  errors: number;
  latency: number;
}
