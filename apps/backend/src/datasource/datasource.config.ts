import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import {
  DataSourcesConfig,
  DataSourceConfig,
  ResolvedDataSourceConfig,
  DataSourceType,
  ServiceDomain,
} from './interfaces';

/**
 * Service for loading and resolving data source configurations.
 * Supports environment variable substitution in config values.
 */
@Injectable()
export class DataSourceConfigService implements OnModuleInit {
  private readonly logger = new Logger(DataSourceConfigService.name);
  private config: DataSourcesConfig | null = null;
  private readonly configPath: string;

  constructor(private readonly configService: ConfigService) {
    // Config file is in apps/backend/config/datasources.config.json
    this.configPath = path.resolve(
      process.cwd(),
      'config',
      'datasources.config.json',
    );
  }

  onModuleInit() {
    this.loadConfig();
  }

  /**
   * Load configuration from JSON file.
   */
  private loadConfig(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const configContent = fs.readFileSync(this.configPath, 'utf-8');
        this.config = JSON.parse(configContent) as DataSourcesConfig;
        this.logger.log(`Data source config loaded from: ${this.configPath}`);
      } else {
        this.logger.warn(
          `Config file not found at ${this.configPath}, using defaults`,
        );
        this.config = this.getDefaultConfig();
      }
    } catch (error) {
      this.logger.error(`Failed to load config: ${error.message}`);
      this.config = this.getDefaultConfig();
    }
  }

  /**
   * Get default configuration using environment variables.
   */
  private getDefaultConfig(): DataSourcesConfig {
    return {
      default: {
        type: 'bigquery',
        config: {
          projectId: '${GCP_PROJECT_ID}',
          datasetId: '${BIGQUERY_DATASET}',
          tableName: '${BIGQUERY_TABLE}',
          location: '${GCP_BQ_LOCATION}',
          keyFilename: '${GOOGLE_APPLICATION_CREDENTIALS}',
        },
      },
    };
  }

  /**
   * Get the data source configuration for a specific project.
   * Falls back to default if project-specific config is not found.
   */
  getConfigForProject(projectId?: string): ResolvedDataSourceConfig {
    if (!this.config) {
      this.loadConfig();
    }

    let rawConfig: DataSourceConfig;

    if (projectId && this.config?.projects?.[projectId]) {
      rawConfig = this.config.projects[projectId];
      this.logger.debug(`Using project-specific config for: ${projectId}`);
    } else {
      rawConfig = this.config?.default ?? this.getDefaultConfig().default;
      this.logger.debug(
        `Using default config for project: ${projectId ?? 'none'}`,
      );
    }

    return this.resolveConfig(rawConfig);
  }

  /**
   * Resolve environment variables in configuration values.
   * Supports ${ENV_VAR} syntax.
   */
  private resolveConfig(config: DataSourceConfig): ResolvedDataSourceConfig {
    const resolvedConfig: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(config.config)) {
      if (
        typeof value === 'string' &&
        value.startsWith('${') &&
        value.endsWith('}')
      ) {
        const envVar = value.slice(2, -1);
        const envValue = this.configService.get<string>(envVar);
        resolvedConfig[key] = envValue ?? '';
      } else {
        resolvedConfig[key] = value;
      }
    }

    return {
      type: config.type as DataSourceType,
      config: resolvedConfig,
    };
  }

  /**
   * Get list of configured projects.
   */
  getConfiguredProjects(): string[] {
    return Object.keys(this.config?.projects ?? {});
  }

  /**
   * Check if a specific data source type is configured.
   */
  hasDataSourceType(type: DataSourceType): boolean {
    if (this.config?.default.type === type) {
      return true;
    }
    return Object.values(this.config?.projects ?? {}).some(
      (p) => p.type === type,
    );
  }

  /**
   * Reload configuration from file.
   * Useful for runtime config updates.
   */
  reloadConfig(): void {
    this.loadConfig();
    this.logger.log('Data source configuration reloaded');
  }

  // ==================== 도메인 기반 조회 메서드 ====================

  /**
   * Get project IDs filtered by domain.
   * @param domain The service domain to filter by
   * @returns Array of project IDs belonging to the specified domain
   */
  getProjectIdsByDomain(domain: ServiceDomain): string[] {
    if (!this.config) {
      this.loadConfig();
    }

    const projects = this.config?.projects ?? {};
    return Object.entries(projects)
      .filter(([_, config]) => config.domain === domain)
      .map(([projectId]) => projectId);
  }

  /**
   * Get all configured project IDs.
   * Alias for getConfiguredProjects() with clearer naming.
   * @returns Array of all project IDs
   */
  getAllProjectIds(): string[] {
    return this.getConfiguredProjects();
  }

  /**
   * Get all available (unique) domains from configuration.
   * @returns Array of unique ServiceDomain values
   */
  getAvailableDomains(): ServiceDomain[] {
    if (!this.config) {
      this.loadConfig();
    }

    const domains = new Set<ServiceDomain>();

    // Add default domain if set
    if (this.config?.default.domain) {
      domains.add(this.config.default.domain);
    }

    // Add domains from projects
    const projects = this.config?.projects ?? {};
    for (const config of Object.values(projects)) {
      if (config.domain) {
        domains.add(config.domain);
      }
    }

    return Array.from(domains);
  }

  /**
   * Get the domain for a specific project.
   * @param projectId The project ID to look up
   * @returns The service domain, or undefined if not configured
   */
  getDomainForProject(projectId: string): ServiceDomain | undefined {
    if (!this.config) {
      this.loadConfig();
    }

    const projectConfig = this.config?.projects?.[projectId];
    if (projectConfig?.domain) {
      return projectConfig.domain;
    }

    // Fall back to default domain
    return this.config?.default.domain;
  }

  /**
   * Get raw configuration for a project (without environment variable resolution).
   * Useful for accessing domain metadata.
   * @param projectId The project ID
   * @returns Raw DataSourceConfig or undefined
   */
  getRawConfigForProject(projectId: string): DataSourceConfig | undefined {
    if (!this.config) {
      this.loadConfig();
    }

    return this.config?.projects?.[projectId] ?? this.config?.default;
  }
}
