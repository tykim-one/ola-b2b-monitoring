import { B2BLog, LogLevel } from '@ola/shared-types';

export { B2BLog, LogLevel };

export interface MetricData {
  time: string;
  requests: number;
  errors: number;
  latency: number;
}
