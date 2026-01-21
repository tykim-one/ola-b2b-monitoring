/**
 * Supported data source types.
 */
export type DataSourceType = 'bigquery' | 'postgresql' | 'mysql';

/**
 * Service domain types for grouping projects.
 * - chatbot: 챗봇 서비스 (실시간 대화형 AI)
 * - report: 리포트 서비스 (문서/분석 생성)
 * - analytics: 분석 서비스 (데이터 분석)
 */
export type ServiceDomain = 'chatbot' | 'report' | 'analytics';

/**
 * BigQuery-specific configuration.
 */
export interface BigQueryDataSourceConfig {
  type: 'bigquery';
  domain?: ServiceDomain;
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
  domain?: ServiceDomain;
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
  domain?: ServiceDomain;
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
