/**
 * Supported data source types.
 */
export type DataSourceType = 'bigquery' | 'postgresql' | 'mysql';

/**
 * BigQuery-specific configuration.
 */
export interface BigQueryDataSourceConfig {
  type: 'bigquery';
  config: {
    projectId?: string;
    datasetId: string;
    tableName: string;
    location?: string;
    keyFilename?: string;
  };
}

/**
 * PostgreSQL-specific configuration (for future use).
 */
export interface PostgreSQLDataSourceConfig {
  type: 'postgresql';
  config: {
    host: string;
    port: number;
    database: string;
    username?: string;
    password?: string;
    ssl?: boolean;
  };
}

/**
 * MySQL-specific configuration (for future use).
 */
export interface MySQLDataSourceConfig {
  type: 'mysql';
  config: {
    host: string;
    port: number;
    database: string;
    username?: string;
    password?: string;
  };
}

/**
 * Union type for all data source configurations.
 */
export type DataSourceConfig =
  | BigQueryDataSourceConfig
  | PostgreSQLDataSourceConfig
  | MySQLDataSourceConfig;

/**
 * Root configuration structure for data sources.
 */
export interface DataSourcesConfig {
  /**
   * Default data source used when no project-specific configuration is found.
   */
  default: DataSourceConfig;

  /**
   * Project-specific data source configurations.
   * Key is the project ID.
   */
  projects?: Record<string, DataSourceConfig>;
}

/**
 * Resolved configuration with environment variables substituted.
 */
export interface ResolvedDataSourceConfig {
  type: DataSourceType;
  config: Record<string, unknown>;
}
