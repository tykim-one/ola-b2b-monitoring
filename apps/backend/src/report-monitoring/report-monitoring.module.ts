import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReportMonitoringService } from './report-monitoring.service';
import { ReportMonitoringScheduler } from './report-monitoring.scheduler';
import { ReportMonitoringController } from './report-monitoring.controller';
import { ExternalDbService } from './external-db.service';
import { TargetLoaderService } from './target-loader.service';

@Module({
  imports: [ConfigModule, ScheduleModule.forRoot(), NotificationsModule],
  controllers: [ReportMonitoringController],
  providers: [
    ExternalDbService,
    TargetLoaderService,
    ReportMonitoringService,
    ReportMonitoringScheduler,
  ],
  exports: [ReportMonitoringService],
})
export class ReportMonitoringModule {}
