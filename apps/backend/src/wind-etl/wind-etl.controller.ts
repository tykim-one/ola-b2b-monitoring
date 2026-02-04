import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Public } from '../admin/auth/decorators/public.decorator';
import { WindETLService } from './wind-etl.service';

/**
 * Wind ETL 모니터링 Controller
 *
 * PostgreSQL (ops.cn_wind_etl_runs) 기반 파일 처리 ETL 모니터링 API
 * 인증 없이 접근 가능 (운영 모니터링 용도)
 */
@ApiTags('Wind ETL')
@Controller('api/wind-etl')
@Public()
export class WindETLController {
  constructor(private readonly windETLService: WindETLService) {}

  // ==================== 헬스 체크 ====================

  @Get('health')
  @ApiOperation({ summary: 'PostgreSQL 연결 상태 확인' })
  @ApiResponse({ status: 200, description: '연결 상태 반환' })
  async healthCheck() {
    const healthy = await this.windETLService.isHealthy();
    return {
      success: true,
      healthy,
      datasource: 'PostgreSQL',
      table: 'ops.cn_wind_etl_runs',
    };
  }

  // ==================== 실행 목록 ====================

  @Get('runs')
  @ApiOperation({ summary: '최근 ETL 실행 목록 조회' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '조회할 레코드 수 (기본값: 50)',
  })
  @ApiResponse({ status: 200, description: '실행 목록 반환' })
  async getRecentRuns(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const data = await this.windETLService.getRecentRuns(limitNum);
    return {
      success: true,
      count: data.length,
      data,
      cached: true,
      cacheTTL: '5 minutes',
    };
  }

  // ==================== 요약 ====================

  @Get('summary')
  @ApiOperation({ summary: 'ETL 실행 현황 요약' })
  @ApiQuery({
    name: 'days',
    required: false,
    description: '조회 기간 (일, 기본값: 7)',
  })
  @ApiResponse({ status: 200, description: '요약 통계 반환' })
  async getSummary(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 7;
    const data = await this.windETLService.getSummary(daysNum);
    return {
      success: true,
      data,
      cached: true,
      cacheTTL: '5 minutes',
    };
  }

  // ==================== 트렌드 ====================

  @Get('trend/daily')
  @ApiOperation({ summary: '일별 ETL 실행 트렌드' })
  @ApiQuery({
    name: 'days',
    required: false,
    description: '조회 기간 (일, 기본값: 30)',
  })
  @ApiResponse({ status: 200, description: '일별 트렌드 반환' })
  async getDailyTrend(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 30;
    const data = await this.windETLService.getDailyTrend(daysNum);
    return {
      success: true,
      count: data.length,
      data,
      cached: true,
      cacheTTL: '15 minutes',
    };
  }

  @Get('trend/hourly')
  @ApiOperation({ summary: '시간별 ETL 실행 트렌드' })
  @ApiQuery({
    name: 'hours',
    required: false,
    description: '조회 기간 (시간, 기본값: 24)',
  })
  @ApiResponse({ status: 200, description: '시간별 트렌드 반환' })
  async getHourlyTrend(@Query('hours') hours?: string) {
    const hoursNum = hours ? parseInt(hours, 10) : 24;
    const data = await this.windETLService.getHourlyTrend(hoursNum);
    return {
      success: true,
      count: data.length,
      data,
      cached: true,
      cacheTTL: '5 minutes',
    };
  }

  // ==================== 에러 분석 ====================

  @Get('errors')
  @ApiOperation({ summary: 'ETL 에러 분석' })
  @ApiQuery({
    name: 'days',
    required: false,
    description: '조회 기간 (일, 기본값: 7)',
  })
  @ApiResponse({ status: 200, description: '에러 분석 결과 반환' })
  async getErrorAnalysis(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 7;
    const data = await this.windETLService.getErrorAnalysis(daysNum);
    return {
      success: true,
      count: data.length,
      data,
      cached: true,
      cacheTTL: '5 minutes',
    };
  }

  // ==================== 통계 ====================

  @Get('stats/files')
  @ApiOperation({ summary: '파일 처리 통계 (일별)' })
  @ApiQuery({
    name: 'days',
    required: false,
    description: '조회 기간 (일, 기본값: 30)',
  })
  @ApiResponse({ status: 200, description: '파일 처리 통계 반환' })
  async getFileProcessingStats(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 30;
    const data = await this.windETLService.getFileProcessingStats(daysNum);
    return {
      success: true,
      count: data.length,
      data,
      cached: true,
      cacheTTL: '15 minutes',
    };
  }

  @Get('stats/records')
  @ApiOperation({ summary: '레코드 처리 통계 (일별)' })
  @ApiQuery({
    name: 'days',
    required: false,
    description: '조회 기간 (일, 기본값: 30)',
  })
  @ApiResponse({ status: 200, description: '레코드 처리 통계 반환' })
  async getRecordStats(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 30;
    const data = await this.windETLService.getRecordStats(daysNum);
    return {
      success: true,
      count: data.length,
      data,
      cached: true,
      cacheTTL: '15 minutes',
    };
  }
}
