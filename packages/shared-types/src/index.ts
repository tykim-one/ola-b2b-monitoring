export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

export interface B2BLog {
  user_input: string;
  timestamp: { value: string } | string;
  tenant_id: string;
  llm_response: string;
  // Optional legacy fields or future fields
  id?: string;
  level?: LogLevel;
  message?: string;
  service?: string;
  latencyMs?: number;
  traceId?: string;
  statusCode?: number;
}
