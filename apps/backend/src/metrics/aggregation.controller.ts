import { Controller, Get, Param, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { DomainMetricsService } from './domain-metrics.service';
import { GlobalMetricsService } from './global-metrics.service';
import { Public } from '../admin/auth/decorators/public.decorator';
import { ServiceDomain } from '../datasource/interfaces';

/**
 * Controller for aggregated metrics across domains and projects.
 * Provides domain-level and global-level summary endpoints.
 */
@ApiTags('aggregation')
@Controller('api/metrics')
@Public() // Keep aggregation API public for dashboard access
export class AggregationController {
  constructor(
    private readonly domainMetricsService: DomainMetricsService,
    private readonly globalMetricsService: GlobalMetricsService,
  ) {}

  // ==================== 도메인 집계 API ====================

  /**
   * GET /api/metrics/domain/:domain/summary
   * 도메인별 종합 KPI
   */
  @ApiOperation({ summary: 'Get domain-level aggregated KPI summary' })
  @ApiParam({
    name: 'domain',
    enum: ['chatbot', 'report', 'analytics'],
    description: 'Service domain to aggregate',
  })
  @ApiResponse({
    status: 200,
    description: 'Domain summary KPI returned',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid domain specified',
  })
  @Get('domain/:domain/summary')
  async getDomainSummary(@Param('domain') domain: string) {
    // Validate domain
    const validDomains: ServiceDomain[] = ['chatbot', 'report', 'analytics'];
    if (!validDomains.includes(domain as ServiceDomain)) {
      throw new BadRequestException(
        `Invalid domain: ${domain}. Valid domains: ${validDomains.join(', ')}`,
      );
    }

    const data = await this.domainMetricsService.getDomainSummary(
      domain as ServiceDomain,
    );

    return {
      success: true,
      data,
      cached: true,
      cacheTTL: '15 minutes',
    };
  }

  // ==================== 글로벌 집계 API ====================

  /**
   * GET /api/metrics/global/summary
   * 전체 종합 KPI (모든 프로젝트, 모든 도메인)
   */
  @ApiOperation({ summary: 'Get global aggregated KPI summary' })
  @ApiResponse({
    status: 200,
    description: 'Global summary KPI returned',
  })
  @Get('global/summary')
  async getGlobalSummary() {
    const data = await this.globalMetricsService.getGlobalSummary();

    return {
      success: true,
      data,
      cached: true,
      cacheTTL: '15 minutes',
    };
  }

  // ==================== 메타데이터 API ====================

  /**
   * GET /api/metrics/domains
   * 사용 가능한 도메인 목록
   */
  @ApiOperation({ summary: 'Get list of available service domains' })
  @ApiResponse({
    status: 200,
    description: 'Available domains list returned',
  })
  @Get('domains')
  getAvailableDomains() {
    const domains = this.globalMetricsService.getAvailableDomains();

    return {
      success: true,
      data: domains,
      count: domains.length,
    };
  }
}
