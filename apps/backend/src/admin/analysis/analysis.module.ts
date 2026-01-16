import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { LLMModule } from './llm/llm.module';
import { DatabaseModule } from '../database/database.module';
import { MetricsModule } from '../../metrics/metrics.module';

/**
 * Analysis Module
 *
 * Provides AI-powered analysis capabilities for the admin service.
 * Integrates LLM providers, metrics data, and session management.
 */
@Module({
  imports: [ConfigModule, LLMModule, DatabaseModule, MetricsModule],
  controllers: [AnalysisController],
  providers: [AnalysisService],
  exports: [AnalysisService],
})
export class AnalysisModule {}
