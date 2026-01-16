import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMProvider, Message, LLMResponse } from './llm-provider.interface';

/**
 * OpenAI LLM Provider (Stub)
 *
 * Placeholder implementation for OpenAI GPT models.
 * To implement:
 * 1. Install: npm install openai
 * 2. Add OPENAI_API_KEY to environment
 * 3. Implement generateResponse using OpenAI SDK
 */
@Injectable()
export class OpenAIProvider implements LLMProvider {
  public readonly name = 'openai';
  private readonly logger = new Logger(OpenAIProvider.name);

  constructor(private readonly configService: ConfigService) {
    this.logger.warn(
      'OpenAI provider is a stub implementation. Not yet configured.',
    );
  }

  isConfigured(): boolean {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    return !!apiKey;
  }

  async generateResponse(
    messages: Message[],
    context?: string,
  ): Promise<LLMResponse> {
    throw new Error(
      'OpenAI provider is not implemented. Please configure a different LLM provider (e.g., gemini) or implement this provider.',
    );
  }
}
