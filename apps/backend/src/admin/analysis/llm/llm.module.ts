import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LLMService } from './llm.service';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';

/**
 * LLM Module
 *
 * Provides LLM services for AI-powered analysis.
 * Supports multiple providers (Gemini, OpenAI, Anthropic).
 */
@Module({
  imports: [ConfigModule],
  providers: [LLMService, GeminiProvider, OpenAIProvider, AnthropicProvider],
  exports: [LLMService],
})
export class LLMModule {}
