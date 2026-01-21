import { Injectable, Logger } from '@nestjs/common';
import { DataSourceFactory } from '../datasource/factory/datasource.factory';
import { CacheService, CacheTTL } from '../cache/cache.service';
import { DomainMetricsService } from './domain-metrics.service';
import {
  GlobalSummaryKPI,
  DomainSummaryKPI,
  ProjectKPI,
  ServiceDomain,
} from '@ola/shared-types';

/**
 * Service for aggregating metrics across all projects globally.
 * Provides global-level KPI summaries with caching.
 */
@Injectable()
export class GlobalMetricsService {
  private readonly logger = new Logger(GlobalMetricsService.name);

  constructor(
    private readonly factory: DataSourceFactory,
    private readonly domainService: DomainMetricsService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Get global aggregated KPI summary across all projects and domains.
   * @returns GlobalSummaryKPI with combined metrics from all projects
   */
  async getGlobalSummary(): Promise<GlobalSummaryKPI> {
    const cacheKey = CacheService.generateKey('metrics', 'global', 'summary');

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.fetchGlobalSummary(),
      CacheTTL.MEDIUM,
    );
  }

  /**
   * Fetch and aggregate KPI data from all domains.
   */
  private async fetchGlobalSummary(): Promise<GlobalSummaryKPI> {
    const domains = this.factory.getAvailableDomains();

    if (domains.length === 0) {
      this.logger.warn('No domains configured');
      return this.createEmptyGlobalSummary();
    }

    // Fetch domain summaries in parallel
    const domainResults = await Promise.all(
      domains.map((domain) => this.domainService.getDomainSummary(domain)),
    );

    // Build domain map and collect all projects
    const byDomain: Record<ServiceDomain, DomainSummaryKPI> = {} as Record<
      ServiceDomain,
      DomainSummaryKPI
    >;
    const allProjects: ProjectKPI[] = [];

    for (const domainSummary of domainResults) {
      byDomain[domainSummary.domain] = domainSummary;
      allProjects.push(...domainSummary.byProject);
    }

    // Aggregate totals
    const totalRequests = domainResults.reduce(
      (sum, d) => sum + d.totalRequests,
      0,
    );

    const totalTokens = domainResults.reduce(
      (sum, d) => sum + d.totalTokens,
      0,
    );

    const totalInputTokens = domainResults.reduce(
      (sum, d) => sum + d.totalInputTokens,
      0,
    );

    const totalOutputTokens = domainResults.reduce(
      (sum, d) => sum + d.totalOutputTokens,
      0,
    );

    const activeTenants = domainResults.reduce(
      (sum, d) => sum + d.activeTenants,
      0,
    );

    // Weighted average success rate
    const successCount = allProjects.reduce(
      (sum, p) => sum + p.kpi.success_count,
      0,
    );
    const successRate = totalRequests > 0
      ? (successCount / totalRequests) * 100
      : 0;

    const avgTokens = totalRequests > 0 ? totalTokens / totalRequests : 0;

    this.logger.debug(
      `Global summary: ${domains.length} domains, ` +
      `${allProjects.length} projects, ${totalRequests} total requests`,
    );

    return {
      totalRequests,
      successRate,
      totalTokens,
      avgTokens,
      totalInputTokens,
      totalOutputTokens,
      projectCount: allProjects.length,
      activeTenants,
      domainCount: domains.length,
      byProject: allProjects,
      byDomain,
    };
  }

  /**
   * Create an empty global summary for cases with no data.
   */
  private createEmptyGlobalSummary(): GlobalSummaryKPI {
    return {
      totalRequests: 0,
      successRate: 0,
      totalTokens: 0,
      avgTokens: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      projectCount: 0,
      activeTenants: 0,
      domainCount: 0,
      byProject: [],
      byDomain: {} as Record<ServiceDomain, DomainSummaryKPI>,
    };
  }

  /**
   * Get list of available domains.
   * @returns Array of configured service domains
   */
  getAvailableDomains(): ServiceDomain[] {
    return this.factory.getAvailableDomains();
  }

  /**
   * Invalidate global summary cache.
   */
  invalidateCache(): void {
    const cacheKey = CacheService.generateKey('metrics', 'global', 'summary');
    this.cacheService.del(cacheKey);
    this.logger.debug('Invalidated global summary cache');
  }

  /**
   * Invalidate all aggregation caches (global + all domains).
   */
  invalidateAllCaches(): void {
    this.invalidateCache();
    this.domainService.invalidateCache();
    this.logger.debug('Invalidated all aggregation caches');
  }
}
