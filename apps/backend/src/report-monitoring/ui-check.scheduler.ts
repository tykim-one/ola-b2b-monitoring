import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { CronJob } from 'cron';
import { UiCheckService } from './ui-check.service';

@Injectable()
export class UiCheckScheduler implements OnModuleInit {
  private readonly logger = new Logger(UiCheckScheduler.name);
  private readonly jobName = 'ui-check-monitoring';

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly configService: ConfigService,
    private readonly uiCheckService: UiCheckService,
  ) {}

  onModuleInit() {
    this.registerCronJob();
  }

  /**
   * Cron Job 등록
   */
  private registerCronJob(): void {
    // 환경변수에서 Cron 표현식 로드 (기본값: 매일 08:30)
    const cronExpr =
      this.configService.get<string>('UI_CHECK_CRON') || '30 8 * * *';
    const timezone =
      this.configService.get<string>('UI_CHECK_TIMEZONE') || 'Asia/Seoul';

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
        `UI check monitoring scheduled: "${cronExpr}" (${timezone})`,
      );
    } catch (error) {
      this.logger.error(`Failed to register cron job: ${error.message}`);
    }
  }

  /**
   * 스케줄된 체크 실행
   */
  private async executeCheck(): Promise<void> {
    this.logger.log('Starting scheduled UI check monitoring...');

    try {
      const result = await this.uiCheckService.runFullUiCheck('scheduled');

      const { summary } = result;
      this.logger.log(
        `Scheduled UI check completed: ` +
          `${summary.healthyTargets}/${summary.totalTargets} healthy, ` +
          `${summary.brokenTargets} broken, ${summary.degradedTargets} degraded`,
      );
    } catch (error) {
      this.logger.error(
        `Scheduled UI check failed: ${error.message}`,
        error.stack,
      );
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
      this.configService.get<string>('UI_CHECK_CRON') || '30 8 * * *';
    const timezone =
      this.configService.get<string>('UI_CHECK_TIMEZONE') || 'Asia/Seoul';

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
    this.logger.log('Manual UI check trigger requested');
    await this.uiCheckService.runFullUiCheck('manual');
  }
}
