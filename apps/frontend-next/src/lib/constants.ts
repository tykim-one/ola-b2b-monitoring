import type { B2BLog, MetricData } from '@/types';
import { LogLevel } from '@ola/shared-types';

export const PARTNERS = ['Corp-A', 'Logistic-B', 'Retail-C', 'FinTech-D'];
export const SERVICES = ['auth-service', 'order-processor', 'inventory-sync', 'notification-gateway'];

// Helper to generate random logs simulating BigQuery data
export const generateMockLogs = (count: number): B2BLog[] => {
  const logs: B2BLog[] = [];
  const now = new Date().getTime();

  for (let i = 0; i < count; i++) {
    const timeOffset = Math.floor(Math.random() * 1000 * 60 * 60 * 24); // Last 24 hours
    const isError = Math.random() > 0.95;
    const isWarn = !isError && Math.random() > 0.85;
    
    let level = LogLevel.INFO;
    if (isError) level = LogLevel.ERROR;
    else if (isWarn) level = LogLevel.WARN;

    const partner = PARTNERS[Math.floor(Math.random() * PARTNERS.length)];
    const service = SERVICES[Math.floor(Math.random() * SERVICES.length)];

    logs.push({
      id: `log-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(now - timeOffset).toISOString(),
      tenant_id: partner,
      user_input: `Query for ${service}`,
      llm_response: isError
        ? `Failed to process transaction for ${partner}: Timeout waiting for upstream.`
        : `Successfully processed batch sync for ${partner}.`,
      service: service,
      level: level,
      message: isError
        ? `Failed to process transaction for ${partner}: Timeout waiting for upstream.`
        : `Successfully processed batch sync for ${partner}.`,
      latencyMs: isError ? 5000 + Math.random() * 2000 : 50 + Math.random() * 200,
      partnerId: partner,
      traceId: `trc-${Math.random().toString(36).substr(2, 12)}`,
      statusCode: isError ? 500 : 200,
    });
  }
  return logs.sort((a, b) => {
    const timeA = typeof a.timestamp === 'string' ? a.timestamp : a.timestamp.value;
    const timeB = typeof b.timestamp === 'string' ? b.timestamp : b.timestamp.value;
    return new Date(timeB).getTime() - new Date(timeA).getTime();
  });
};

export const generateMetrics = (): MetricData[] => {
  const metrics: MetricData[] = [];
  for (let i = 0; i < 24; i++) {
    metrics.push({
      time: `${i}:00`,
      requests: Math.floor(Math.random() * 5000) + 1000,
      errors: Math.floor(Math.random() * 50),
      latency: Math.floor(Math.random() * 100) + 20,
    });
  }
  return metrics;
};
