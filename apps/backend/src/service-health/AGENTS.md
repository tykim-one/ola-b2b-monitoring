<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-09 | Updated: 2026-02-09 -->

# Service Health Module

## Purpose
Provides health check and KPI monitoring API for external services (IBK Chat, IBK Batch, Wind ETL, Minkabu ETL). Returns service status, KPIs, and time-series chart data with 5-minute caching.

## Key Files
| File | Description |
|------|-------------|
| `service-health.module.ts` | NestJS module registration, imports CacheModule |
| `service-health.controller.ts` | REST endpoint `GET /api/services/:serviceId/health`, uses @Public() decorator |
| `service-health.service.ts` | Business logic: service-specific health data fetchers, mock data generation |
| `README.md` | API documentation, service specs, response format examples |

## Service Types
| Service ID | Type | KPIs | Chart Data |
|------------|------|------|------------|
| `ibk-chat` | Real-time chat | activeSessions, resolutionRate, avgResponseTime | 24-hour traffic (hourly) |
| `ibk` | Batch processing | lastRunTime, successRate, dataLoadStatus | Recent 10 jobs (30-min intervals) |
| `wind-etl` | ETL pipeline | processing, queued, successRate, dailyProgress | 7-day daily progress |
| `minkabu-etl` | ETL pipeline | processing, queued, successRate, dailyProgress | 7-day daily progress |

## For AI Agents
### Working In This Directory
- **Current state**: All services return mock data with randomized KPIs
- **Adding new services**: Add case to `fetchServiceHealthData()` switch statement, create private method like `getXxxHealth()`
- **Status calculation**: `healthy` (green), `warning` (yellow), `error` (red) based on KPI thresholds
- **Response format**: Must include `serviceId`, `status`, `statusReason`, `lastChecked` (ISO 8601), `kpis` (object), `chartData` (array)
- **Caching**: All responses cached 5 minutes (CacheTTL.SHORT), cache key: `service:health:{serviceId}`
- **Future work**: Replace mock data with real service API/database connections (see README Phase 1)

### Common Patterns
- Health status thresholds: `resolutionRate >= 90` = healthy, `queued < 50` = healthy (ETL)
- Chart data timestamps: Use `new Date().toISOString()` for consistency
- Error handling: Throw `NotFoundException` for unknown serviceId

## Dependencies
### Internal
- `../cache/cache.service` - CacheService for 5-minute TTL caching
- `../admin/auth/decorators/public.decorator` - @Public() to bypass JWT auth

### External
- `@nestjs/common` - Controller, Injectable, Logger, NotFoundException
- `@nestjs/swagger` - API documentation decorators
