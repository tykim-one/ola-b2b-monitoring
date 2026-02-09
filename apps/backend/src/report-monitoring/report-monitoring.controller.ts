import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Public } from '../admin/auth/decorators/public.decorator';
import { ReportMonitoringService } from './report-monitoring.service';
import { ReportMonitoringScheduler } from './report-monitoring.scheduler';
import { UiCheckService } from './ui-check.service';
import { UiCheckScheduler } from './ui-check.scheduler';
import {
  ReportType,
  REPORT_TYPES,
  MonitoringResult,
  ReportCheckResult,
  UiMonitoringResult,
} from './interfaces';
import { MonitoringResultDto, ReportCheckResultDto } from './dto';

@ApiTags('Report Monitoring')
@Controller('api/report-monitoring')
@Public()
export class ReportMonitoringController {
  constructor(
    private readonly monitoringService: ReportMonitoringService,
    private readonly scheduler: ReportMonitoringScheduler,
    private readonly uiCheckService: UiCheckService,
    private readonly uiCheckScheduler: UiCheckScheduler,
  ) {}

  /**
   * 전체 리포트 체크 실행 (수동)
   */
  @Post('check')
  @ApiOperation({ summary: '전체 리포트 데이터 체크 실행' })
  @ApiResponse({
    status: 200,
    description: '체크 결과',
    type: MonitoringResultDto,
  })
  async runFullCheck(): Promise<MonitoringResult> {
    return this.monitoringService.runFullCheck();
  }

