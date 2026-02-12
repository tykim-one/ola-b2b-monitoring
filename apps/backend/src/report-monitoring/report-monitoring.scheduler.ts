import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AlarmScheduleService } from '../alarm-schedule/alarm-schedule.service';
import { ReportMonitoringService } from './report-monitoring.service';

@Injectable()
export class ReportMonitoringScheduler implements OnModuleInit {
  private readonly logger = new Logger(ReportMonitoringScheduler.name);

  constructor(
    private readonly alarmScheduleService: AlarmScheduleService,
    private readonly monitoringService: ReportMonitoringService,
  ) {}

  onModuleInit() {
    this.alarmScheduleService.registerModuleCallback(
      'report-monitoring',
      () => this.executeCheck(),
    );
    this.logger.log('Report monitoring callback registered with AlarmScheduleService');
  }

  private async executeCheck(): Promise<void> {
    this.logger.log('Starting scheduled report monitoring...');

    try {
      const result = await this.monitoringService.runFullCheck('scheduled');

      const { summary } = result;
      this.logger.log(
        `Scheduled check completed: ` +
          `${summary.healthyReports}/${summary.totalReports} healthy, ` +
          `${summary.totalMissing} missing, ${summary.totalStale} stale`,
      );
    } catch (error) {
      this.logger.error(
        `Scheduled check failed: ${error.message}`,
        error.stack,
      );
    }
  }

  async triggerManually(): Promise<void> {
    this.logger.log('Manual trigger requested');
    await this.monitoringService.runFullCheck('manual');
  }
}
