import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MetricsModule } from './metrics/metrics.module';
import { CacheModule } from './cache/cache.module';
import { MlModule } from './ml/ml.module';
import { AdminModule } from './admin';
import { QualityModule } from './quality/quality.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { BatchAnalysisModule } from './batch-analysis/batch-analysis.module';
import { FAQAnalysisModule } from './faq-analysis/faq-analysis.module';
import { SessionAnalysisModule } from './session-analysis/session-analysis.module';
import { UserProfilingModule } from './user-profiling/user-profiling.module';
import { WindETLModule } from './wind-etl/wind-etl.module';
import { MinkabuETLModule } from './minkabu-etl/minkabu-etl.module';
import { ReportMonitoringModule } from './report-monitoring/report-monitoring.module';
import { ProblematicChatModule } from './problematic-chat/problematic-chat.module';
import { ServiceHealthModule } from './service-health/service-health.module';
import { JobMonitoringModule } from './job-monitoring/job-monitoring.module';
import { AlarmScheduleModule } from './alarm-schedule/alarm-schedule.module';
import { IbkChatReportModule } from './ibk-chat-report/ibk-chat-report.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1분 (밀리초)
        limit: 100, // 분당 100 요청
      },
    ]),
    CacheModule,
    MetricsModule,
    MlModule,
    AdminModule,
    QualityModule,
    NotificationsModule,
    ChatbotModule,
    BatchAnalysisModule,
    FAQAnalysisModule,
    SessionAnalysisModule,
    UserProfilingModule,
    WindETLModule,
    MinkabuETLModule,
    ReportMonitoringModule,
    ProblematicChatModule,
    ServiceHealthModule,
    JobMonitoringModule,
    AlarmScheduleModule,
    IbkChatReportModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
