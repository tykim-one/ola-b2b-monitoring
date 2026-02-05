// packages/shared-types/src/service.types.ts

/**
 * Service Type Definitions for Multi-Service Monitoring
 *
 * These types define the configuration and data structures for the multi-service
 * monitoring system, enabling dynamic service registration and rendering.
 */

/**
 * Service Types - Categories of services
 */
export type ServiceType = 'chatbot' | 'pipeline' | 'batch' | 'custom';

/**
 * Service Configuration
 *
 * Defines a service's metadata, UI components, and API endpoints.
 * Services are registered in a configuration file and rendered dynamically.
 */
export interface ServiceConfig {
  /** Unique service identifier (e.g., 'ibk-chat', 'wind-etl') */
  id: string;

  /** Display name for UI */
  name: string;

  /** Service category type */
  type: ServiceType;

  /** Icon name (Lucide icon) */
  icon: string;

  /** Service description */
  description: string;

  /** Home card configuration */
  card: {
    /** KPIs to display (max 3) */
    kpis: ServiceKPIConfig[];

    /** Mini chart configuration */
    chart: ServiceChartConfig;
  };

  /** Sidebar menu items for service detail pages */
  menu: ServiceMenuItem[];

  /** Optional API endpoint overrides */
  endpoints?: {
    /** Health check API endpoint */
    health?: string;

    /** KPI data API endpoint */
    kpi?: string;

    /** Chart data API endpoint */
    chart?: string;
  };
}

/**
 * KPI Configuration
 *
 * Defines a single KPI metric for service cards.
 */
export interface ServiceKPIConfig {
  /** API response field name */
  key: string;

  /** Display label */
  label: string;

  /** Value format type */
  format: 'number' | 'percentage' | 'duration' | 'currency';

  /** Optional thresholds for status determination */
  thresholds?: {
    /** Warning threshold (yellow status) */
    warning?: number;

    /** Error threshold (red status) */
    error?: number;
  };
}

/**
 * Chart Configuration
 *
 * Defines the mini chart displayed on service cards.
 */
export interface ServiceChartConfig {
  /** Chart type */
  type: 'line' | 'bar' | 'progress' | 'status-list';

  /** Data key in API response */
  dataKey: string;

  /** Chart label */
  label: string;
}

/**
 * Service Menu Item
 *
 * Defines a menu item in the service detail sidebar.
 */
export interface ServiceMenuItem {
  /** Menu item identifier */
  id: string;

  /** Display label */
  label: string;

  /** Relative path (relative to service base path) */
  path: string;

  /** Optional icon name */
  icon?: string;
}

/**
 * Service Health Status
 */
export type ServiceStatus = 'healthy' | 'warning' | 'error';

/**
 * Service Health Data
 *
 * Runtime health and metrics data for a service.
 * Returned by health/KPI API endpoints.
 */
export interface ServiceHealthData {
  /** Service identifier */
  serviceId: string;

  /** Current health status */
  status: ServiceStatus;

  /** Optional status reason (e.g., error message) */
  statusReason?: string;

  /** Last health check timestamp (ISO 8601) */
  lastChecked: string;

  /** KPI values (keyed by ServiceKPIConfig.key) */
  kpis: Record<string, number | string>;

  /** Chart data points */
  chartData: Array<{
    /** Timestamp (ISO 8601) */
    timestamp: string;

    /** Metric value */
    value: number;
  }>;
}
