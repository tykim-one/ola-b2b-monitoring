import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BatchAnalysisService } from './batch-analysis.service';
import { BatchAnalysisController } from './batch-analysis.controller';
import { BatchAnalysisScheduler } from './batch-analysis.scheduler';
import { DatabaseModule } from '../admin/database/database.module';
import { LLMModule } from '../admin/analysis/llm/llm.module';

@Module({
  imports: [ConfigModule, DatabaseModule, LLMModule],
  controllers: [BatchAnalysisController],
  providers: [BatchAnalysisService, BatchAnalysisScheduler],
  exports: [BatchAnalysisService],
})
export class BatchAnalysisModule {}
