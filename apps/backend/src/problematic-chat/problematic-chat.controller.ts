import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProblematicChatService } from './problematic-chat.service';
import {
  CreateRuleDto,
  UpdateRuleDto,
  ProblematicChatFilterDto,
  ProblematicChatStatsFilterDto,
} from './dto';
import { Public } from '../admin/auth/decorators/public.decorator';

@Controller('api/problematic-chat')
export class ProblematicChatController {
  constructor(private readonly service: ProblematicChatService) {}

  // ==================== 규칙 API ====================

  @Get('rules')
  @Public()
  async getAllRules() {
    const rules = await this.service.getAllRules();
    return {
      success: true,
      data: rules,
      count: rules.length,
    };
  }

  @Get('rules/:id')
  @Public()
  async getRuleById(@Param('id') id: string) {
    const rule = await this.service.getRuleById(id);
    return {
      success: true,
      data: rule,
    };
  }

  @Get('rules/:id/preview-query')
  @Public()
  async getRulePreviewQuery(
    @Param('id') id: string,
    @Query('days') days?: string,
  ) {
    const daysNum = days ? parseInt(days, 10) : 7;
    const result = await this.service.generateRulePreviewQuery(id, daysNum);
    return {
      success: true,
      data: result,
    };
  }

  @Post('rules')
  @HttpCode(HttpStatus.CREATED)
  async createRule(@Body() dto: CreateRuleDto) {
    const rule = await this.service.createRule(dto);
    return {
      success: true,
      data: rule,
    };
  }

  @Put('rules/:id')
  async updateRule(@Param('id') id: string, @Body() dto: UpdateRuleDto) {
    const rule = await this.service.updateRule(id, dto);
    return {
      success: true,
      data: rule,
    };
  }

  @Delete('rules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRule(@Param('id') id: string) {
    await this.service.deleteRule(id);
  }

  // ==================== 문제 채팅 조회 API ====================

  @Get('chats')
  @Public()
  async getProblematicChats(@Query() filter: ProblematicChatFilterDto) {
    const chats = await this.service.getProblematicChats(filter);
    return {
      success: true,
      data: chats,
      count: chats.length,
      filter: {
        days: filter.days,
        limit: filter.limit,
        offset: filter.offset,
      },
    };
  }

  @Get('stats')
  @Public()
  async getProblematicChatStats(
    @Query() filter: ProblematicChatStatsFilterDto,
  ) {
    const stats = await this.service.getProblematicChatStats(filter);
    return {
      success: true,
      data: stats,
    };
  }
}
