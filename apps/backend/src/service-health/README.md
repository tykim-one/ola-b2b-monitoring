# Service Health Module

서비스별 헬스체크 및 KPI 모니터링 API 모듈

## API Endpoint

```
GET /api/services/:serviceId/health
```

## Supported Services

| Service ID | Description | KPIs |
|------------|-------------|------|
| `ibk-chat` | Real-time chat service | activeSessions, resolutionRate, avgResponseTime |
| `ibk` | Batch processing service | lastRunTime, successRate, dataLoadStatus |
| `wind-etl` | Wind ETL pipeline | processing, queued, successRate, dailyProgress |
| `minkabu-etl` | Minkabu ETL pipeline | processing, queued, successRate, dailyProgress |

## Response Format

```typescript
{
  success: true,
  data: {
    serviceId: string;
    status: 'healthy' | 'warning' | 'error';
    statusReason?: string;
    lastChecked: string; // ISO 8601
    kpis: Record<string, number | string>;
    chartData: Array<{ timestamp: string; value: number }>;
  },
  cached: true,
  cacheTTL: '5 minutes'
}
```

## Examples

### IBK Chat Service
```bash
curl http://localhost:3000/api/services/ibk-chat/health
```

Response:
```json
{
  "success": true,
  "data": {
    "serviceId": "ibk-chat",
    "status": "healthy",
    "statusReason": "All systems operational",
    "lastChecked": "2025-02-05T12:00:00.000Z",
    "kpis": {
      "activeSessions": 125,
      "resolutionRate": "92%",
      "avgResponseTime": "1050ms"
    },
    "chartData": [
      { "timestamp": "2025-02-05T11:00:00.000Z", "value": 650 },
      { "timestamp": "2025-02-05T12:00:00.000Z", "value": 720 }
    ]
  },
  "cached": true,
  "cacheTTL": "5 minutes"
}
```

### Wind ETL Service
```bash
curl http://localhost:3000/api/services/wind-etl/health
```

Response:
```json
{
  "success": true,
  "data": {
    "serviceId": "wind-etl",
    "status": "healthy",
    "statusReason": "ETL pipeline healthy",
    "lastChecked": "2025-02-05T12:00:00.000Z",
    "kpis": {
      "processing": 8,
      "queued": 15,
      "successRate": "97%",
      "dailyProgress": "970/1000"
    },
    "chartData": [
      { "timestamp": "2025-01-30T00:00:00.000Z", "value": 95 },
      { "timestamp": "2025-01-31T00:00:00.000Z", "value": 98 }
    ]
  },
  "cached": true,
  "cacheTTL": "5 minutes"
}
```

## Current Implementation

**Status:** Mock data implementation

The current version returns mock data for demonstration purposes. Each service has:
- Randomized KPI values within realistic ranges
- Time-series chart data (24 hours for ibk-chat, recent jobs for ibk, 7-day progress for ETL services)
- Health status determined by KPI thresholds

## Future Enhancements

### Phase 1: Real Data Integration
- Connect to actual service APIs/databases
- Implement service-specific data adapters
- Add authentication for protected endpoints

### Phase 2: Advanced Features
- Historical health data storage
- Alert threshold configuration
- Webhook notifications for status changes
- Uptime tracking and SLA monitoring

### Integration Points

```typescript
// Example: Connecting to real data source
private async getIbkChatHealth(): Promise<ServiceHealthData> {
  // TODO: Replace with actual API call
  const metrics = await this.ibkChatService.getMetrics();

  return {
    serviceId: 'ibk-chat',
    status: this.calculateStatus(metrics),
    kpis: {
      activeSessions: metrics.activeSessions,
      resolutionRate: `${metrics.resolutionRate}%`,
      avgResponseTime: `${metrics.avgResponseTime}ms`,
    },
    chartData: metrics.hourlyTraffic,
  };
}
```

## Architecture

```
ServiceHealthModule
├── ServiceHealthController  # REST API endpoints
├── ServiceHealthService     # Business logic & data fetching
└── CacheModule              # 5-minute caching (CacheTTL.SHORT)
```

## Caching Strategy

- **TTL:** 5 minutes (CacheTTL.SHORT)
- **Key format:** `service:health:{serviceId}`
- **Invalidation:** Automatic via TTL expiration

## Error Handling

- **404 Not Found:** Unknown serviceId
- **500 Internal Server Error:** Data fetch failure
- Returns appropriate HTTP status codes with error messages
