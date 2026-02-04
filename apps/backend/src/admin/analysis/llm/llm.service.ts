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

    // Realtime KPIs (snake_case fields from API)
    if (metrics.realtimeKPIs) {
      sections.push('## Current Metrics (Last 24 Hours)');
      const kpis = metrics.realtimeKPIs;
      const totalRequests = kpis.total_requests || 0;
      const successCount = kpis.success_count || 0;
      const successRate =
        totalRequests > 0 ? (successCount / totalRequests) * 100 : 0;
      const avgTokens = kpis.avg_tokens || 0;
      const totalTokens = kpis.total_tokens || 0;
      // Estimate cost: input $3/M tokens, output $15/M tokens (approximate)
      const inputTokens = kpis.total_input_tokens || 0;
      const outputTokens = kpis.total_output_tokens || 0;
      const estimatedCost =
        (inputTokens * 3) / 1000000 + (outputTokens * 15) / 1000000;

      sections.push(`- Total Requests: ${totalRequests.toLocaleString()}`);
      sections.push(`- Success Rate: ${successRate.toFixed(2)}%`);
      sections.push(`- Avg Tokens/Request: ${avgTokens.toFixed(2)}`);
      sections.push(`- Total Tokens: ${totalTokens.toLocaleString()}`);
      sections.push(`- Estimated Cost: $${estimatedCost.toFixed(2)}`);
      sections.push(`- Active Tenants: ${kpis.active_tenants || 0}`);
    }

    // Tenant usage (snake_case fields from API)
    if (metrics.tenantUsage && metrics.tenantUsage.length > 0) {
      sections.push('\n## Top Tenants by Usage');
      metrics.tenantUsage.slice(0, 5).forEach((tenant: any, idx: number) => {
        sections.push(
          `${idx + 1}. ${tenant.tenant_id}: ${(tenant.request_count || 0).toLocaleString()} requests, ${(tenant.total_tokens || 0).toLocaleString()} tokens`,
        );
      });
    }

    // Anomaly stats
    if (metrics.anomalyStats && metrics.anomalyStats.length > 0) {
      sections.push('\n## Anomaly Statistics');
      metrics.anomalyStats.slice(0, 5).forEach((stat: any) => {
        sections.push(
          `- ${stat.tenant_id}: avg=${stat.avg_tokens?.toFixed(0) || 0}, stddev=${stat.stddev_tokens?.toFixed(0) || 0}, p99=${stat.p99_tokens || 0}`,
        );
      });
    }

    // Cost trends (snake_case fields from API)
    if (metrics.costTrend && metrics.costTrend.length > 0) {
      sections.push('\n## Recent Cost Trend');
      const recent = metrics.costTrend.slice(-3);
      recent.forEach((point: any) => {
        sections.push(
          `- ${point.date}: $${(point.total_cost || 0).toFixed(2)}`,
        );
      });
    }

    // Chatbot Quality - Emerging Patterns
    if (metrics.emergingPatterns && metrics.emergingPatterns.length > 0) {
      sections.push('\n## Emerging Query Patterns');
      metrics.emergingPatterns.slice(0, 5).forEach((pattern: any) => {
        sections.push(
          `- [${pattern.patternType}] "${pattern.normalizedQuery?.substring(0, 50)}..." (recent: ${pattern.recentCount}, growth: ${pattern.growthRate || 'NEW'})`,
        );
      });
    }

    // Chatbot Quality - Sentiment Analysis
    if (metrics.sentimentAnalysis && metrics.sentimentAnalysis.length > 0) {
      const frustrated = metrics.sentimentAnalysis.filter(
        (s: any) => s.sentimentFlag === 'FRUSTRATED',
      ).length;
      const urgent = metrics.sentimentAnalysis.filter(
        (s: any) => s.sentimentFlag === 'URGENT',
      ).length;
      sections.push('\n## Sentiment Analysis');
      sections.push(`- Frustrated queries: ${frustrated}`);
      sections.push(`- Urgent queries: ${urgent}`);
      sections.push(`- Total flagged: ${metrics.sentimentAnalysis.length}`);
    }

    // Chatbot Quality - Session Analytics
    if (metrics.sessionAnalytics && metrics.sessionAnalytics.length > 0) {
      const avgTurns =
        metrics.sessionAnalytics.reduce(
          (sum: number, s: any) => sum + (s.turnCount || 0),
          0,
        ) / metrics.sessionAnalytics.length;
      const frustratedSessions = metrics.sessionAnalytics.filter(
        (s: any) => s.hasFrustration,
      ).length;
      sections.push('\n## Session Analytics');
      sections.push(
        `- Total sessions analyzed: ${metrics.sessionAnalytics.length}`,
      );
      sections.push(`- Avg turns per session: ${avgTurns.toFixed(1)}`);
      sections.push(`- Sessions with frustration: ${frustratedSessions}`);
    }

    // Chatbot Quality - Tenant Summary
    if (metrics.tenantQuality && metrics.tenantQuality.length > 0) {
      sections.push('\n## Tenant Quality Summary');
      metrics.tenantQuality.slice(0, 5).forEach((t: any) => {
        sections.push(
          `- ${t.tenantId}: ${t.totalSessions} sessions, ${t.sessionSuccessRate?.toFixed(1)}% success, ${t.frustrationRate?.toFixed(2)}% frustration`,
        );
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
