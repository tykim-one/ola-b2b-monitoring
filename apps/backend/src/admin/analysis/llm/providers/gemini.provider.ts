import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  Content,
} from '@google/generative-ai';
import { LLMProvider, Message, LLMResponse } from './llm-provider.interface';

/**
 * Gemini LLM Provider
 *
 * Uses Google's Gemini API for LLM-powered analysis.
 * Model: gemini-1.5-flash (configurable via GEMINI_MODEL env var)
 */
@Injectable()
export class GeminiProvider implements LLMProvider {
  public readonly name = 'gemini';
  private readonly logger = new Logger(GeminiProvider.name);
  private genAI: GoogleGenerativeAI | null = null;
  private model: GenerativeModel | null = null;
  private readonly modelName: string;

  constructor(private readonly configService: ConfigService) {
    this.modelName = this.configService.get<string>(
      'GEMINI_MODEL',
      'gemini-1.5-flash',
    );
    this.initialize();
  }

  private initialize(): void {
    const apiKey = this.configService.get<string>('GOOGLE_GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'GOOGLE_GEMINI_API_KEY not configured. Gemini provider will not be available.',
      );
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: this.modelName });
      this.logger.log(
        `Gemini provider initialized with model: ${this.modelName}`,
      );
    } catch (error) {
      this.logger.error('Failed to initialize Gemini provider', error);
      this.genAI = null;
      this.model = null;
    }
  }

  isConfigured(): boolean {
    return this.model !== null;
  }

  async generateResponse(
    messages: Message[],
    context?: string,
  ): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      throw new Error(
        'Gemini provider is not configured. Please set GOOGLE_GEMINI_API_KEY.',
      );
    }

    const startTime = Date.now();

    try {
      // Build system prompt with context
      const systemPrompt = this.buildSystemPrompt(context);

      // Convert messages to Gemini format
      const contents = this.convertMessagesToGeminiFormat(
        messages,
        systemPrompt,
      );

      // Generate response
      const result = await this.model!.generateContent({
        contents,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      });

      const response = result.response;
      const text = response.text();
      const latencyMs = Date.now() - startTime;

      // Extract token counts
      const usageMetadata = response.usageMetadata || {
        promptTokenCount: 0,
        candidatesTokenCount: 0,
      };

      this.logger.debug(`Gemini response generated in ${latencyMs}ms`, {
        inputTokens: usageMetadata.promptTokenCount,
        outputTokens: usageMetadata.candidatesTokenCount,
      });

      return {
        content: text,
        inputTokens: usageMetadata.promptTokenCount || 0,
        outputTokens: usageMetadata.candidatesTokenCount || 0,
        model: this.modelName,
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      this.logger.error('Gemini API error', error);
      throw new Error(`Gemini API error: ${error.message}`);
    }
  }

  private buildSystemPrompt(context?: string): string {
    const basePrompt = `You are an AI assistant specialized in analyzing B2B LLM monitoring data.
You help users understand their metrics, identify patterns, and provide actionable insights.

Focus on:
- Identifying anomalies and trends in usage patterns
- Explaining cost implications
- Suggesting optimizations for token efficiency
- Detecting potential issues in tenant behavior

Respond in a helpful, concise manner. Use data from the context when available.`;

    if (context) {
      return `${basePrompt}\n\nCurrent metrics context:\n${context}`;
    }

    return basePrompt;
  }

  private convertMessagesToGeminiFormat(
    messages: Message[],
    systemPrompt: string,
  ): Content[] {
    const contents: Content[] = [];

    // Add system prompt as first user message (Gemini doesn't have explicit system role)
    if (systemPrompt) {
      contents.push({
        role: 'user',
        parts: [{ text: systemPrompt }],
      });
      contents.push({
        role: 'model',
        parts: [
          {
            text: 'Understood. I will help analyze your B2B LLM monitoring data.',
          },
        ],
      });
    }

    // Convert conversation messages
    for (const msg of messages) {
      const geminiRole = msg.role === 'assistant' ? 'model' : 'user';

      // Skip system messages (already handled)
      if (msg.role === 'system') continue;

      contents.push({
        role: geminiRole,
        parts: [{ text: msg.content }],
      });
    }

    return contents;
  }
}
