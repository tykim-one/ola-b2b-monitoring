<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-09 | Updated: 2026-02-09 -->

# logs

## Purpose
Service-specific error log viewer for ETL/Pipeline services. Displays error messages, occurrence counts, affected runs, and error frequency analysis with manual refresh capability.

## Key Files
| File | Description |
|------|-------------|
| `page.tsx` | Error log dashboard with KPIs (error types, total occurrences, top error), error frequency distribution chart, and expandable error details DataTable |

## For AI Agents
### Working In This Directory
- **Data Fetching**: Manual `useEffect` + `apiClient` (not React Query) to avoid stale data issues
- **API Endpoint**: `GET ${etlApiPrefix}/errors?days=${days}` - WindETL error logs
- **DTO Mapping**: Backend returns `WindETLError` DTO with `errorMessage`, `occurrenceCount`, `firstSeen`, `lastSeen`, `affectedRuns[]`
- **Response Structure**: `{ success: true, data: [...] }` or direct array
- **String to Number**: Backend may return `occurrenceCount` as string, use `Number()` for conversion
- **Mock Data Fallback**: Provides example errors on API failure for development
- **State Management**:
  - `errors` - Array of ErrorLog items
  - `stats` - Calculated statistics (totalErrors, totalOccurrences, topError)
  - Manual refresh via `fetchData()` function
- **Components Used**:
  - Dashboard with manual error/refetch props
  - KPISection with 4 cards (error types, occurrences, top error, affected runs)
  - Error frequency chart (horizontal bars, top 5 errors)
  - Expandable DataTable showing full error messages and affected run IDs
  - DateRangeFilter (7-day default)
  - RefreshCw button for manual reload
- **KPI Status Logic**:
  - Error types: >10 = error, >5 = warning, else neutral
  - Total occurrences: >20 = error, >10 = warning, else neutral
  - Top error count: >5 = error, else warning
- **Table Features**:
  - Expandable rows showing full error message and affected run IDs
  - Color-coded occurrence counts (≥5 = rose, else gray)
  - Shows first/last seen timestamps
- **Date Formatting**: Korean locale with month/day/hour/minute

### Testing Considerations
- Verify mock data fallback on API errors
- Test manual refresh button functionality
- Validate string-to-number conversion for occurrenceCount
- Check expandable row rendering with long error messages
- Test empty state when no errors exist
- Verify date range filter triggers data reload

## Dependencies
### Internal
- `@/hooks/useServiceContext` - ETL API prefix from context
- `@/components/compound/Dashboard` - Dashboard layout
- `@/components/compound/DataTable` - Expandable error table
- `@/components/kpi/KPICard` - Error metrics
- `@/components/ui/DateRangeFilter` - Time range selection
- `@/lib/api-client` - API requests

### External
- `lucide-react` - Icons (AlertTriangle, XCircle, Clock, FileWarning, RefreshCw)
