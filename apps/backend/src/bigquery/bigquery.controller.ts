import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { BigQueryService } from './bigquery.service';
import { QueryDto } from './dto/query.dto';

@ApiTags('bigquery')
@Controller('projects/:projectId/bigquery')
export class BigQueryController {
  constructor(private readonly bigQueryService: BigQueryService) {}

  // ==================== 기존 API ====================

  /**
   * POST /projects/:projectId/bigquery/query
   * Execute a custom BigQuery SQL query
   */
  @ApiOperation({ summary: 'Execute custom SQL query' })
  @ApiResponse({ status: 200, description: 'Query executed successfully' })
  @Post('query')
  async executeQuery(@Param('projectId') projectId: string, @Body() queryDto: QueryDto) {
    const results = await this.bigQueryService.executeQuery(queryDto);
    return {
      success: true,
      rowCount: results.length,
      data: results,
    };
  }

  /**
   * GET /projects/:projectId/bigquery/datasets
   * Get list of available datasets
   */
  @ApiOperation({ summary: 'List all datasets' })
  @ApiResponse({ status: 200, description: 'List of datasets returned' })
  @Get('datasets')
  async getDatasets() {
    const datasets = await this.bigQueryService.getDatasets();
    return {
      success: true,
      datasets,
    };
  }

  /**
   * GET /projects/:projectId/bigquery/tables/:datasetId
   * Get tables in a specific dataset
   */
  @ApiOperation({ summary: 'List tables in a dataset' })
  @ApiResponse({ status: 200, description: 'List of tables returned' })
  @Get('tables/:datasetId')
  async getTables(@Param('datasetId') datasetId: string) {
    const tables = await this.bigQueryService.getTables(datasetId);
    return {
      success: true,
      datasetId,
      tables,
    };
  }

