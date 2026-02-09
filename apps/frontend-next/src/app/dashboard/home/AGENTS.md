<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-09 | Updated: 2026-02-09 -->

# Dashboard Home Page

## Purpose
Main dashboard landing page displaying all monitored services in a grid layout with real-time health status cards. Uses 30-second polling for live updates.

## Key Files
| File | Description |
|------|-------------|
| `page.tsx` | Home page component: renders service grid, wraps ServiceCard with useServiceHealth hook |

## For AI Agents
### Working In This Directory
- **Layout**: 2-column responsive grid (1 col mobile, 2 cols desktop), light theme (`bg-gray-50`)
- **Data flow**: `serviceConfigs` (static config) → `useServiceHealth` (API polling) → `ServiceCard` (presentation)
- **Polling interval**: 30 seconds (`refreshInterval: 30000`)
- **Navigation**: Click on service card navigates to `/dashboard/services/{serviceId}`
- **Service configs**: Imported from `@/config/services.ts`, maps to ServiceCard props

### Component Structure
```
HomePage
└── ServiceCardWithHealth (wrapper)
    ├── useServiceHealth hook (30s polling)
    └── ServiceCard (presentation component)
```

### Adding New Services
1. Add service config to `@/config/services.ts`
2. Home page automatically renders new card (map over serviceConfigs)
3. Backend must support `/api/services/{serviceId}/health` endpoint

### Styling Notes
- Light theme (differs from main dashboard dark theme)
- Card grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6`
- Page padding: `p-8`, scrollable: `overflow-y-auto`

## Dependencies
### Internal
- `@/components/service` - ServiceCard component
- `@/hooks/useServiceHealth` - Health data fetching hook with polling
- `@/config/services` - serviceConfigs array (static service metadata)

### External
- None (pure React client component)
