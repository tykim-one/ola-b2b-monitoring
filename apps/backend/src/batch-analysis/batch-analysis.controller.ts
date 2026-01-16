import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Permissions } from '../admin/auth/decorators/permissions.decorator';
import { BatchAnalysisService } from './batch-analysis.service';
import { CreateJobDto } from './dto/create-job.dto';
import {
  CreatePromptTemplateDto,
  UpdatePromptTemplateDto,
} from './dto/create-prompt-template.dto';
import { JobFilterDto, ResultFilterDto } from './dto/job-filter.dto';

/**
 * Batch Analysis Controller
 *
 * Manages batch analysis jobs for daily chat quality analysis.
 * Guards are applied globally via AdminModule (JwtAuthGuard, PermissionsGuard).
 */
@ApiTags('Batch Analysis')
@ApiBearerAuth()
@Controller('api/admin/batch-analysis')
export class BatchAnalysisController {
  constructor(private readonly batchAnalysisService: BatchAnalysisService) {}

  // ==================== Jobs ====================

  @Get('jobs')
  @Permissions('analysis:read')
  @ApiOperation({ summary: '배치 분석 작업 목록 조회' })
  @ApiResponse({ status: 200, description: '작업 목록 반환' })
  async listJobs(@Query() filter: JobFilterDto) {
    return this.batchAnalysisService.listJobs(filter);
  }

  @Get('jobs/:id')
  @Permissions('analysis:read')
  @ApiOperation({ summary: '배치 분석 작업 상세 조회' })
  @ApiResponse({ status: 200, description: '작업 상세 정보 반환' })
  @ApiResponse({ status: 404, description: '작업을 찾을 수 없음' })
  async getJob(@Param('id') id: string) {
    return this.batchAnalysisService.getJob(id);
  }

  @Post('jobs')
  @Permissions('analysis:write')
  @ApiOperation({ summary: '배치 분석 작업 생성' })
  @ApiResponse({ status: 201, description: '작업 생성 완료' })
  async createJob(@Body() dto: CreateJobDto) {
    return this.batchAnalysisService.createJob(dto);
  }

  @Post('jobs/:id/run')
  @Permissions('analysis:write')
  @ApiOperation({ summary: '배치 분석 작업 실행' })
  @ApiResponse({ status: 200, description: '작업 실행 시작' })
  @ApiResponse({ status: 404, description: '작업을 찾을 수 없음' })
  async runJob(@Param('id') id: string) {
    return this.batchAnalysisService.runJob(id);
  }

  @Delete('jobs/:id')
  @Permissions('analysis:write')
  @ApiOperation({ summary: '배치 분석 작업 삭제' })
  @ApiResponse({ status: 200, description: '작업 삭제 완료' })
  @ApiResponse({ status: 404, description: '작업을 찾을 수 없음' })
  async deleteJob(@Param('id') id: string) {
    return this.batchAnalysisService.deleteJob(id);
  }

  // ==================== Results ====================

  @Get('results')
  @Permissions('analysis:read')
  @ApiOperation({ summary: '분석 결과 목록 조회' })
  @ApiResponse({ status: 200, description: '결과 목록 반환' })
  async listResults(@Query() filter: ResultFilterDto) {
    return this.batchAnalysisService.listResults(filter);
  }

  @Get('results/:id')
  @Permissions('analysis:read')
  @ApiOperation({ summary: '분석 결과 상세 조회' })
  @ApiResponse({ status: 200, description: '결과 상세 정보 반환' })
  @ApiResponse({ status: 404, description: '결과를 찾을 수 없음' })
  async getResult(@Param('id') id: string) {
    return this.batchAnalysisService.getResult(id);
  }

  // ==================== Prompt Templates ====================

  @Get('prompts')
  @Permissions('analysis:read')
  @ApiOperation({ summary: '프롬프트 템플릿 목록 조회' })
  @ApiResponse({ status: 200, description: '템플릿 목록 반환' })
  async listPromptTemplates() {
    return this.batchAnalysisService.listPromptTemplates();
  }

  @Get('prompts/:id')
  @Permissions('analysis:read')
  @ApiOperation({ summary: '프롬프트 템플릿 상세 조회' })
  @ApiResponse({ status: 200, description: '템플릿 상세 정보 반환' })
  @ApiResponse({ status: 404, description: '템플릿을 찾을 수 없음' })
  async getPromptTemplate(@Param('id') id: string) {
    return this.batchAnalysisService.getPromptTemplate(id);
  }

  @Post('prompts')
  @Permissions('analysis:write')
  @ApiOperation({ summary: '프롬프트 템플릿 생성' })
  @ApiResponse({ status: 201, description: '템플릿 생성 완료' })
  async createPromptTemplate(@Body() dto: CreatePromptTemplateDto) {
    return this.batchAnalysisService.createPromptTemplate(dto);
  }

  @Put('prompts/:id')
  @Permissions('analysis:write')
  @ApiOperation({ summary: '프롬프트 템플릿 수정' })
  @ApiResponse({ status: 200, description: '템플릿 수정 완료' })
  @ApiResponse({ status: 404, description: '템플릿을 찾을 수 없음' })
  async updatePromptTemplate(
    @Param('id') id: string,
    @Body() dto: UpdatePromptTemplateDto,
  ) {
    return this.batchAnalysisService.updatePromptTemplate(id, dto);
  }

  @Delete('prompts/:id')
  @Permissions('analysis:write')
  @ApiOperation({ summary: '프롬프트 템플릿 삭제' })
  @ApiResponse({ status: 200, description: '템플릿 삭제 완료' })
  @ApiResponse({ status: 404, description: '템플릿을 찾을 수 없음' })
  async deletePromptTemplate(@Param('id') id: string) {
    return this.batchAnalysisService.deletePromptTemplate(id);
  }

  // ==================== Statistics ====================

  @Get('stats')
  @Permissions('analysis:read')
  @ApiOperation({ summary: '배치 분석 통계 조회' })
  @ApiResponse({ status: 200, description: '통계 정보 반환' })
  async getStatistics() {
    return this.batchAnalysisService.getJobStatistics();
  }
}
