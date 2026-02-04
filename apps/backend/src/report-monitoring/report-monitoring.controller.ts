import {
  Controller,
  Get,
  Post,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Public } from '../admin/auth/decorators/public.decorator';
import { ReportMonitoringService } from './report-monitoring.service';
import { ReportMonitoringScheduler } from './report-monitoring.scheduler';
import {
  ReportType,
  REPORT_TYPES,
  MonitoringResult,
  ReportCheckResult,
} from './interfaces';
import { MonitoringResultDto, ReportCheckResultDto } from './dto';

@ApiTags('Report Monitoring')
@Controller('api/report-monitoring')
@Public()
export class ReportMonitoringController {
  constructor(
    private readonly monitoringService: ReportMonitoringService,
    private readonly scheduler: ReportMonitoringScheduler,
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
}
