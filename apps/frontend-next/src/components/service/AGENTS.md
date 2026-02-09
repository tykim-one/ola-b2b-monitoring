<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-09 | Updated: 2026-02-09 -->

# Service Components

## Purpose
UI components for service monitoring cards. Displays service health status, KPIs, and mini charts with loading states and threshold-based visual indicators.

## Key Files
| File | Description |
|------|-------------|
| `ServiceCard.tsx` | Main service card component with health badges, KPI grid, mini SVG charts |
| `index.ts` | Re-exports ServiceCard |

## For AI Agents
### Working In This Directory
- **ServiceCard props**: `config` (ServiceConfig), `healthData?` (ServiceHealthData), `loading?` (boolean), `onClick?` (callback)
- **Health status colors**: `healthy` (emerald), `warning` (amber), `error` (rose) - applied to badge and border
- **KPI display**: 3-column grid, each KPI has label, formatted value, threshold-based color
- **Chart types**: `line` (SVG polyline), `bar`, `progress` (horizontal bar), `status-list` (recent jobs)

### Component Breakdown
| Sub-component | Purpose |
|---------------|---------|
| `ServiceCard` | Main card layout with header, badge, KPI grid, mini chart |
| `formatKPIValue()` | Formats values by type: number, percentage, duration, currency |
| `getKPIStatus()` | Calculates status (healthy/warning/error) based on thresholds |
| `MiniChart` | Renders mini charts (line/bar/progress/status-list) based on type |

### KPI Formatting
```typescript
format: 'number'     → toLocaleString()
format: 'percentage' → "85.3%" (fixed 1 decimal)
format: 'duration'   → "1050ms"
format: 'currency'   → "$12.50" (fixed 2 decimals)
```

### Threshold Logic
- KPI turns RED if `value < thresholds.error`
- KPI turns YELLOW if `value < thresholds.warning`
- Otherwise GRAY (healthy)
- Example: `resolutionRate` with `{ warning: 80, error: 60 }` shows yellow at 75%, red at 55%

### Chart Implementation Details
- **Line chart**: SVG polyline with points, auto-scales to maxValue
- **Progress**: Horizontal bar with percentage (blue fill)
- **Status-list**: Shows last 3 entries with timestamp and success/fail badge
- **Chart container**: Fixed height `h-24`, rounded border, gray background

### Icon Handling
- Icons from `lucide-react`, dynamically imported via `config.icon` string
- Fallback: `HelpCircle` if icon name not found
- Icon container: Blue background (`bg-blue-50`), rounded (`rounded-xl`)

### Loading State
- Full skeleton UI with animated placeholders
- Skeletons for: icon, title, description, badge, 3 KPIs, chart area

## Dependencies
### Internal
- `@/components/ui/badge` - Status badges
- `@/components/ui/skeleton` - Loading state placeholders
- `@ola/shared-types` - ServiceConfig, ServiceHealthData interfaces

### External
- `lucide-react` - Icon library for service icons
- `react` - Client component
