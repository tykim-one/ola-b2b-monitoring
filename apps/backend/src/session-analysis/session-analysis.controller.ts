import {
  Controller,
  Get,
  Param,
  Query,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { SessionAnalysisService } from './session-analysis.service';
import {
  SessionFilterDto,
  CreateSessionAnalysisJobDto,
  SessionResultFilterDto,
} from './dto';
import {
  SessionStats,
  PaginatedSessions,
  SessionTimeline,
  LLMSessionAnalysis,
} from './interfaces';
import { Permissions } from '../admin/auth/decorators/permissions.decorator';

@Controller('api/admin/session-analysis')
export class SessionAnalysisController {
  constructor(
    private readonly sessionAnalysisService: SessionAnalysisService,
  ) {}

  /**
   * Get session statistics (real-time)
   * GET /api/admin/session-analysis/stats
   */
  @Permissions('analysis:read')
  @Get('stats')
  async getSessionStats(
    @Query() filter: SessionFilterDto,
  ): Promise<SessionStats> {
    return this.sessionAnalysisService.getSessionStats(filter);
  }

  /**
   * Get paginated session list (real-time)
   * GET /api/admin/session-analysis/sessions
   */
  @Permissions('analysis:read')
  @Get('sessions')
  async getSessions(
    @Query() filter: SessionFilterDto,
  ): Promise<PaginatedSessions> {
    return this.sessionAnalysisService.getSessions(filter);
  }

  /**
   * Get session timeline with conversation history
   * GET /api/admin/session-analysis/sessions/:sessionId/timeline
   */
  @Permissions('analysis:read')
  @Get('sessions/:sessionId/timeline')
  async getSessionTimeline(
    @Param('sessionId') sessionId: string,
  ): Promise<SessionTimeline> {
    return this.sessionAnalysisService.getSessionTimeline(sessionId);
  }

  /**
   * Analyze session with LLM for deep insights
   * POST /api/admin/session-analysis/sessions/:sessionId/analyze
   */
  @Permissions('analysis:write')
  @Post('sessions/:sessionId/analyze')
  async analyzeSession(
    @Param('sessionId') sessionId: string,
  ): Promise<LLMSessionAnalysis> {
    return this.sessionAnalysisService.analyzeSessionWithLLM(sessionId);
  }

  /**
   * Get available tenants for filtering
   * GET /api/admin/session-analysis/tenants
   */
  @Permissions('analysis:read')
  @Get('tenants')
  async getTenants(@Query('days') days?: number): Promise<string[]> {
    return this.sessionAnalysisService.getTenants(days || 7);
  }
}
