import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { CronJob } from 'cron';
import { ReportMonitoringService } from './report-monitoring.service';

@Injectable()
export class ReportMonitoringScheduler implements OnModuleInit {
  private readonly logger = new Logger(ReportMonitoringScheduler.name);
  private readonly jobName = 'report-monitoring';

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly configService: ConfigService,
    private readonly monitoringService: ReportMonitoringService,
  ) {}

  onModuleInit() {
    this.registerCronJob();
  }

  /**
   * Cron Job 등록
   */
  private registerCronJob(): void {
    // 환경변수에서 Cron 표현식 로드 (기본값: 매일 08:00)
    const cronExpr =
      this.configService.get<string>('REPORT_MONITOR_CRON') || '0 8 * * *';
    const timezone =
      this.configService.get<string>('REPORT_MONITOR_TIMEZONE') || 'Asia/Seoul';

    try {
      // 기존 Job이 있으면 제거
      if (this.schedulerRegistry.doesExist('cron', this.jobName)) {
        this.schedulerRegistry.deleteCronJob(this.jobName);
      }

      const job = new CronJob(
        cronExpr,
        () => this.executeCheck(),
        null,
        true,
        timezone,
      );

      this.schedulerRegistry.addCronJob(this.jobName, job);
      job.start();

      this.logger.log(
        `Report monitoring scheduled: "${cronExpr}" (${timezone})`,
      );
    } catch (error) {
      this.logger.error(`Failed to register cron job: ${error.message}`);
    }
  }

  /**
   * 스케줄된 체크 실행
   */
  private async executeCheck(): Promise<void> {
    this.logger.log('Starting scheduled report monitoring...');

    try {
      const result = await this.monitoringService.runFullCheck();

      const { summary } = result;
      this.logger.log(
        `Scheduled check completed: ` +
          `${summary.healthyReports}/${summary.totalReports} healthy, ` +
          `${summary.totalMissing} missing, ${summary.totalStale} stale`,
      );
    } catch (error) {
      this.logger.error(`Scheduled check failed: ${error.message}`, error.stack);
    }
  }

  /**
   * 수동으로 다음 실행 시간 조회
   */
  getNextExecution(): Date | null {
    try {
      if (this.schedulerRegistry.doesExist('cron', this.jobName)) {
        const job = this.schedulerRegistry.getCronJob(this.jobName);
        return job.nextDate().toJSDate();
      }
    } catch (error) {
      this.logger.error(`Failed to get next execution: ${error.message}`);
    }
    return null;
  }

  /**
   * 스케줄러 상태 조회
   */
  getSchedulerStatus(): {
    isRunning: boolean;
    cronExpression: string;
    timezone: string;
    nextExecution: Date | null;
  } {
    const cronExpr =
      this.configService.get<string>('REPORT_MONITOR_CRON') || '0 8 * * *';
    const timezone =
      this.configService.get<string>('REPORT_MONITOR_TIMEZONE') || 'Asia/Seoul';

    let isRunning = false;
    try {
      isRunning = this.schedulerRegistry.doesExist('cron', this.jobName);
    } catch {
      // ignore
    }

    return {
      isRunning,
      cronExpression: cronExpr,
      timezone,
      nextExecution: this.getNextExecution(),
    };
  }

  /**
   * 수동 트리거 (테스트용)
   */
  async triggerManually(): Promise<void> {
    this.logger.log('Manual trigger requested');
    await this.executeCheck();
  }
}
