import { B2BLog, LogLevel, MetricData } from './types';

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
  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
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
