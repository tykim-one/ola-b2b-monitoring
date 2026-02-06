import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ServiceHealthService } from './service-health.service';
import { Public } from '../admin/auth/decorators/public.decorator';

@ApiTags('service-health')
@Controller('api/services')
@Public() // Keep service health API public for monitoring dashboards
export class ServiceHealthController {
  constructor(private readonly serviceHealthService: ServiceHealthService) {}

  /**
   * GET /api/services/:serviceId/health
   * Get health status and KPIs for a specific service
   */
  @ApiOperation({ summary: 'Get service health status and KPIs' })
  @ApiParam({
    name: 'serviceId',
    description:
      'Service identifier (e.g., ibk-chat, ibk, wind-etl, minkabu-etl)',
    example: 'ibk-chat',
  })
  @ApiResponse({
    status: 200,
    description: 'Service health data returned',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            serviceId: { type: 'string', example: 'ibk-chat' },
            status: {
              type: 'string',
              enum: ['healthy', 'warning', 'error'],
              example: 'healthy',
            },
            statusReason: {
              type: 'string',
              example: 'All systems operational',
            },
            lastChecked: { type: 'string', format: 'date-time' },
            kpis: {
              type: 'object',
              additionalProperties: true,
            },
            chartData: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  timestamp: { type: 'string' },
                  value: { type: 'number' },
                },
              },
            },
          },
        },
        cached: { type: 'boolean', example: true },
        cacheTTL: { type: 'string', example: '5 minutes' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Service not found',
  })
  @Get(':serviceId/health')
  async getServiceHealth(@Param('serviceId') serviceId: string) {
    const data = await this.serviceHealthService.getServiceHealth(serviceId);
    return {
      success: true,
      data,
      cached: true,
      cacheTTL: '5 minutes',
    };
  }
}
