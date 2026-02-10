import { Injectable, Logger } from '@nestjs/common';
import { JobMonitoringDataSource } from './job-monitoring.datasource';
import { CacheService, CacheTTL } from '../cache/cache.service';
import {
  JobExecutionLog,
  JobConfigSummary,
  JobMonitoringSummary,
} from './dto/job-monitoring.dto';

@Injectable()
export class JobMonitoringService {
  private readonly logger = new Logger(JobMonitoringService.name);

  constructor(
    private readonly dataSource: JobMonitoringDataSource,
    private readonly cacheService: CacheService,
  ) {}

  async isHealthy(): Promise<boolean> {
    return this.dataSource.isHealthy();
  }

  async getLogs(limit = 100, days = 7): Promise<JobExecutionLog[]> {
    const cacheKey = CacheService.generateKey(
      'job-monitoring',
      'logs',
      limit,
      days,
    );
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.dataSource.getLogs(limit, days),
      CacheTTL.SHORT,
    );
  }

  async getConfigSummary(days = 7): Promise<JobConfigSummary[]> {
    const cacheKey = CacheService.generateKey(
      'job-monitoring',
      'config-summary',
      days,
    );
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.dataSource.getConfigSummary(days),
      CacheTTL.SHORT,
    );
  }

  async getSummary(days = 7): Promise<JobMonitoringSummary> {
    const cacheKey = CacheService.generateKey(
      'job-monitoring',
      'summary',
      days,
    );
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.dataSource.getSummary(days),
      CacheTTL.SHORT,
    );
  }

  invalidateCache(): void {
    this.cacheService.delByPattern('job-monitoring:');
    this.logger.log('Job monitoring cache invalidated');
  }
}
