import type { B2BLog, LogLevel } from '@ola/shared-types';

export type { B2BLog, LogLevel };

export interface MetricData {
  time: string;
  requests: number;
  errors: number;
  latency: number;
}
