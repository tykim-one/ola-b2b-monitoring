import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SessionAnalysisService } from './session-analysis.service';
import { SessionAnalysisController } from './session-analysis.controller';
import { LLMModule } from '../admin/analysis/llm/llm.module';

@Module({
  imports: [ConfigModule, LLMModule],
  controllers: [SessionAnalysisController],
  providers: [SessionAnalysisService],
  exports: [SessionAnalysisService],
})
export class SessionAnalysisModule {}
