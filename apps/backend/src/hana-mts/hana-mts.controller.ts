import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Public } from '../admin/auth/decorators/public.decorator';
import { HanaMtsService } from './hana-mts.service';

@ApiTags('hana-mts')
@Controller('api/hana-mts')
export class HanaMtsController {
  constructor(private readonly hanaMtsService: HanaMtsService) {}

  // --- API Traffic ---

  @Public()
  @Get('api-traffic/kpi')
  @ApiOperation({ summary: 'API 트래픽 KPI 조회' })
  @ApiQuery({ name: 'date', required: false, description: 'YYYY-MM-DD (기본: 오늘 KST)' })
  async getApiTrafficKPI(@Query('date') date?: string) {
    return this.hanaMtsService.getApiTrafficKPI(date);
  }

  @Public()
  @Get('api-traffic/hourly')
  @ApiOperation({ summary: '시간별 API 트래픽 조회' })
  @ApiQuery({ name: 'date', required: false })
  async getHourlyApiTraffic(@Query('date') date?: string) {
    return this.hanaMtsService.getHourlyApiTraffic(date);
  }

  @Public()
  @Get('api-traffic/endpoints')
  @ApiOperation({ summary: '엔드포인트별 통계 조회' })
  @ApiQuery({ name: 'date', required: false })
  async getEndpointStats(@Query('date') date?: string) {
    return this.hanaMtsService.getEndpointStats(date);
  }

  @Public()
  @Get('api-traffic/slow-requests')
  @ApiOperation({ summary: '느린 요청 Top N 조회' })
  @ApiQuery({ name: 'date', required: false })
  @ApiQuery({ name: 'limit', required: false, description: '조회 건수 (기본: 20)' })
  async getSlowRequests(
    @Query('date') date?: string,
    @Query('limit') limit?: string,
  ) {
    return this.hanaMtsService.getSlowRequests(date, limit ? parseInt(limit, 10) : undefined);
  }

  @Public()
  @Get('api-traffic/errors')
  @ApiOperation({ summary: '에러 요청 목록 조회' })
  @ApiQuery({ name: 'date', required: false })
  @ApiQuery({ name: 'limit', required: false, description: '조회 건수 (기본: 50)' })
  async getApiErrors(
    @Query('date') date?: string,
    @Query('limit') limit?: string,
  ) {
    return this.hanaMtsService.getApiErrors(date, limit ? parseInt(limit, 10) : undefined);
  }

  // --- Batch Sync ---

  @Public()
  @Get('batch/summary')
  @ApiOperation({ summary: '배치 동기화 요약 조회' })
  @ApiQuery({ name: 'date', required: false })
  async getBatchSyncSummary(@Query('date') date?: string) {
    return this.hanaMtsService.getBatchSyncSummary(date);
  }

  @Public()
  @Get('batch/runs')
  @ApiOperation({ summary: '배치 실행 이력 조회' })
  @ApiQuery({ name: 'date', required: false })
  async getBatchSyncRuns(@Query('date') date?: string) {
    return this.hanaMtsService.getBatchSyncRuns(date);
  }

  @Public()
  @Get('batch/trend')
  @ApiOperation({ summary: '일별 배치 트렌드 조회' })
  @ApiQuery({ name: 'days', required: false, description: '조회 기간 일수 (기본: 14)' })
  async getDailyBatchTrend(@Query('days') days?: string) {
    return this.hanaMtsService.getDailyBatchTrend(days ? parseInt(days, 10) : undefined);
  }
}
