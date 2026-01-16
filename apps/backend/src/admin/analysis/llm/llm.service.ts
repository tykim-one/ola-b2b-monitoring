import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LLMProvider,
  Message,
  LLMResponse,
} from './providers/llm-provider.interface';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';

/**
 * LLM Service
 *
 * Manages LLM provider selection and provides unified interface for analysis.
 * Supports multiple providers (Gemini, OpenAI, Anthropic) with fallback handling.
 */
@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);
  private readonly provider: LLMProvider;
  private readonly providerName: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly geminiProvider: GeminiProvider,
    private readonly openaiProvider: OpenAIProvider,
    private readonly anthropicProvider: AnthropicProvider,
  ) {
    this.providerName = this.configService.get<string>(
      'LLM_PROVIDER',
      'gemini',
    );
    this.provider = this.selectProvider();
    this.logger.log(
      `LLM Service initialized with provider: ${this.provider.name}`,
    );
  }

  private selectProvider(): LLMProvider {
    const providers: Record<string, LLMProvider> = {
      gemini: this.geminiProvider,
      openai: this.openaiProvider,
      anthropic: this.anthropicProvider,
    };

    const selectedProvider = providers[this.providerName.toLowerCase()];

    if (!selectedProvider) {
      this.logger.warn(
        `Unknown LLM provider: ${this.providerName}. Falling back to Gemini.`,
      );
      return this.geminiProvider;
    }

    if (!selectedProvider.isConfigured()) {
      this.logger.warn(
        `${selectedProvider.name} provider is not configured. Falling back to Gemini.`,
      );
      return this.geminiProvider;
    }

    return selectedProvider;
  }

  /**
   * Generate AI analysis response
   *
   * @param messages - Conversation history
   * @param metricsContext - Optional metrics data to provide context
   * @returns LLM response with token usage and latency
   */
  async generateAnalysis(
    messages: Message[],
    metricsContext?: Record<string, any>,
  ): Promise<LLMResponse> {
    if (!this.provider.isConfigured()) {
      throw new Error(
        `LLM provider ${this.provider.name} is not configured. Please set the appropriate API key.`,
      );
    }

    // Format metrics context if provided
    const formattedContext = metricsContext
      ? this.formatMetricsContext(metricsContext)
      : undefined;

    try {
      const response = await this.provider.generateResponse(
        messages,
        formattedContext,
      );

      this.logger.debug('LLM analysis generated', {
        provider: this.provider.name,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        latencyMs: response.latencyMs,
      });

      return response;
    } catch (error) {
      this.logger.error(`LLM provider error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Format metrics data into LLM-friendly context
   */
  private formatMetricsContext(metrics: Record<string, any>): string {
    const sections: string[] = [];

    // Realtime KPIs
    if (metrics.realtimeKPIs) {
      sections.push('## Current Metrics (Last Hour)');
      const kpis = metrics.realtimeKPIs;
      sections.push(
        `- Total Requests: ${kpis.totalRequests?.toLocaleString() || 'N/A'}`,
      );
      sections.push(
        `- Success Rate: ${kpis.successRate ? (kpis.successRate * 100).toFixed(2) + '%' : 'N/A'}`,
      );
      sections.push(
        `- Avg Tokens/Request: ${kpis.avgTokensPerRequest?.toFixed(2) || 'N/A'}`,
      );
      sections.push(`- Total Cost: $${kpis.totalCost?.toFixed(2) || '0.00'}`);
    }

    // Tenant usage
    if (metrics.tenantUsage && metrics.tenantUsage.length > 0) {
      sections.push('\n## Top Tenants by Usage');
      metrics.tenantUsage.slice(0, 5).forEach((tenant: any, idx: number) => {
        sections.push(
          `${idx + 1}. ${tenant.tenantId}: ${tenant.totalRequests.toLocaleString()} requests, ${tenant.totalTokens.toLocaleString()} tokens`,
        );
      });
    }

    // Anomalies
    if (metrics.anomalies && metrics.anomalies.length > 0) {
      sections.push('\n## Recent Anomalies');
      metrics.anomalies.slice(0, 5).forEach((anomaly: any) => {
        sections.push(
          `- ${anomaly.type}: ${anomaly.description} (severity: ${anomaly.severity})`,
        );
      });
    }

    // Cost trends
    if (metrics.costTrend && metrics.costTrend.length > 0) {
      sections.push('\n## Recent Cost Trend');
      const recent = metrics.costTrend.slice(-3);
      recent.forEach((point: any) => {
        sections.push(`- ${point.date}: $${point.totalCost.toFixed(2)}`);
      });
    }

    return sections.length > 0
      ? sections.join('\n')
      : 'No metrics context available.';
  }

  /**
   * Get current provider name
   */
  getProviderName(): string {
    return this.provider.name;
  }

  /**
   * Check if provider is configured
   */
  isProviderConfigured(): boolean {
    return this.provider.isConfigured();
  }
}
