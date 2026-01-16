import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMProvider, Message, LLMResponse } from './llm-provider.interface';

/**
 * Anthropic LLM Provider (Stub)
 *
 * Placeholder implementation for Anthropic Claude models.
 * To implement:
 * 1. Install: npm install @anthropic-ai/sdk
 * 2. Add ANTHROPIC_API_KEY to environment
 * 3. Implement generateResponse using Anthropic SDK
 */
@Injectable()
export class AnthropicProvider implements LLMProvider {
  public readonly name = 'anthropic';
  private readonly logger = new Logger(AnthropicProvider.name);

  constructor(private readonly configService: ConfigService) {
    this.logger.warn(
      'Anthropic provider is a stub implementation. Not yet configured.',
    );
  }

  isConfigured(): boolean {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    return !!apiKey;
  }

  async generateResponse(
    messages: Message[],
    context?: string,
  ): Promise<LLMResponse> {
    throw new Error(
      'Anthropic provider is not implemented. Please configure a different LLM provider (e.g., gemini) or implement this provider.',
    );
  }
}
