import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AlarmScheduleService } from '../alarm-schedule/alarm-schedule.service';
import { UiCheckService } from './ui-check.service';

@Injectable()
export class UiCheckScheduler implements OnModuleInit {
  private readonly logger = new Logger(UiCheckScheduler.name);

  constructor(
    private readonly alarmScheduleService: AlarmScheduleService,
    private readonly uiCheckService: UiCheckService,
  ) {}

  onModuleInit() {
    this.alarmScheduleService.registerModuleCallback(
      'ui-check',
      () => this.executeCheck(),
    );
    this.logger.log('UI check callback registered with AlarmScheduleService');
  }

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

  async triggerManually(): Promise<void> {
    this.logger.log('Manual UI check trigger requested');
    await this.uiCheckService.runFullUiCheck('manual');
  }
}
