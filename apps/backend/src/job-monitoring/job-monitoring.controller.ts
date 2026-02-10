import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Public } from '../admin/auth/decorators/public.decorator';
import { JobMonitoringService } from './job-monitoring.service';

@ApiTags('Job Monitoring')
@Controller('api/job-monitoring')
@Public()
export class JobMonitoringController {
  constructor(private readonly jobMonitoringService: JobMonitoringService) {}

  @Get('health')
  @ApiOperation({ summary: 'BigQuery 연결 상태 확인' })
  @ApiResponse({ status: 200, description: '연결 상태 반환' })
  async healthCheck() {
    const healthy = await this.jobMonitoringService.isHealthy();
    return {
      success: true,
      healthy,
      datasource: 'BigQuery',
      view: 'v_job_execution_logs',
    };
  }

  @Get('logs')
  @ApiOperation({ summary: 'Job 실행 로그 목록 조회' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '조회할 레코드 수 (기본값: 100)',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: '조회 기간 (일, 기본값: 7)',
  })
  @ApiResponse({ status: 200, description: '로그 목록 반환' })
  async getLogs(@Query('limit') limit?: string, @Query('days') days?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 100;
    const daysNum = days ? parseInt(days, 10) : 7;
    const data = await this.jobMonitoringService.getLogs(limitNum, daysNum);
    return {
      success: true,
      count: data.length,
      data,
      cached: true,
      cacheTTL: '5 minutes',
    };
  }

  @Get('config-summary')
  @ApiOperation({ summary: 'config_name별 성공/실패 집계' })
  @ApiQuery({
    name: 'days',
    required: false,
    description: '조회 기간 (일, 기본값: 7)',
  })
  @ApiResponse({ status: 200, description: 'config별 집계 반환' })
  async getConfigSummary(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 7;
    const data = await this.jobMonitoringService.getConfigSummary(daysNum);
    return {
      success: true,
      count: data.length,
      data,
      cached: true,
      cacheTTL: '5 minutes',
    };
  }

  @Get('summary')
  @ApiOperation({ summary: '전체 Job 모니터링 KPI 요약' })
  @ApiQuery({
    name: 'days',
    required: false,
    description: '조회 기간 (일, 기본값: 7)',
  })
  @ApiResponse({ status: 200, description: '요약 통계 반환' })
  async getSummary(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 7;
    const data = await this.jobMonitoringService.getSummary(daysNum);
    return {
      success: true,
      data,
      cached: true,
      cacheTTL: '5 minutes',
    };
  }
}
