import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { QueryDto } from './dto/query.dto';
import { Public } from '../admin/auth/decorators/public.decorator';

@ApiTags('metrics')
@Controller('projects/:projectId/api')
@Public() // Phase 1: Keep metrics API public for backward compatibility
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  // ==================== BigQuery-specific admin functions ====================

  /**
   * POST /projects/:projectId/api/query
   * Execute a custom BigQuery SQL query
   */
  @ApiOperation({ summary: 'Execute custom SQL query' })
  @ApiResponse({ status: 200, description: 'Query executed successfully' })
  @Post('query')
  async executeQuery(
    @Param('projectId') projectId: string,
    @Body() queryDto: QueryDto,
  ) {
    const results = await this.metricsService.executeQuery(queryDto);
    return {
      success: true,
      rowCount: results.length,
      data: results,
    };
  }

  /**
   * GET /projects/:projectId/api/datasets
   * Get list of available datasets
   */
  @ApiOperation({ summary: 'List all datasets' })
  @ApiResponse({ status: 200, description: 'List of datasets returned' })
  @Get('datasets')
  async getDatasets() {
    const datasets = await this.metricsService.getDatasets();
    return {
      success: true,
      datasets,
    };
  }

  /**
   * GET /projects/:projectId/api/tables/:datasetId
   * Get tables in a specific dataset
   */
  @ApiOperation({ summary: 'List tables in a dataset' })
  @ApiResponse({ status: 200, description: 'List of tables returned' })
  @Get('tables/:datasetId')
  async getTables(@Param('datasetId') datasetId: string) {
    const tables = await this.metricsService.getTables(datasetId);
    return {
      success: true,
      datasetId,
      tables,
    };
  }

  /**
   * GET /projects/:projectId/api/logs
   * Get sample logs from the configured dataset
   */
  @ApiOperation({ summary: 'Get sample logs' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Limit number of logs (default: 100)',
  })
  @ApiResponse({ status: 200, description: 'Sample logs returned' })
  @Get('logs')
  async getSampleLogs(
    @Param('projectId') projectId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 100;
    const logs = await this.metricsService.getSampleLogs(projectId, limitNum);
    return {
      success: true,
      count: logs.length,
      data: logs,
    };
  }

  // ==================== 메트릭 API (캐싱 적용) ====================

  /**
   * GET /projects/:projectId/api/metrics/realtime
   * 실시간 KPI 메트릭 (최근 24시간)
   */
  @ApiOperation({ summary: 'Get realtime KPI metrics (last 24h)' })
  @ApiResponse({ status: 200, description: 'Realtime KPI data returned' })
  @Get('metrics/realtime')
  async getRealtimeKPI() {
    const data = await this.metricsService.getRealtimeKPI();
    return {
      success: true,
      data,
      cached: true,
      cacheTTL: '5 minutes',
    };
  }

  /**
   * GET /projects/:projectId/api/metrics/hourly
   * 시간별 트래픽 (최근 24시간)
   */
  @ApiOperation({ summary: 'Get hourly traffic data (last 24h)' })
  @ApiResponse({ status: 200, description: 'Hourly traffic data returned' })
  @Get('metrics/hourly')
  async getHourlyTraffic() {
    const data = await this.metricsService.getHourlyTraffic();
    return {
      success: true,
      count: data.length,
      data,
      cached: true,
      cacheTTL: '15 minutes',
    };
  }

  /**
   * GET /projects/:projectId/api/metrics/daily
   * 일별 트래픽 (최근 30일)
   */
  @ApiOperation({ summary: 'Get daily traffic data (last 30 days)' })
  @ApiResponse({ status: 200, description: 'Daily traffic data returned' })
  @Get('metrics/daily')
  async getDailyTraffic() {
    const data = await this.metricsService.getDailyTraffic();
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
   * GET /projects/:projectId/api/analytics/tenant-usage
   * 테넌트별 사용량
   */
  @ApiOperation({ summary: 'Get tenant usage analytics' })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days (default: 7)',
  })
  @ApiResponse({ status: 200, description: 'Tenant usage data returned' })
  @Get('analytics/tenant-usage')
  async getTenantUsage(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 7;
    const data = await this.metricsService.getTenantUsage(daysNum);
    return {
      success: true,
      count: data.length,
      data,
      cached: true,
      cacheTTL: '15 minutes',
    };
  }

  /**
   * GET /projects/:projectId/api/analytics/heatmap
   * 사용량 히트맵 (요일 x 시간)
   */
  @ApiOperation({ summary: 'Get usage heatmap (day of week x hour)' })
  @ApiResponse({ status: 200, description: 'Heatmap data returned' })
  @Get('analytics/heatmap')
  async getUsageHeatmap() {
    const data = await this.metricsService.getUsageHeatmap();
    return {
      success: true,
      count: data.length,
      data,
      cached: true,
      cacheTTL: '15 minutes',
    };
  }

  /**
   * GET /projects/:projectId/api/analytics/cost-trend
   * 비용 트렌드 (일별)
   */
  @ApiOperation({ summary: 'Get daily cost trend' })
  @ApiResponse({ status: 200, description: 'Cost trend data returned' })
  @Get('analytics/cost-trend')
  async getCostTrend() {
    const data = await this.metricsService.getCostTrend();
    return {
      success: true,
      count: data.length,
      data,
      cached: true,
      cacheTTL: '15 minutes',
    };
  }

  /**
   * GET /projects/:projectId/api/analytics/errors
   * 에러 분석
   */
  @ApiOperation({ summary: 'Get error analysis' })
  @ApiResponse({ status: 200, description: 'Error analysis data returned' })
  @Get('analytics/errors')
  async getErrorAnalysis() {
    const data = await this.metricsService.getErrorAnalysis();
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
   * GET /projects/:projectId/api/ai/token-efficiency
   * 토큰 효율성 분석
   */
  @ApiOperation({ summary: 'Get token efficiency analysis' })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days (default: 7)',
  })
  @ApiResponse({ status: 200, description: 'Token efficiency data returned' })
  @Get('ai/token-efficiency')
  async getTokenEfficiency(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 7;
    const data = await this.metricsService.getTokenEfficiency(daysNum);
    return {
      success: true,
      count: data.length,
      data,
      cached: true,
      cacheTTL: '15 minutes',
    };
  }

  /**
   * GET /projects/:projectId/api/ai/anomaly-stats
   * 이상 탐지용 통계
   */
  @ApiOperation({ summary: 'Get anomaly detection statistics' })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days (default: 30)',
  })
  @ApiResponse({ status: 200, description: 'Anomaly stats returned' })
  @Get('ai/anomaly-stats')
  async getAnomalyStats(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 30;
    const data = await this.metricsService.getAnomalyStats(daysNum);
    return {
      success: true,
      count: data.length,
      data,
      cached: true,
      cacheTTL: '5 minutes',
    };
  }

  /**
   * GET /projects/:projectId/api/ai/query-patterns
   * 사용자 질의 패턴
   */
  @ApiOperation({ summary: 'Get user query patterns' })
  @ApiResponse({ status: 200, description: 'Query pattern data returned' })
  @Get('ai/query-patterns')
  async getQueryPatterns() {
    const data = await this.metricsService.getQueryPatterns();
    return {
      success: true,
      count: data.length,
      data,
      cached: true,
      cacheTTL: '15 minutes',
    };
  }

  // ==================== 품질 분석 API ====================

  /**
   * GET /projects/:projectId/api/quality/efficiency-trend
   * 일별 토큰 효율성 트렌드 (최근 30일)
   */
  @ApiOperation({ summary: 'Get daily token efficiency trend' })
  @ApiResponse({
    status: 200,
    description: 'Token efficiency trend data returned',
  })
  @Get('quality/efficiency-trend')
  async getTokenEfficiencyTrend() {
    const data = await this.metricsService.getTokenEfficiencyTrend();
    return {
      success: true,
      count: data.length,
      data,
      cached: true,
      cacheTTL: '15 minutes',
    };
  }

  /**
   * GET /projects/:projectId/api/quality/query-response-correlation
   * 질문-응답 길이 상관관계
   */
  @ApiOperation({ summary: 'Get query-response length correlation' })
  @ApiResponse({ status: 200, description: 'Correlation data returned' })
  @Get('quality/query-response-correlation')
  async getQueryResponseCorrelation() {
    const data = await this.metricsService.getQueryResponseCorrelation();
    return {
      success: true,
      count: data.length,
      data,
      cached: true,
      cacheTTL: '15 minutes',
    };
  }

  /**
   * GET /projects/:projectId/api/quality/repeated-patterns
   * 반복 질문 패턴 (FAQ 후보)
   */
  @ApiOperation({ summary: 'Get repeated query patterns (FAQ candidates)' })
  @ApiResponse({ status: 200, description: 'Repeated pattern data returned' })
  @Get('quality/repeated-patterns')
  async getRepeatedQueryPatterns() {
    const data = await this.metricsService.getRepeatedQueryPatterns();
    return {
      success: true,
      count: data.length,
      data,
      cached: true,
      cacheTTL: '15 minutes',
    };
  }

  // ==================== 챗봇 품질 분석 API ====================

  /**
   * GET /projects/:projectId/api/quality/emerging-patterns
   * 신규/급증 질문 패턴
   */
  @ApiOperation({ summary: 'Get emerging/new query patterns' })
  @ApiQuery({
    name: 'recentDays',
    required: false,
    description: 'Recent days to analyze (default: 7)',
  })
  @ApiQuery({
    name: 'historicalDays',
    required: false,
    description: 'Historical days to compare (default: 90)',
  })
  @ApiResponse({ status: 200, description: 'Emerging patterns returned' })
  @Get('quality/emerging-patterns')
  async getEmergingQueryPatterns(
    @Query('recentDays') recentDays?: string,
    @Query('historicalDays') historicalDays?: string,
  ) {
    const recent = recentDays ? parseInt(recentDays, 10) : 7;
    const historical = historicalDays ? parseInt(historicalDays, 10) : 90;
    const data = await this.metricsService.getEmergingQueryPatterns(
      recent,
      historical,
    );
    return {
      success: true,
      count: data.length,
      data,
      cached: true,
      cacheTTL: '15 minutes',
    };
  }

  /**
   * GET /projects/:projectId/api/quality/sentiment
   * 감정/불만 분석
   */
  @ApiOperation({
    summary: 'Get sentiment analysis (frustrated/emotional queries)',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days (default: 7)',
  })
  @ApiResponse({ status: 200, description: 'Sentiment analysis data returned' })
  @Get('quality/sentiment')
  async getSentimentAnalysis(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 7;
    const data = await this.metricsService.getSentimentAnalysis(daysNum);
    return {
      success: true,
      count: data.length,
      data,
      cached: true,
      cacheTTL: '5 minutes',
    };
  }

  /**
   * GET /projects/:projectId/api/quality/rephrased-queries
   * 재질문 패턴 (세션 내 유사 질문 반복)
   */
  @ApiOperation({
    summary: 'Get rephrased query patterns (dissatisfaction signal)',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days (default: 7)',
  })
  @ApiResponse({
    status: 200,
    description: 'Rephrased query patterns returned',
  })
  @Get('quality/rephrased-queries')
  async getRephrasedQueryPatterns(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 7;
    const data = await this.metricsService.getRephrasedQueryPatterns(daysNum);
    return {
      success: true,
      count: data.length,
      data,
      cached: true,
      cacheTTL: '15 minutes',
    };
  }

  /**
   * GET /projects/:projectId/api/quality/sessions
   * 세션별 대화 분석
   */
  @ApiOperation({ summary: 'Get session-level analytics' })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days (default: 7)',
  })
  @ApiResponse({ status: 200, description: 'Session analytics returned' })
  @Get('quality/sessions')
  async getSessionAnalytics(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 7;
    const data = await this.metricsService.getSessionAnalytics(daysNum);
    return {
      success: true,
      count: data.length,
      data,
      cached: true,
      cacheTTL: '15 minutes',
    };
  }

  /**
   * GET /projects/:projectId/api/quality/tenant-summary
   * 테넌트별 품질 요약
   */
  @ApiOperation({
    summary: 'Get tenant quality summary (including frustration rate)',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days (default: 7)',
  })
  @ApiResponse({ status: 200, description: 'Tenant quality summary returned' })
  @Get('quality/tenant-summary')
  async getTenantQualitySummary(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 7;
    const data = await this.metricsService.getTenantQualitySummary(daysNum);
    return {
      success: true,
      count: data.length,
      data,
      cached: true,
      cacheTTL: '15 minutes',
    };
  }

  /**
   * GET /projects/:projectId/api/quality/response-metrics
   * 응답 품질 지표
   */
  @ApiOperation({
    summary: 'Get response quality metrics (length distribution)',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days (default: 30)',
  })
  @ApiResponse({
    status: 200,
    description: 'Response quality metrics returned',
  })
  @Get('quality/response-metrics')
  async getResponseQualityMetrics(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 30;
    const data = await this.metricsService.getResponseQualityMetrics(daysNum);
    return {
      success: true,
      count: data.length,
      data,
      cached: true,
      cacheTTL: '15 minutes',
    };
  }

  // ==================== 유저 분석 API ====================

  /**
   * GET /projects/:projectId/api/analytics/user-requests
   * 유저별 요청 수
   */
  @ApiOperation({ summary: 'Get user request counts (by x_enc_data)' })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days (default: 7)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Max users to return (default: 50)',
  })
  @ApiResponse({ status: 200, description: 'User request count data returned' })
  @Get('analytics/user-requests')
  async getUserRequestCounts(
    @Query('days') days?: string,
    @Query('limit') limit?: string,
  ) {
    const daysNum = days ? parseInt(days, 10) : 7;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const data = await this.metricsService.getUserRequestCounts(
      daysNum,
      limitNum,
    );
    return {
      success: true,
      count: data.length,
      data,
      cached: true,
      cacheTTL: '15 minutes',
    };
  }

  /**
   * GET /projects/:projectId/api/analytics/user-tokens
   * 유저별 토큰 사용량
   */
  @ApiOperation({ summary: 'Get user token usage (by x_enc_data)' })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days (default: 7)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Max users to return (default: 50)',
  })
  @ApiResponse({ status: 200, description: 'User token usage data returned' })
  @Get('analytics/user-tokens')
  async getUserTokenUsage(
    @Query('days') days?: string,
    @Query('limit') limit?: string,
  ) {
    const daysNum = days ? parseInt(days, 10) : 7;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const data = await this.metricsService.getUserTokenUsage(daysNum, limitNum);
    return {
      success: true,
      count: data.length,
      data,
      cached: true,
      cacheTTL: '15 minutes',
    };
  }

  /**
   * GET /projects/:projectId/api/analytics/user-patterns
   * 유저별 자주 묻는 질문 패턴
   */
  @ApiOperation({ summary: 'Get user question patterns (by x_enc_data)' })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user ID (x_enc_data)',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days (default: 7)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Max patterns to return (default: 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'User question pattern data returned',
  })
  @Get('analytics/user-patterns')
  async getUserQuestionPatterns(
    @Query('userId') userId?: string,
    @Query('days') days?: string,
    @Query('limit') limit?: string,
  ) {
    const daysNum = days ? parseInt(days, 10) : 7;
    const limitNum = limit ? parseInt(limit, 10) : 100;
    const data = await this.metricsService.getUserQuestionPatterns(
      userId,
      daysNum,
      limitNum,
    );
    return {
      success: true,
      count: data.length,
      data,
      cached: true,
      cacheTTL: '15 minutes',
    };
  }

  /**
   * GET /projects/:projectId/api/analytics/user-list
   * 유저 목록 (통합 통계)
   */
  @ApiOperation({ summary: 'Get user list with aggregated statistics' })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days (default: 7)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Max users to return (default: 1000)',
  })
  @ApiResponse({ status: 200, description: 'User list data returned' })
  @Get('analytics/user-list')
  async getUserList(
    @Query('days') days?: string,
    @Query('limit') limit?: string,
  ) {
    const daysNum = days ? parseInt(days, 10) : 7;
    const limitNum = limit ? parseInt(limit, 10) : 1000;
    const data = await this.metricsService.getUserList(daysNum, limitNum);
    return {
      success: true,
      count: data.length,
      data,
      cached: true,
      cacheTTL: '15 minutes',
    };
  }

  /**
   * GET /projects/:projectId/api/analytics/user-activity/:userId
   * 유저 활동 상세
   */
  @ApiOperation({ summary: 'Get user activity details (conversation history)' })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days (default: 7)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Max records to return (default: 20)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Offset for pagination (default: 0)',
  })
  @ApiResponse({ status: 200, description: 'User activity data returned' })
  @Get('analytics/user-activity/:userId')
  async getUserActivityDetail(
    @Param('userId') userId: string,
    @Query('days') days?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const daysNum = days ? parseInt(days, 10) : 7;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    const data = await this.metricsService.getUserActivityDetail(
      userId,
      daysNum,
      limitNum,
      offsetNum,
    );
    return {
      success: true,
      count: data.length,
      data,
      cached: true,
      cacheTTL: '5 minutes',
    };
  }

  // ==================== 캐시 관리 API ====================

  /**
   * GET /projects/:projectId/api/cache/stats
   * 캐시 통계 조회
   */
  @ApiOperation({ summary: 'Get cache statistics' })
  @ApiResponse({ status: 200, description: 'Cache stats returned' })
  @Get('cache/stats')
  getCacheStats() {
    const stats = this.metricsService.getCacheStats();
    return {
      success: true,
      ...stats,
    };
  }

  /**
   * DELETE /projects/:projectId/api/cache
   * 캐시 초기화
   */
  @ApiOperation({ summary: 'Flush all cache' })
  @ApiResponse({ status: 200, description: 'Cache flushed' })
  @Delete('cache')
  flushCache() {
    return this.metricsService.flushCache();
  }
}
