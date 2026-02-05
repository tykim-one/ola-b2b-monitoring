import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CacheService, CacheTTL } from '../cache/cache.service';

/**
 * Service Health Data Interface
 */
export interface ServiceHealthData {
  serviceId: string;
  status: 'healthy' | 'warning' | 'error';
  statusReason?: string;
  lastChecked: string; // ISO 8601
  kpis: Record<string, number | string>;
  chartData: Array<{ timestamp: string; value: number }>;
}

/**
 * Service Health Service
 * Provides health check and KPI data for monitored services
 */
@Injectable()
export class ServiceHealthService {
  private readonly logger = new Logger(ServiceHealthService.name);

  constructor(private cacheService: CacheService) {}

  /**
   * Get health status and KPIs for a specific service
   */
  async getServiceHealth(serviceId: string): Promise<ServiceHealthData> {
    const cacheKey = CacheService.generateKey('service', 'health', serviceId);

    return this.cacheService.getOrSet(
      cacheKey,
      async () => this.fetchServiceHealthData(serviceId),
      CacheTTL.SHORT,
    );
  }

  /**
   * Fetch service health data (currently returns mock data)
   * TODO: Replace with actual data source connections
   */
  private async fetchServiceHealthData(
    serviceId: string,
  ): Promise<ServiceHealthData> {
    this.logger.log(`Fetching health data for service: ${serviceId}`);

    switch (serviceId) {
      case 'ibk-chat':
        return this.getIbkChatHealth();
      case 'ibk':
        return this.getIbkHealth();
      case 'wind-etl':
        return this.getWindEtlHealth();
      case 'minkabu-etl':
        return this.getMinkabuEtlHealth();
      default:
        throw new NotFoundException(`Service not found: ${serviceId}`);
    }
  }

  /**
   * IBK Chat Service Health
   * Real-time chat service monitoring
   */
  private getIbkChatHealth(): ServiceHealthData {
    const now = new Date();
    const activeSessions = Math.floor(Math.random() * 50) + 100; // Mock: 100-150
    const resolutionRate = Math.floor(Math.random() * 10) + 85; // Mock: 85-95%
    const avgResponseTime = Math.floor(Math.random() * 500) + 800; // Mock: 800-1300ms

    // Generate 24-hour traffic chart data
    const chartData = Array.from({ length: 24 }, (_, i) => ({
      timestamp: new Date(now.getTime() - (23 - i) * 3600000).toISOString(),
      value: Math.floor(Math.random() * 300) + 500, // Mock: 500-800 requests/hour
    }));

    return {
      serviceId: 'ibk-chat',
      status: resolutionRate >= 90 ? 'healthy' : 'warning',
      statusReason:
        resolutionRate >= 90
          ? 'All systems operational'
          : 'Resolution rate below target',
      lastChecked: now.toISOString(),
      kpis: {
        activeSessions,
        resolutionRate: `${resolutionRate}%`,
        avgResponseTime: `${avgResponseTime}ms`,
      },
      chartData,
    };
  }

  /**
   * IBK Service Health
   * Batch processing service monitoring
   */
  private getIbkHealth(): ServiceHealthData {
    const now = new Date();
    const lastRunTime = new Date(now.getTime() - Math.random() * 3600000); // Last 1 hour
    const successRate = Math.floor(Math.random() * 5) + 95; // Mock: 95-100%
    const dataLoadStatus = successRate >= 98 ? 'completed' : 'partial';

    // Generate recent jobs list (last 10 jobs)
    const recentJobs = Array.from({ length: 10 }, (_, i) => ({
      timestamp: new Date(now.getTime() - i * 1800000).toISOString(), // Every 30 min
      value: Math.random() > 0.05 ? 1 : 0, // 95% success
    }));

    return {
      serviceId: 'ibk',
      status: successRate >= 95 ? 'healthy' : 'warning',
      statusReason:
        successRate >= 95
          ? 'Batch jobs running smoothly'
          : 'Some jobs failed',
      lastChecked: now.toISOString(),
      kpis: {
        lastRunTime: lastRunTime.toISOString(),
        successRate: `${successRate}%`,
        dataLoadStatus,
      },
      chartData: recentJobs,
    };
  }

  /**
   * Wind ETL Service Health
   * ETL pipeline monitoring
   */
  private getWindEtlHealth(): ServiceHealthData {
    const now = new Date();
    const processing = Math.floor(Math.random() * 10) + 5; // Mock: 5-15
    const queued = Math.floor(Math.random() * 20) + 10; // Mock: 10-30
    const successRate = Math.floor(Math.random() * 5) + 94; // Mock: 94-99%
    const totalJobs = 1000;
    const processedJobs = Math.floor(totalJobs * (successRate / 100));

    // Generate daily progress data (last 7 days)
    const dailyProgress = Array.from({ length: 7 }, (_, i) => ({
      timestamp: new Date(now.getTime() - (6 - i) * 86400000).toISOString(),
      value: Math.floor(Math.random() * 20) + 85, // Mock: 85-105% daily completion
    }));

    return {
      serviceId: 'wind-etl',
      status: queued < 50 && successRate >= 95 ? 'healthy' : 'warning',
      statusReason:
        queued < 50 && successRate >= 95
          ? 'ETL pipeline healthy'
          : queued >= 50
            ? 'High queue backlog'
            : 'Success rate below target',
      lastChecked: now.toISOString(),
      kpis: {
        processing,
        queued,
        successRate: `${successRate}%`,
        dailyProgress: `${processedJobs}/${totalJobs}`,
      },
      chartData: dailyProgress,
    };
  }

  /**
   * Minkabu ETL Service Health
   * ETL pipeline monitoring
   */
  private getMinkabuEtlHealth(): ServiceHealthData {
    const now = new Date();
    const processing = Math.floor(Math.random() * 8) + 3; // Mock: 3-11
    const queued = Math.floor(Math.random() * 15) + 5; // Mock: 5-20
    const successRate = Math.floor(Math.random() * 5) + 96; // Mock: 96-100%
    const totalJobs = 800;
    const processedJobs = Math.floor(totalJobs * (successRate / 100));

    // Generate daily progress data (last 7 days)
    const dailyProgress = Array.from({ length: 7 }, (_, i) => ({
      timestamp: new Date(now.getTime() - (6 - i) * 86400000).toISOString(),
      value: Math.floor(Math.random() * 15) + 90, // Mock: 90-105% daily completion
    }));

    return {
      serviceId: 'minkabu-etl',
      status: queued < 30 && successRate >= 95 ? 'healthy' : 'warning',
      statusReason:
        queued < 30 && successRate >= 95
          ? 'ETL pipeline healthy'
          : queued >= 30
            ? 'High queue backlog'
            : 'Success rate below target',
      lastChecked: now.toISOString(),
      kpis: {
        processing,
        queued,
        successRate: `${successRate}%`,
        dailyProgress: `${processedJobs}/${totalJobs}`,
      },
      chartData: dailyProgress,
    };
  }
}
