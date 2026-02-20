import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Permissions } from '../admin/auth/decorators/permissions.decorator';
import { IbkChatReportService } from './ibk-chat-report.service';
import { GenerateReportDto } from './dto/generate-report.dto';
import { ListReportsDto } from './dto/list-reports.dto';

@ApiTags('ibk-chat-report')
@ApiBearerAuth()
@Controller('projects/ibks/api/ibk-chat-report')
export class IbkChatReportController {
  constructor(
    private readonly ibkChatReportService: IbkChatReportService,
  ) {}

  @Permissions('analysis:read')
  @Get()
  @ApiOperation({ summary: 'IBK-CHAT 일일 리포트 목록 조회' })
  @ApiResponse({ status: 200, description: '리포트 목록 반환 (reportMarkdown 미포함)' })
  async listReports(@Query() dto: ListReportsDto) {
    return this.ibkChatReportService.listReports(dto);
  }

  @Permissions('analysis:write')
  @Post('generate')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: '수동 리포트 생성 트리거 (비동기)' })
  @ApiResponse({ status: 202, description: '리포트 생성 시작됨' })
  @ApiResponse({ status: 409, description: '이미 실행 중이거나 완료된 리포트 존재' })
  async generateReport(@Body() dto: GenerateReportDto) {
    return this.ibkChatReportService.generateDailyReport(
      dto.targetDate,
      dto.force,
    );
  }

  @Permissions('analysis:read')
  @Get('stats')
  @ApiOperation({ summary: '리포트 통계 조회 (총 건수, 상태별)' })
  @ApiResponse({ status: 200, description: '통계 정보 반환' })
  async getStats() {
    return this.ibkChatReportService.getStats();
  }

  @Permissions('analysis:read')
  @Get(':date')
  @ApiOperation({ summary: '특정 날짜 리포트 조회 (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: '리포트 상세 (reportMarkdown 포함)' })
  @ApiResponse({ status: 404, description: '리포트 없음' })
  async getReport(@Param('date') date: string) {
    return this.ibkChatReportService.getReport(date);
  }

  @Permissions('analysis:delete')
  @Delete(':id')
  @ApiOperation({ summary: '리포트 삭제' })
  @ApiResponse({ status: 200, description: '삭제 완료' })
  @ApiResponse({ status: 404, description: '리포트 없음' })
  async deleteReport(@Param('id') id: string) {
    return this.ibkChatReportService.deleteReport(id);
  }
}