  /**
   * 특정 리포트 타입만 체크
   */
  @Post('check/:reportType')
  @ApiOperation({ summary: '특정 리포트 타입 체크' })
  @ApiParam({
    name: 'reportType',
    enum: ['ai_stock', 'commodity', 'forex', 'dividend'],
    description: '리포트 타입',
  })
  @ApiResponse({
    status: 200,
    description: '체크 결과',
    type: ReportCheckResultDto,
  })
  async checkReport(
    @Param('reportType') reportType: string,
  ): Promise<ReportCheckResult> {
    // 유효성 검증
    if (!REPORT_TYPES.includes(reportType as ReportType)) {
      throw new HttpException(
        `Invalid report type: ${reportType}. Valid types: ${REPORT_TYPES.join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.monitoringService.checkReport(reportType as ReportType);
  }

  /**
   * 마지막 체크 결과 조회
   */
  @Get('status')
  @ApiOperation({ summary: '마지막 체크 결과 조회' })
  @ApiResponse({
    status: 200,
    description: '마지막 체크 결과',
    type: MonitoringResultDto,
  })
  async getLastResult(): Promise<MonitoringResult | { message: string }> {
    const result = this.monitoringService.getLastResult();

    if (!result) {
      return { message: 'No check has been executed yet' };
    }

    return result;
  }

  /**
   * 서비스 헬스 상태 조회
   */
  @Get('health')
  @ApiOperation({ summary: '서비스 헬스 상태 조회' })
  @ApiResponse({ status: 200, description: '헬스 상태' })
  async getHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    db: { connected: boolean; type: string | null };
    scheduler: {
      isRunning: boolean;
      cronExpression: string;
      timezone: string;
      nextExecution: Date | null;
    };
    targetFiles: Array<{ reportType: ReportType; filename: string }>;
  }> {
    const healthStatus = await this.monitoringService.getHealthStatus();
    const schedulerStatus = this.scheduler.getSchedulerStatus();

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (!healthStatus.dbConnected) {
      status = 'unhealthy';
    } else if (healthStatus.availableTargetFiles.length < 4) {
      status = 'degraded';
    }

    return {
      status,
      db: {
        connected: healthStatus.dbConnected,
        type: healthStatus.dbType,
      },
      scheduler: schedulerStatus,
      targetFiles: healthStatus.availableTargetFiles,
    };
  }

  /**
   * 스케줄러 수동 트리거
   */
  @Post('trigger')
  @ApiOperation({ summary: '스케줄러 수동 트리거 (테스트용)' })
  @ApiResponse({ status: 200, description: '트리거 결과' })
  async triggerScheduler(): Promise<{ message: string; triggeredAt: Date }> {
    await this.scheduler.triggerManually();
    return {
      message: 'Scheduler triggered manually',
      triggeredAt: new Date(),
    };
  }

  /**
   * 타겟 파일 목록 조회
   */
  @Get('targets')
  @ApiOperation({ summary: '타겟 파일 목록 조회' })
  @ApiResponse({ status: 200, description: '타겟 파일 목록' })
  async getTargets(): Promise<{
    files: Array<{ reportType: ReportType; filename: string }>;
  }> {
    const healthStatus = await this.monitoringService.getHealthStatus();
    return {
      files: healthStatus.availableTargetFiles,
    };
  }

  /**
   * 체크 이력 조회
   */
  @Get('history')
  @ApiOperation({ summary: '체크 이력 조회 (페이지네이션)' })
  @ApiResponse({ status: 200, description: '체크 이력 목록' })
  async getHistory(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('hasIssues') hasIssues?: string,
  ) {
    return this.monitoringService.getHistory({
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
      hasIssues: hasIssues !== undefined ? hasIssues === 'true' : undefined,
    });
  }

  // ==================== UI Check Endpoints ====================

  @Get('ui-check/config')
  @ApiOperation({ summary: 'UI 체크 설정(타겟/체크 항목) 조회' })
  @ApiResponse({ status: 200, description: 'UI 체크 설정' })
  async getUiCheckConfig() {
    return this.uiCheckService.getCheckConfig();
  }

  @Patch('ui-check/config')
  @ApiOperation({ summary: 'UI 체크 설정 임계값 수정' })
  @ApiResponse({ status: 200, description: '수정된 UI 체크 설정' })
  async updateUiCheckConfig(
    @Body() updates: { targetId: string; checkIndex: number; values: Record<string, unknown> },
  ) {
    return this.uiCheckService.updateCheckConfig(updates);
  }

  @Post('ui-check')
  @ApiOperation({ summary: 'UI 렌더링 체크 실행' })
  @ApiResponse({ status: 200, description: 'UI 체크 결과' })
  async runUiCheck(): Promise<UiMonitoringResult> {
    return this.uiCheckService.runFullUiCheck('manual');
  }

  @Get('ui-check/status')
  @ApiOperation({ summary: 'UI 체크 마지막 결과 조회' })
  @ApiResponse({ status: 200, description: 'UI 체크 마지막 결과' })
  async getUiCheckStatus(): Promise<UiMonitoringResult | { message: string }> {
    const result = this.uiCheckService.getLastResult();
    if (!result) {
      return { message: 'No UI check has been executed yet' };
    }
    return result;
  }

  @Get('ui-check/history')
  @ApiOperation({ summary: 'UI 체크 이력 조회' })
  @ApiResponse({ status: 200, description: 'UI 체크 이력 목록' })
  async getUiCheckHistory(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('hasIssues') hasIssues?: string,
  ) {
    return this.uiCheckService.getHistory({
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
      hasIssues: hasIssues !== undefined ? hasIssues === 'true' : undefined,
    });
  }

  @Get('ui-check/health')
  @ApiOperation({ summary: 'UI 체크 헬스 상태 조회' })
  @ApiResponse({ status: 200, description: 'UI 체크 헬스 상태' })
  async getUiCheckHealth() {
    const uiSchedulerStatus = this.uiCheckScheduler.getSchedulerStatus();
    const lastResult = this.uiCheckService.getLastResult();

    return {
      scheduler: uiSchedulerStatus,
      lastCheck: lastResult
        ? {
            timestamp: lastResult.timestamp,
            hasIssues:
              lastResult.summary.brokenTargets > 0 ||
              lastResult.summary.degradedTargets > 0,
            summary: lastResult.summary,
          }
        : null,
    };
  }

  @Post('ui-check/trigger')
  @ApiOperation({ summary: 'UI 체크 스케줄러 수동 트리거' })
  @ApiResponse({ status: 200, description: '트리거 결과' })
  async triggerUiCheckScheduler(): Promise<{
    message: string;
    triggeredAt: Date;
  }> {
    await this.uiCheckScheduler.triggerManually();
    return {
      message: 'UI check scheduler triggered manually',
      triggeredAt: new Date(),
    };
  }

  @Get('ui-check/history/:id')
  @ApiOperation({ summary: 'UI 체크 상세 이력 조회' })
  @ApiResponse({ status: 200, description: 'UI 체크 상세 결과' })
  async getUiCheckHistoryDetail(
    @Param('id') id: string,
  ): Promise<UiMonitoringResult | { message: string }> {
    const result = await this.uiCheckService.getHistoryDetail(id);
    if (!result) {
      return { message: 'UI check history not found' };
    }
    return result;
  }
}
