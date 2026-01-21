import { Injectable, Logger } from '@nestjs/common';
import { DataSourceFactory } from '../datasource/factory/datasource.factory';
import { CacheService, CacheTTL } from '../cache/cache.service';
import { ServiceDomain } from '../datasource/interfaces';
import {
  DomainSummaryKPI,
  ProjectKPI,
} from '@ola/shared-types';

/**
 * Service for aggregating metrics across projects within a domain.
 * Provides domain-level KPI summaries with caching.
 */
@Injectable()
export class DomainMetricsService {
  private readonly logger = new Logger(DomainMetricsService.name);

  constructor(
    private readonly factory: DataSourceFactory,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Get aggregated KPI summary for a specific domain.
   * @param domain The service domain to aggregate
   * @returns DomainSummaryKPI with combined metrics from all projects in the domain
   */
  async getDomainSummary(domain: ServiceDomain): Promise<DomainSummaryKPI> {
    const cacheKey = CacheService.generateKey('metrics', 'domain', domain, 'summary');

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.fetchDomainSummary(domain),
      CacheTTL.MEDIUM,
    );
  }

  /**
   * Fetch and aggregate KPI data from all projects in a domain.
   */
  private async fetchDomainSummary(domain: ServiceDomain): Promise<DomainSummaryKPI> {
    const dataSources = await this.factory.getDataSourcesByDomain(domain);

    if (dataSources.length === 0) {
      this.logger.warn(`No data sources found for domain: ${domain}`);
      return this.createEmptyDomainSummary(domain);
    }

    // Fetch KPIs from all projects in parallel
    const results = await Promise.all(
      dataSources.map(async ({ projectId, ds }) => {
        try {
          const kpi = await ds.getRealtimeKPI();
          return { projectId, kpi };
        } catch (error) {
          this.logger.error(
            `Failed to fetch KPI for project ${projectId}: ${error.message}`,
          );
          return null;
        }
      }),
    );

    // Filter out failed fetches
    const validResults = results.filter(
      (r): r is ProjectKPI => r !== null,
    );

    if (validResults.length === 0) {
      this.logger.warn(`All KPI fetches failed for domain: ${domain}`);
      return this.createEmptyDomainSummary(domain);
    }

    return this.aggregateResults(domain, validResults);
  }

  /**
   * Aggregate project-level KPIs into a domain summary.
   */
  private aggregateResults(
    domain: ServiceDomain,
    results: ProjectKPI[],
  ): DomainSummaryKPI {
    const totalRequests = results.reduce(
      (sum, r) => sum + r.kpi.total_requests,
      0,
    );

    const totalTokens = results.reduce(
      (sum, r) => sum + r.kpi.total_tokens,
      0,
    );

    const totalInputTokens = results.reduce(
      (sum, r) => sum + r.kpi.total_input_tokens,
      0,
    );

    const totalOutputTokens = results.reduce(
      (sum, r) => sum + r.kpi.total_output_tokens,
      0,
    );

    const activeTenants = results.reduce(
      (sum, r) => sum + r.kpi.active_tenants,
      0,
    );

    // Weighted average success rate based on request count
    const successCount = results.reduce(
      (sum, r) => sum + r.kpi.success_count,
      0,
    );
    const successRate = totalRequests > 0
      ? (successCount / totalRequests) * 100
      : 0;

    const avgTokens = totalRequests > 0 ? totalTokens / totalRequests : 0;

    this.logger.debug(
      `Aggregated ${results.length} projects for domain ${domain}: ` +
      `${totalRequests} requests, ${successRate.toFixed(1)}% success`,
    );

    return {
      domain,
      totalRequests,
      successRate,
      totalTokens,
      avgTokens,
      totalInputTokens,
      totalOutputTokens,
      projectCount: results.length,
      activeTenants,
      byProject: results,
    };
  }

  /**
   * Create an empty domain summary for cases with no data.
   */
  private createEmptyDomainSummary(domain: ServiceDomain): DomainSummaryKPI {
    return {
      domain,
      totalRequests: 0,
      successRate: 0,
      totalTokens: 0,
      avgTokens: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      projectCount: 0,
      activeTenants: 0,
      byProject: [],
    };
  }

  /**
   * Invalidate cached domain summary.
   * @param domain The domain to invalidate, or undefined for all domains
   */
  invalidateCache(domain?: ServiceDomain): void {
    if (domain) {
      const cacheKey = CacheService.generateKey('metrics', 'domain', domain, 'summary');
      this.cacheService.del(cacheKey);
      this.logger.debug(`Invalidated cache for domain: ${domain}`);
    } else {
      this.cacheService.delByPattern('metrics:domain:');
      this.logger.debug('Invalidated cache for all domains');
    }
  }
}
