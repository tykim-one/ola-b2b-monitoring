import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from '../notifications/notifications.module';
import { DatabaseModule } from '../admin/database/database.module';
import { ReportMonitoringService } from './report-monitoring.service';
import { ReportMonitoringScheduler } from './report-monitoring.scheduler';
import { ReportMonitoringController } from './report-monitoring.controller';
import { ExternalDbService } from './external-db.service';
import { TargetLoaderService } from './target-loader.service';
import { UiCheckService } from './ui-check.service';
import { UiCheckScheduler } from './ui-check.scheduler';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    NotificationsModule,
    DatabaseModule,
  ],
  controllers: [ReportMonitoringController],
  providers: [
    ExternalDbService,
    TargetLoaderService,
    ReportMonitoringService,
    ReportMonitoringScheduler,
    UiCheckService,
    UiCheckScheduler,
  ],
  exports: [ReportMonitoringService, UiCheckService],
})
export class ReportMonitoringModule {}
