import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { MetricsModule } from '../metrics/metrics.module';
import { LLMModule } from '../admin/analysis/llm/llm.module';

/**
 * Chatbot Module
 *
 * Provides a global floating chatbot feature that allows users to
 * ask questions about dashboard data with context-aware AI responses.
 */
@Module({
  imports: [MetricsModule, LLMModule],
  controllers: [ChatbotController],
  providers: [ChatbotService],
  exports: [ChatbotService],
})
export class ChatbotModule {}
