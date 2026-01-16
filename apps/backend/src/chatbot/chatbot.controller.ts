import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { ChatRequestDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../admin/auth/guards/jwt-auth.guard';
import { Public } from '../admin/auth/decorators/public.decorator';

/**
 * Chatbot Controller
 *
 * Provides API endpoints for the global floating chatbot feature.
 * Allows users to ask questions about dashboard data with AI-powered responses.
 */
@Controller('api/chatbot')
@UseGuards(JwtAuthGuard)
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  /**
   * Send a chat message and get AI response
   * POST /api/chatbot/chat
   */
  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chat(@Body() chatRequest: ChatRequestDto) {
    const { message, pageContext, sessionId } = chatRequest;

    const result = await this.chatbotService.chat(
      message,
      pageContext,
      sessionId,
    );

    return result;
  }

  /**
   * Get session history
   * GET /api/chatbot/sessions/:sessionId
   */
  @Get('sessions/:sessionId')
  async getSession(@Param('sessionId') sessionId: string) {
    const session = this.chatbotService.getSession(sessionId);

    if (!session) {
      return {
        success: false,
        error: 'Session not found',
      };
    }

    return {
      success: true,
      data: session,
    };
  }

  /**
   * Clear session
   * DELETE /api/chatbot/sessions/:sessionId
   */
  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.OK)
  async clearSession(@Param('sessionId') sessionId: string) {
    const deleted = this.chatbotService.clearSession(sessionId);

    return {
      success: deleted,
      message: deleted ? 'Session cleared' : 'Session not found',
    };
  }
}
