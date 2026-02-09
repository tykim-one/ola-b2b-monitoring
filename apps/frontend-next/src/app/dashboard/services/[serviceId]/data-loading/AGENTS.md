<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-09 | Updated: 2026-02-09 -->

# data-loading

## Purpose
Service-specific data loading status page. Displays daily data ingestion metrics, table information, and record counts for monitoring data pipeline health.

## Key Files
| File | Description |
|------|-------------|
| `page.tsx` | Data loading dashboard with KPIs (today's records, total records, table count), daily ingestion chart, and table details DataTable |

## For AI Agents
### Working In This Directory
- **Query Pattern**: Uses React Query with `queryKey: ['data-loading-daily', projectId, dateRange.days]` and `['data-loading-tables', projectId]`
- **API Endpoints**:
  - `GET /projects/${projectId}/api/metrics/daily?days=${days}` - Daily load data
  - Table info currently uses mock data (placeholder for future API)
- **Components Used**:
  - Dashboard compound component with KPISection, ChartsSection, TableSection
  - DateRangeFilter for time range selection
  - DataTable for table listing with Database icon
  - Recharts BarChart for daily load visualization
- **Data Types**:
  - `DailyLoadData`: date, recordCount, dataSize (optional)
  - `TableInfo`: name, recordCount, lastUpdated, dataSize
- **KPI Cards**: Today's load, total records, table count, latest data timestamp
- **Date Formatting**: Korean locale with month/day/hour/minute format
- **Table Columns**: Table name (with Database icon), record count, data size, last updated

### Testing Considerations
- Verify mock data fallback for table info endpoint
- Test date range filter integration (7-day default)
- Validate empty state handling when no data exists
- Check chart rendering with varying data volumes

## Dependencies
### Internal
- `@/hooks/useServiceContext` - Service context for projectId
- `@/components/compound/Dashboard` - Dashboard layout wrapper
- `@/components/compound/DataTable` - Table listing component
- `@/components/compound/Chart` - Chart wrapper
- `@/components/kpi/KPICard` - KPI metric cards
- `@/components/ui/DateRangeFilter` - Time range selection
- `@/lib/api-client` - API requests
- `@tanstack/react-query` - Data fetching and caching

### External
- `recharts` - BarChart, XAxis, YAxis, CartesianGrid, Tooltip
- `lucide-react` - Icons (Database, TrendingUp, Clock, HardDrive, RefreshCw)