  /**
   * GET /projects/:projectId/bigquery/logs
   * Get sample logs from the configured dataset
   */
  @ApiOperation({ summary: 'Get sample logs' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit number of logs (default: 100)' })
  @ApiResponse({ status: 200, description: 'Sample logs returned' })
  @Get('logs')
  async getSampleLogs(@Param('projectId') projectId: string, @Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 100;
    const logs = await this.bigQueryService.getSampleLogs(projectId, limitNum);
    return {
      success: true,
      count: logs.length,
      data: logs,
    };
  }

  // ==================== 메트릭 API (캐싱 적용) ====================

  /**
   * GET /projects/:projectId/bigquery/metrics/realtime
   * 실시간 KPI 메트릭 (최근 24시간)
   */
  @ApiOperation({ summary: 'Get realtime KPI metrics (last 24h)' })
  @ApiResponse({ status: 200, description: 'Realtime KPI data returned' })
  @Get('metrics/realtime')
  async getRealtimeKPI() {
    const data = await this.bigQueryService.getRealtimeKPI();
    return {
      success: true,
      data,
      cached: true,
      cacheTTL: '5 minutes',
    };
  }

  /**
   * GET /projects/:projectId/bigquery/metrics/hourly
   * 시간별 트래픽 (최근 24시간)
   */
  @ApiOperation({ summary: 'Get hourly traffic data (last 24h)' })
  @ApiResponse({ status: 200, description: 'Hourly traffic data returned' })
  @Get('metrics/hourly')
  async getHourlyTraffic() {
    const data = await this.bigQueryService.getHourlyTraffic();
    return {
      success: true,
      count: data.length,
      data,
      cached: true,
      cacheTTL: '15 minutes',
    };
  }

  /**
   * GET /projects/:projectId/bigquery/metrics/daily
   * 일별 트래픽 (최근 30일)
   */
  @ApiOperation({ summary: 'Get daily traffic data (last 30 days)' })
  @ApiResponse({ status: 200, description: 'Daily traffic data returned' })
  @Get('metrics/daily')
  async getDailyTraffic() {
    const data = await this.bigQueryService.getDailyTraffic();
    return {
      success: true,
      count: data.length,
      data,
      cached: true,
      cacheTTL: '15 minutes',
    };
  }

  // ==================== 분석 API ====================

  /**
   * GET /projects/:projectId/bigquery/analytics/tenant-usage
   * 테넌트별 사용량
   */
  @ApiOperation({ summary: 'Get tenant usage analytics' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days (default: 7)' })
  @ApiResponse({ status: 200, description: 'Tenant usage data returned' })
  @Get('analytics/tenant-usage')
  async getTenantUsage(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 7;
    const data = await this.bigQueryService.getTenantUsage(daysNum);
    return {
      success: true,
      count: data.length,
      data,
      cached: true,
      cacheTTL: '15 minutes',
    };
  }

  /**
   * GET /projects/:projectId/bigquery/analytics/heatmap
   * 사용량 히트맵 (요일 x 시간)
   */
  @ApiOperation({ summary: 'Get usage heatmap (day of week x hour)' })
  @ApiResponse({ status: 200, description: 'Heatmap data returned' })
  @Get('analytics/heatmap')
  async getUsageHeatmap() {
    const data = await this.bigQueryService.getUsageHeatmap();
    return {
      success: true,
      count: data.length,
      data,
      cached: true,
      cacheTTL: '15 minutes',
    };
  }

  /**
   * GET /projects/:projectId/bigquery/analytics/cost-trend
   * 비용 트렌드 (일별)
   */
  @ApiOperation({ summary: 'Get daily cost trend' })
  @ApiResponse({ status: 200, description: 'Cost trend data returned' })
  @Get('analytics/cost-trend')
  async getCostTrend() {
    const data = await this.bigQueryService.getCostTrend();
    return {
      success: true,
      count: data.length,
      data,
      cached: true,
      cacheTTL: '15 minutes',
    };
  }

  /**
   * GET /projects/:projectId/bigquery/analytics/errors
   * 에러 분석
   */
  @ApiOperation({ summary: 'Get error analysis' })
  @ApiResponse({ status: 200, description: 'Error analysis data returned' })
  @Get('analytics/errors')
  async getErrorAnalysis() {
    const data = await this.bigQueryService.getErrorAnalysis();
    return {
      success: true,
      count: data.length,
      data,
      cached: true,
      cacheTTL: '5 minutes',
    };
  }

  // ==================== AI 분석 API ====================

  /**
   * GET /projects/:projectId/bigquery/ai/token-efficiency
   * 토큰 효율성 분석
   */
  @ApiOperation({ summary: 'Get token efficiency analysis' })
  @ApiResponse({ status: 200, description: 'Token efficiency data returned' })
  @Get('ai/token-efficiency')
  async getTokenEfficiency() {
    const data = await this.bigQueryService.getTokenEfficiency();
    return {
      success: true,
      count: data.length,
      data,
      cached: true,
      cacheTTL: '15 minutes',
    };
  }

  /**
   * GET /projects/:projectId/bigquery/ai/anomaly-stats
   * 이상 탐지용 통계
   */
  @ApiOperation({ summary: 'Get anomaly detection statistics' })
  @ApiResponse({ status: 200, description: 'Anomaly stats returned' })
  @Get('ai/anomaly-stats')
  async getAnomalyStats() {
    const data = await this.bigQueryService.getAnomalyStats();
    return {
      success: true,
      count: data.length,
      data,
      cached: true,
      cacheTTL: '5 minutes',
    };
  }

  /**
   * GET /projects/:projectId/bigquery/ai/query-patterns
   * 사용자 질의 패턴
   */
  @ApiOperation({ summary: 'Get user query patterns' })
  @ApiResponse({ status: 200, description: 'Query pattern data returned' })
  @Get('ai/query-patterns')
  async getQueryPatterns() {
    const data = await this.bigQueryService.getQueryPatterns();
    return {
      success: true,
      count: data.length,
      data,
      cached: true,
      cacheTTL: '15 minutes',
    };
  }

  // ==================== 캐시 관리 API ====================

  /**
   * GET /projects/:projectId/bigquery/cache/stats
   * 캐시 통계 조회
   */
  @ApiOperation({ summary: 'Get cache statistics' })
  @ApiResponse({ status: 200, description: 'Cache stats returned' })
  @Get('cache/stats')
  getCacheStats() {
    const stats = this.bigQueryService.getCacheStats();
    return {
      success: true,
      ...stats,
    };
  }

  /**
   * DELETE /projects/:projectId/bigquery/cache
   * 캐시 초기화
   */
  @ApiOperation({ summary: 'Flush all cache' })
  @ApiResponse({ status: 200, description: 'Cache flushed' })
  @Delete('cache')
  flushCache() {
    return this.bigQueryService.flushCache();
  }
}
