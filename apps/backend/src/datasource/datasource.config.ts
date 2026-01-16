import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import {
  DataSourcesConfig,
  DataSourceConfig,
  ResolvedDataSourceConfig,
  DataSourceType,
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
      this.logger.debug(`Using default config for project: ${projectId ?? 'none'}`);
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
      if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
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
    return Object.values(this.config?.projects ?? {}).some((p) => p.type === type);
  }

  /**
   * Reload configuration from file.
   * Useful for runtime config updates.
   */
  reloadConfig(): void {
    this.loadConfig();
    this.logger.log('Data source configuration reloaded');
  }
}
