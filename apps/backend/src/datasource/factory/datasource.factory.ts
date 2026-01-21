import { Injectable, Logger } from '@nestjs/common';
import {
  MetricsDataSource,
  ResolvedDataSourceConfig,
  ServiceDomain,
} from '../interfaces';
import {
  BigQueryMetricsDataSource,
  BigQueryMetricsConfig,
} from '../implementations';
import { DataSourceConfigService } from '../datasource.config';

/**
 * DataSource with project metadata.
 */
export interface DataSourceWithProject {
  projectId: string;
  ds: MetricsDataSource;
}

/**
 * DataSource with project and domain metadata.
 */
export interface DataSourceWithDomain extends DataSourceWithProject {
  domain: ServiceDomain | undefined;
}

/**
 * Factory for creating MetricsDataSource instances.
 * Supports multiple data source types and manages their lifecycle.
 */
@Injectable()
export class DataSourceFactory {
  private readonly logger = new Logger(DataSourceFactory.name);
  private readonly instances: Map<string, MetricsDataSource> = new Map();

  constructor(private readonly configService: DataSourceConfigService) {}

  /**
   * Create or retrieve a MetricsDataSource instance for the given project.
   * Instances are cached and reused.
   *
   * @param projectId Optional project ID for project-specific data sources
   */
  async getDataSource(projectId?: string): Promise<MetricsDataSource> {
    const cacheKey = projectId ?? 'default';

    // Return cached instance if available
    if (this.instances.has(cacheKey)) {
      return this.instances.get(cacheKey)!;
    }

    // Get configuration for this project
    const config = this.configService.getConfigForProject(projectId);

    // Create new instance based on type
    const instance = await this.createDataSource(config);

    // Initialize and cache
    await instance.initialize();
    this.instances.set(cacheKey, instance);

    this.logger.log(`Created ${config.type} data source for: ${cacheKey}`);

    return instance;
  }

  /**
   * Create a MetricsDataSource instance based on configuration type.
   */
  private async createDataSource(
    config: ResolvedDataSourceConfig,
  ): Promise<MetricsDataSource> {
    switch (config.type) {
      case 'bigquery':
        return this.createBigQueryDataSource(config);

      case 'postgresql':
        throw new Error('PostgreSQL data source not yet implemented');

      case 'mysql':
        throw new Error('MySQL data source not yet implemented');

      default:
        throw new Error(`Unknown data source type: ${config.type}`);
    }
  }

  /**
   * Create a BigQuery data source instance.
   */
  private createBigQueryDataSource(
    config: ResolvedDataSourceConfig,
  ): BigQueryMetricsDataSource {
    const bqConfig: BigQueryMetricsConfig = {
      projectId: config.config.projectId as string,
      datasetId: config.config.datasetId as string,
      tableName: config.config.tableName as string,
      location: (config.config.location as string) || 'asia-northeast3',
      keyFilename: config.config.keyFilename as string | undefined,
    };

    return new BigQueryMetricsDataSource(bqConfig);
  }

  /**
   * Dispose all cached data source instances.
   * Called during application shutdown.
   */
  async disposeAll(): Promise<void> {
    const disposePromises = Array.from(this.instances.values()).map((ds) =>
      ds.dispose().catch((err) => {
        this.logger.warn(`Error disposing data source: ${err.message}`);
      }),
    );

    await Promise.all(disposePromises);
    this.instances.clear();

    this.logger.log('All data source instances disposed');
  }

  /**
   * Get the default data source.
   * Convenience method that calls getDataSource() with no project ID.
   */
  async getDefaultDataSource(): Promise<MetricsDataSource> {
    return this.getDataSource();
  }

  /**
   * Check if a data source instance exists for the given project.
   */
  hasInstance(projectId?: string): boolean {
    const cacheKey = projectId ?? 'default';
    return this.instances.has(cacheKey);
  }

  /**
   * Invalidate a cached data source instance.
   * The next call to getDataSource will create a new instance.
   */
  async invalidate(projectId?: string): Promise<void> {
    const cacheKey = projectId ?? 'default';
    const instance = this.instances.get(cacheKey);

    if (instance) {
      await instance.dispose();
      this.instances.delete(cacheKey);
      this.logger.log(`Data source invalidated: ${cacheKey}`);
    }
  }

  // ==================== 도메인 기반 DataSource 조회 ====================

  /**
   * Get all DataSource instances for a specific domain.
   * @param domain The service domain to filter by
   * @returns Array of DataSource instances with their project IDs
   */
  async getDataSourcesByDomain(
    domain: ServiceDomain,
  ): Promise<DataSourceWithProject[]> {
    const projectIds = this.configService.getProjectIdsByDomain(domain);

    if (projectIds.length === 0) {
      this.logger.debug(`No projects found for domain: ${domain}`);
      return [];
    }

    const results = await Promise.all(
      projectIds.map(async (projectId) => ({
        projectId,
        ds: await this.getDataSource(projectId),
      })),
    );

    this.logger.debug(
      `Retrieved ${results.length} data sources for domain: ${domain}`,
    );

    return results;
  }

  /**
   * Get all DataSource instances across all projects.
   * @returns Array of DataSource instances with project IDs and domains
   */
  async getAllDataSources(): Promise<DataSourceWithDomain[]> {
    const projectIds = this.configService.getAllProjectIds();

    if (projectIds.length === 0) {
      this.logger.debug('No projects configured, using default data source');
      const defaultDs = await this.getDefaultDataSource();
      const defaultDomain = this.configService.getDomainForProject('default');
      return [{ projectId: 'default', domain: defaultDomain, ds: defaultDs }];
    }

    const results = await Promise.all(
      projectIds.map(async (projectId) => {
        const domain = this.configService.getDomainForProject(projectId);
        return {
          projectId,
          domain,
          ds: await this.getDataSource(projectId),
        };
      }),
    );

    this.logger.debug(
      `Retrieved ${results.length} data sources across all projects`,
    );

    return results;
  }

  /**
   * Get list of available domains.
   * Convenience method that delegates to configService.
   */
  getAvailableDomains(): ServiceDomain[] {
    return this.configService.getAvailableDomains();
  }

  /**
   * Expose config service for advanced use cases.
   */
  getConfigService(): DataSourceConfigService {
    return this.configService;
  }
}
