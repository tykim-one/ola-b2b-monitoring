<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-09 | Updated: 2026-02-09 -->

# status

## Purpose
Service health and status monitoring page. Displays different views based on service type: Report Batch monitoring for 'batch' type, ETL pipeline status for 'pipeline' type.

## Key Files
| File | Description |
|------|-------------|
| `page.tsx` | Main status page with service type detection and routing to appropriate content component |
| `BatchStatusContent.tsx` | Batch job status dashboard (generic batch monitoring, currently unused in favor of report monitoring) |
| `ETLStatusContent.tsx` | ETL pipeline status dashboard for Wind/Minkabu ETL services |

## For AI Agents
### Working In This Directory
- **Service Type Routing**:
  - `type: 'batch'` → Renders `ReportBatchStatus` component (IBK report monitoring)
  - `type: 'pipeline'` → Renders ETL content (Wind ETL or Minkabu ETL)
  - Unknown type → Error fallback
- **Report Batch Monitoring** (inline in page.tsx):
  - Uses custom hooks: `useReportMonitoringHealth`, `useReportMonitoringResult`, `useReportMonitoringHistory`, `useRunReportCheck`
  - Report types: ai_stock, commodity, forex, dividend
  - Features:
    - DB connection status indicator
    - Scheduler status (cron expression, timezone, next execution)
    - Manual "Run Check" button (mutation)
    - Report status table (missing/incomplete/stale/complete symbols)
    - System status footer with DB, scheduler, target files
    - Check history table with pagination (10 items per page)
  - KPIs: Total reports, healthy reports, issue reports, stale reports
  - Color coding: Red = critical issues, Orange = incomplete, Amber = stale, Green = complete
  - StatusBadge component for visual status indicators
  - EmptyState when no check has run yet
- **ETL Status Monitoring** (ETLStatusContent.tsx):
  - Unified component supporting Wind ETL and Minkabu ETL
  - DTO mapping: Backend API → Frontend interfaces
  - Wind ETL: filesProcessed, totalRecords, todayTotalFiles
  - Minkabu ETL: articlesFetched, todayHeadlines, todayTotalArticles
  - Status mapping: running→processing, success→completed, failed→failed, pending→queued
  - Service-specific labels via `getETLLabels(serviceId)` function
  - KPIs: Processing count, queued count, success rate, today's processed count
  - Daily trend chart (AreaChart, reversed for chronological order)
  - Run history table (20 latest runs)
  - Mock data fallback on API errors
  - Manual refresh button
  - Date range filter (7-day default)
- **API Endpoints**:
  - Report: `/api/report-monitoring/health`, `/result`, `/history`, POST `/run-check`
  - ETL: `${etlApiPrefix}/runs?limit=20`, `/summary`, `/trend/daily?days=${days}`
- **State Management**:
  - Report uses React Query hooks for all data
  - ETL uses manual useState + useEffect for flexibility
  - Both support manual refresh
- **Date Formatting**: Korean locale month/day/hour/minute

### Testing Considerations
- Verify service type detection from context
- Test report monitoring with/without DB connection
- Validate manual check execution (mutation)
- Test ETL with both Wind and Minkabu service IDs
- Verify DTO mapping handles missing optional fields
- Check mock data fallback scenarios
- Test status badge color logic
- Validate chart date ordering (chronological)
- Test pagination in history table
- Verify empty states for both batch and ETL types

## Dependencies
### Internal
- `@/hooks/useServiceContext` - Service type, API prefix, service ID
- `@/hooks/queries/use-report-monitoring` - Report monitoring hooks
- `@/components/compound/Dashboard` - Dashboard layout
- `@/components/compound/DataTable` - Tables for reports/runs/history
- `@/components/compound/Chart` - Chart wrapper
- `@/components/kpi/KPICard` - Status metrics
- `@/components/ui/DateRangeFilter` - Time range selection
- `@/components/ui/StatusBadge` - Status indicators
- `@/components/ui/EmptyState` - Empty state UI
- `@/lib/api-client` - API requests (ETL only)
- `@/services/reportMonitoringService` - Report types and interfaces
- `@ola/shared-types` - ReportType enum

### External
- `recharts` - AreaChart, BarChart for trends
- `lucide-react` - Icons (Play, CheckCircle, Clock, Calendar, FileText, Database, etc.)
- `@tanstack/react-query` - Report monitoring hooks
