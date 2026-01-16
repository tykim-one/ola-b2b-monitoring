import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { LLMService } from './llm/llm.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { Message } from './llm/providers/llm-provider.interface';
import { MetricsService } from '../../metrics/metrics.service';

/**
 * Analysis Service
 *
 * Manages AI-powered analysis sessions and conversations.
 * Integrates with LLM providers and metrics data.
 */
@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LLMService,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * Create a new analysis session
   */
  async createSession(userId: string, dto: CreateSessionDto) {
    try {
      const session = await this.prisma.analysisSession.create({
        data: {
          userId,
          title: dto.title,
          context: JSON.stringify(dto.context || {}),
        },
      });

      this.logger.log(`Session created: ${session.id} for user: ${userId}`);

      // Parse context back to object for response
      return {
        ...session,
        context: session.context ? JSON.parse(session.context) : null,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create session: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get paginated list of user's sessions
   */
  async getSessions(userId: string, page: number = 1, pageSize: number = 20) {
    const skip = (page - 1) * pageSize;

    try {
      const [sessions, total] = await Promise.all([
        this.prisma.analysisSession.findMany({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
          skip,
          take: pageSize,
          include: {
            _count: {
              select: { messages: true },
            },
          },
        }),
        this.prisma.analysisSession.count({
          where: { userId },
        }),
      ]);

      // Parse context back to object for response
      const transformedSessions = sessions.map((session) => ({
        ...session,
        context: session.context ? JSON.parse(session.context) : null,
      }));

      return {
        data: transformedSessions,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get sessions: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get a specific session with its messages
   */
  async getSession(sessionId: string, userId: string) {
    const session = await this.prisma.analysisSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('You do not have access to this session');
    }

    // Parse context and metadata back to objects for response
    return {
      ...session,
      context: session.context ? JSON.parse(session.context) : null,
      messages: session.messages.map((msg) => ({
        ...msg,
        metadata: msg.metadata ? JSON.parse(msg.metadata) : null,
      })),
    };
  }

  /**
   * Send a message and get AI response
   */
  async sendMessage(sessionId: string, userId: string, dto: SendMessageDto) {
    // Verify session ownership
    const session = await this.prisma.analysisSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('You do not have access to this session');
    }

    try {
      // Save user message
      const userMessage = await this.prisma.analysisMessage.create({
        data: {
          sessionId,
          role: 'user',
          content: dto.content,
          metadata: JSON.stringify({}),
        },
      });

      // Build conversation history
      const conversationHistory: Message[] = session.messages.map(
        (msg: any) => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
        }),
      );

      // Add new user message
      conversationHistory.push({
        role: 'user',
        content: dto.content,
      });

      // Fetch metrics context if requested
      let metricsContext: Record<string, any> | undefined;
      if (dto.includeMetrics) {
        metricsContext = await this.fetchMetricsContext(
          session.context || '{}',
        );
      }

      // Generate AI response
      const llmResponse = await this.llmService.generateAnalysis(
        conversationHistory,
        metricsContext,
      );

      // Save assistant message
      const assistantMessage = await this.prisma.analysisMessage.create({
        data: {
          sessionId,
          role: 'assistant',
          content: llmResponse.content,
          metadata: JSON.stringify({
            inputTokens: llmResponse.inputTokens,
            outputTokens: llmResponse.outputTokens,
            model: llmResponse.model,
            latencyMs: llmResponse.latencyMs,
            includeMetrics: dto.includeMetrics || false,
          }),
        },
      });

      // Update session timestamp
      await this.prisma.analysisSession.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() },
      });

      this.logger.log(`Message exchange completed for session: ${sessionId}`);

      return {
        userMessage: {
          ...userMessage,
          metadata: userMessage.metadata
            ? JSON.parse(userMessage.metadata)
            : null,
        },
        assistantMessage: {
          ...assistantMessage,
          metadata: assistantMessage.metadata
            ? JSON.parse(assistantMessage.metadata)
            : null,
        },
        metadata: {
          inputTokens: llmResponse.inputTokens,
          outputTokens: llmResponse.outputTokens,
          model: llmResponse.model,
          latencyMs: llmResponse.latencyMs,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to send message: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string, userId: string) {
    const session = await this.prisma.analysisSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('You do not have access to this session');
    }

    try {
      await this.prisma.analysisSession.delete({
        where: { id: sessionId },
      });

      this.logger.log(`Session deleted: ${sessionId}`);
      return { success: true, message: 'Session deleted successfully' };
    } catch (error) {
      this.logger.error(
        `Failed to delete session: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Fetch current metrics for context
   */
  private async fetchMetricsContext(
    sessionContext: string,
  ): Promise<Record<string, any>> {
    try {
      const parsedContext = sessionContext ? JSON.parse(sessionContext) : {};
      const projectId = parsedContext?.projectId || 'default';

      // Fetch key metrics in parallel
      const [realtimeKPIs, tenantUsage, anomalies, costTrend] =
        await Promise.all([
          this.metricsService.getRealtimeKPI().catch(() => null),
          this.metricsService.getTenantUsage().catch(() => []),
          this.metricsService.getAnomalyStats().catch(() => []),
          this.metricsService.getCostTrend().catch(() => []),
        ]);

      return {
        realtimeKPIs,
        tenantUsage,
        anomalies,
        costTrend,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.warn(`Failed to fetch metrics context: ${error.message}`);
      return {};
    }
  }
}
