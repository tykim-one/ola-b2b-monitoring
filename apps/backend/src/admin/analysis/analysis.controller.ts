import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AnalysisService } from './analysis.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { Permissions } from '../auth/decorators/permissions.decorator';

/**
 * Analysis Controller
 *
 * Manages AI-powered analysis sessions and conversations.
 * All routes require authentication and appropriate permissions.
 * Guards are applied globally via AdminModule (JwtAuthGuard, PermissionsGuard).
 */
@ApiTags('Admin Analysis')
@ApiBearerAuth()
@Controller('api/admin/analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  /**
   * Create a new analysis session
   */
  @Post('sessions')
  @Permissions('analysis:write')
  @ApiOperation({ summary: 'Create a new analysis session' })
  @ApiResponse({
    status: 201,
    description: 'Session created successfully',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: 'user-123',
        title: 'Weekly Usage Analysis',
        context: { projectId: 'my-project', dateRange: '7d' },
        createdAt: '2025-01-15T10:00:00Z',
        updatedAt: '2025-01-15T10:00:00Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Missing analysis:write permission',
  })
  async createSession(@Request() req: any, @Body() dto: CreateSessionDto) {
    const userId = req.user.userId;
    return this.analysisService.createSession(userId, dto);
  }

  /**
   * Get list of user's analysis sessions
   */
  @Get('sessions')
  @Permissions('analysis:read')
  @ApiOperation({ summary: 'Get list of analysis sessions' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Sessions retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            userId: 'user-123',
            title: 'Weekly Usage Analysis',
            context: {},
            createdAt: '2025-01-15T10:00:00Z',
            updatedAt: '2025-01-15T10:30:00Z',
            _count: { messages: 5 },
          },
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Missing analysis:read permission',
  })
  async getSessions(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const userId = req.user.userId;
    const pageNum = page ? parseInt(page, 10) : undefined;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : undefined;
    return this.analysisService.getSessions(userId, pageNum, pageSizeNum);
  }

  /**
   * Get a specific session with messages
   */
  @Get('sessions/:id')
  @Permissions('analysis:read')
  @ApiOperation({ summary: 'Get session details with message history' })
  @ApiResponse({
    status: 200,
    description: 'Session retrieved successfully',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: 'user-123',
        title: 'Weekly Usage Analysis',
        context: {},
        createdAt: '2025-01-15T10:00:00Z',
        updatedAt: '2025-01-15T10:30:00Z',
        messages: [
          {
            id: '660e8400-e29b-41d4-a716-446655440001',
            sessionId: '550e8400-e29b-41d4-a716-446655440000',
            role: 'user',
            content: 'What are the top 5 tenants?',
            metadata: {},
            createdAt: '2025-01-15T10:00:00Z',
          },
          {
            id: '660e8400-e29b-41d4-a716-446655440002',
            sessionId: '550e8400-e29b-41d4-a716-446655440000',
            role: 'assistant',
            content: 'Based on the metrics...',
            metadata: {
              inputTokens: 100,
              outputTokens: 200,
              model: 'gemini-1.5-flash',
            },
            createdAt: '2025-01-15T10:00:05Z',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Access denied' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSession(@Request() req: any, @Param('id') sessionId: string) {
    const userId = req.user.userId;
    return this.analysisService.getSession(sessionId, userId);
  }

  /**
   * Send a message in a session
   */
  @Post('sessions/:id/chat')
  @Permissions('analysis:write')
  @ApiOperation({ summary: 'Send a message and get AI response' })
  @ApiResponse({
    status: 200,
    description: 'Message sent and response received',
    schema: {
      example: {
        userMessage: {
          id: '660e8400-e29b-41d4-a716-446655440001',
          sessionId: '550e8400-e29b-41d4-a716-446655440000',
          role: 'user',
          content: 'What are the top 5 tenants?',
          metadata: {},
          createdAt: '2025-01-15T10:00:00Z',
        },
        assistantMessage: {
          id: '660e8400-e29b-41d4-a716-446655440002',
          sessionId: '550e8400-e29b-41d4-a716-446655440000',
          role: 'assistant',
          content: 'Based on the current metrics...',
          metadata: {
            inputTokens: 150,
            outputTokens: 250,
            model: 'gemini-1.5-flash',
            latencyMs: 1234,
          },
          createdAt: '2025-01-15T10:00:05Z',
        },
        metadata: {
          inputTokens: 150,
          outputTokens: 250,
          model: 'gemini-1.5-flash',
          latencyMs: 1234,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Access denied' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async sendMessage(
    @Request() req: any,
    @Param('id') sessionId: string,
    @Body() dto: SendMessageDto,
  ) {
    const userId = req.user.userId;
    return this.analysisService.sendMessage(sessionId, userId, dto);
  }

  /**
   * Delete a session
   */
  @Delete('sessions/:id')
  @Permissions('analysis:write')
  @ApiOperation({ summary: 'Delete an analysis session' })
  @ApiResponse({
    status: 200,
    description: 'Session deleted successfully',
    schema: {
      example: { success: true, message: 'Session deleted successfully' },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Access denied' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async deleteSession(@Request() req: any, @Param('id') sessionId: string) {
    const userId = req.user.userId;
    return this.analysisService.deleteSession(sessionId, userId);
  }
}
