export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

export interface B2BLog {
  id: string;
  timestamp: string;
  service: string;
  level: LogLevel;
  message: string;
  latencyMs: number;
  partnerId: string;
  traceId: string;
  statusCode: number;
}

export interface MetricData {
  time: string;
  requests: number;
  errors: number;
  latency: number;
}
