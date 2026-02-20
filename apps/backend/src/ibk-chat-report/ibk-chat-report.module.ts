import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../admin/database/database.module';
import { LLMModule } from '../admin/analysis/llm/llm.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { IbkChatReportService } from './ibk-chat-report.service';
import { IbkChatReportController } from './ibk-chat-report.controller';
import { IbkChatReportScheduler } from './ibk-chat-report.scheduler';
import { DataCollectorService } from './services/data-collector.service';
import { QuestionScorerService } from './services/question-scorer.service';
import { ReportBuilderService } from './services/report-builder.service';

@Module({
  imports: [ConfigModule, DatabaseModule, LLMModule, NotificationsModule],
  controllers: [IbkChatReportController],
  providers: [
    IbkChatReportService,
    IbkChatReportScheduler,
    DataCollectorService,
    QuestionScorerService,
    ReportBuilderService,
  ],
})
export class IbkChatReportModule {}
