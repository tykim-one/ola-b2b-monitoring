<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-09 | Updated: 2026-02-09 -->

# quality

## Purpose
Service-specific quality monitoring dashboard. Displays token efficiency trends, query-response correlation, repeated question patterns (FAQ candidates), and FAQ clustering analysis.

## Key Files
| File | Description |
|------|-------------|
| `page.tsx` | Quality dashboard with efficiency KPIs, token trend/scatter charts, repeated patterns DataTable, and FAQ analysis section |

## For AI Agents
### Working In This Directory
- **Data Hook**: `useQualityDashboard(projectId, days, enabled)` - Fetches efficiency trends, correlation, patterns, KPIs
- **API Integration**: All data comes from custom hook (not direct apiClient calls)
- **Date Range**: Default 30 days (monthly analysis typical for quality metrics)
- **Components Used**:
  - Dashboard compound component
  - TokenEfficiencyTrendChart - Line chart showing efficiency over time
  - QueryResponseScatterPlot - Scatter plot for correlation analysis
  - DataTable with expandable rows for repeated patterns
  - FAQAnalysisSection - Clustering and LLM reasoning analysis
  - DateRangeFilter with month preset
- **KPI Cards**:
  - Average Efficiency (output/input token ratio): ≥1 = success, ≥0.5 = warning, else error
  - Total Requests: Neutral count
  - Average Response Length: Character count (shows K suffix if ≥1000)
  - FAQ Candidates: High frequency patterns / Total patterns (>5 = warning)
- **Repeated Patterns Table**:
  - Shows top 20 patterns (full list may be longer)
  - Columns: Query pattern, occurrence count, unique tenants, avg response length, last seen
  - Color-coded occurrences: ≥10 = rose, ≥5 = yellow, else emerald
  - Expandable rows show full pattern text and additional metadata
  - Total occurrences calculated from all patterns
- **Chart Layout**: 2-column grid for efficiency trend and scatter plot
- **Data Types**:
  - Efficiency trend: Array of daily efficiency metrics
  - Correlation: Query length vs response length data points
  - Repeated patterns: Query text, occurrence count, tenant count, avg tokens
- **Date Formatting**: Korean locale with month/day/hour/minute

### Testing Considerations
- Verify 30-day default range loads correctly
- Test expandable row rendering for long query patterns
- Validate KPI status colors match thresholds
- Check FAQ analysis section integration
- Test empty states when no patterns exist
- Verify "top 20" truncation message appears when total > 20

## Dependencies
### Internal
- `@/hooks/useServiceContext` - Project ID from context
- `@/hooks/queries/use-quality` - useQualityDashboard hook
- `@/components/compound/Dashboard` - Dashboard layout
- `@/components/compound/DataTable` - Patterns table
- `@/components/charts/TokenEfficiencyTrendChart` - Efficiency line chart
- `@/components/charts/QueryResponseScatterPlot` - Correlation scatter
- `@/components/kpi/KPICard` - Quality metrics
- `@/components/faq-analysis/FAQAnalysisSection` - FAQ clustering UI
- `@/components/ui/DateRangeFilter` - Time range selection

### External
- `lucide-react` - Icons (Activity, MessageSquare, TrendingUp, FileQuestion)
