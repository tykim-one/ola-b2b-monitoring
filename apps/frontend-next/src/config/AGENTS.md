<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-09 | Updated: 2026-02-09 -->

# Frontend Configuration

## Purpose
Centralized configuration for service definitions, project mappings, and API routing. Defines the metadata and behavior for all monitored services (IBK Chat, IBK Batch, Wind ETL, Minkabu ETL).

## Key Files
| File | Description |
|------|-------------|
| `services.ts` | Service configurations array (ServiceConfig[]), KPIs, chart types, menu items |
| `service-mapping.ts` | Service-to-project mappings (projectId, tenantId, apiPrefix) |

## For AI Agents
### Working In This Directory
- **services.ts**: Source of truth for service UI config (icons, KPIs, thresholds, menu structure)
- **service-mapping.ts**: Maps service IDs to backend API routes (projectId, apiPrefix)
- **Adding new services**: Add entry to both files (serviceConfigs array + SERVICE_PROJECT_MAPPING)

### Service Config Structure
```typescript
ServiceConfig {
  id: string;                    // Unique service ID
  name: string;                  // Display name
  type: 'chatbot' | 'batch' | 'pipeline';
  icon: string;                  // Lucide icon name
  description: string;
  card: {
    kpis: KPI[];                 // Dashboard card KPIs
    chart: ChartConfig;          // Mini chart config
  };
  menu: MenuItem[];              // Service detail page navigation
}
```

### KPI Configuration
```typescript
KPI {
  key: string;                   // Backend response key (e.g., 'activeSessions')
  label: string;                 // Display label
  format: 'number' | 'percentage' | 'duration' | 'currency';
  thresholds?: {                 // Optional color thresholds
    warning?: number;
    error?: number;
  };
}
```

### Chart Types
| Type | Use Case | Data Structure |
|------|----------|----------------|
| `line` | Time-series traffic | Array of {timestamp, value} |
| `bar` | Categorical data | Array of {timestamp, value} |
| `progress` | Daily completion % | Single value or sum of values |
| `status-list` | Recent job results | Array with 0/1 values (fail/success) |

### Service Mapping Structure
```typescript
ServiceMapping {
  projectId: string;             // Backend project ID
  tenantId?: string;             // Optional tenant filter
  apiPrefix: string;             // API route prefix (e.g., '/projects/ibks/api')
  etlApiPrefix?: string;         // ETL-specific API prefix
}
```

### Current Services
| Service ID | Type | Project | API Prefix |
|------------|------|---------|------------|
| `ibk-chat` | chatbot | ibks | /projects/ibks/api |
| `ibk` | batch | ibks | /projects/ibks/api |
| `wind-etl` | pipeline | wind | /api/wind-etl |
| `minkabu-etl` | pipeline | minkabu | /api/minkabu-etl |

### Helper Functions
- `getServiceConfig(serviceId)` - Find config by ID
- `getServicesByType(type)` - Filter configs by type (chatbot/batch/pipeline)
- `getServiceMapping(serviceId)` - Get API mapping for service

### Adding a New Service (Step-by-Step)
1. **Add to services.ts**:
   - Define ServiceConfig with id, name, type, icon, description
   - Configure card.kpis (3 KPIs recommended for dashboard grid)
   - Set card.chart type (line/bar/progress/status-list)
   - Add menu items for detail pages
2. **Add to service-mapping.ts**:
   - Define projectId, apiPrefix (and tenantId if applicable)
3. **Backend**: Implement `/api/services/{serviceId}/health` endpoint
4. **Home page auto-updates** (iterates serviceConfigs array)

### KPI Threshold Guidelines
- **Resolution Rate**: `{ warning: 80, error: 60 }` (below 80% = yellow, below 60% = red)
- **Success Rate**: `{ warning: 95, error: 90 }` (high bar for ETL pipelines)
- **Response Time**: No thresholds (display only)
- **Queue Size**: Use warning/error for backlog alerts

## Dependencies
### Internal
- `@ola/shared-types` - ServiceConfig, ServiceHealthData interfaces

### External
- None (pure TypeScript configuration)
