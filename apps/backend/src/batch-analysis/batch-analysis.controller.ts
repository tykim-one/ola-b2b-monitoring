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
import { CreateScheduleDto, UpdateScheduleDto } from './dto/schedule.dto';
import { IssueFrequencyQueryDto } from './dto/issue-frequency.dto';
import { BatchAnalysisScheduler } from './batch-analysis.scheduler';

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
  constructor(
    private readonly batchAnalysisService: BatchAnalysisService,
    private readonly batchAnalysisScheduler: BatchAnalysisScheduler,
  ) {}

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

  @Post('jobs/:id/cancel')
  @Permissions('analysis:write')
  @ApiOperation({ summary: '배치 분석 작업 취소' })
  @ApiResponse({ status: 200, description: '작업 취소 요청됨' })
  @ApiResponse({ status: 404, description: '작업을 찾을 수 없음' })
  @ApiResponse({ status: 400, description: '실행 중인 작업만 취소 가능' })
  async cancelJob(@Param('id') id: string) {
    return this.batchAnalysisService.cancelJob(id);
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

  // ==================== Issue Frequency ====================

  @Get('issue-frequency')
  @Permissions('analysis:read')
  @ApiOperation({ summary: '이슈 빈도 리포트 조회' })
  @ApiResponse({
    status: 200,
    description: '이슈 빈도 리포트 반환 (상위 N개 이슈, 빈도순 정렬)',
  })
  async getIssueFrequency(@Query() query: IssueFrequencyQueryDto) {
    return this.batchAnalysisService.getIssueFrequency(query);
  }

  // ==================== Statistics ====================

  @Get('stats')
  @Permissions('analysis:read')
  @ApiOperation({ summary: '배치 분석 통계 조회' })
  @ApiResponse({ status: 200, description: '통계 정보 반환' })
  async getStatistics() {
    return this.batchAnalysisService.getJobStatistics();
  }

  // ==================== Migration ====================

  @Post('migrate-parse-fields')
  @Permissions('analysis:write')
  @ApiOperation({ summary: '기존 결과의 파싱 필드 마이그레이션' })
  @ApiResponse({
    status: 200,
    description: '마이그레이션 결과 (updated: 성공, failed: 실패 개수)',
  })
  async migrateParseFields() {
    return this.batchAnalysisService.migrateParseFields();
  }

  // ==================== Schedule Management ====================

  @Get('schedules')
  @Permissions('analysis:read')
  @ApiOperation({ summary: '스케줄 목록 조회' })
  @ApiResponse({ status: 200, description: '스케줄 목록 반환' })
  async listSchedules() {
    return this.batchAnalysisService.listSchedules();
  }

  @Get('schedules/:id')
  @Permissions('analysis:read')
  @ApiOperation({ summary: '스케줄 상세 조회' })
  @ApiResponse({ status: 200, description: '스케줄 상세 정보 반환' })
  @ApiResponse({ status: 404, description: '스케줄을 찾을 수 없음' })
  async getSchedule(@Param('id') id: string) {
    return this.batchAnalysisService.getSchedule(id);
  }

  @Post('schedules')
  @Permissions('analysis:write')
  @ApiOperation({ summary: '스케줄 생성' })
  @ApiResponse({ status: 201, description: '스케줄 생성 완료' })
  async createSchedule(@Body() dto: CreateScheduleDto) {
    const schedule = await this.batchAnalysisService.createSchedule(dto);
    // Reload scheduler with new config
    await this.batchAnalysisScheduler.reloadSchedule(schedule.id);
    return schedule;
  }

  @Put('schedules/:id')
  @Permissions('analysis:write')
  @ApiOperation({ summary: '스케줄 수정' })
  @ApiResponse({ status: 200, description: '스케줄 수정 완료' })
  @ApiResponse({ status: 404, description: '스케줄을 찾을 수 없음' })
  async updateSchedule(
    @Param('id') id: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    const schedule = await this.batchAnalysisService.updateSchedule(id, dto);
    // Reload scheduler with updated config
    await this.batchAnalysisScheduler.reloadSchedule(schedule.id);
    return schedule;
  }

  @Delete('schedules/:id')
  @Permissions('analysis:write')
  @ApiOperation({ summary: '스케줄 삭제' })
  @ApiResponse({ status: 200, description: '스케줄 삭제 완료' })
  @ApiResponse({ status: 404, description: '스케줄을 찾을 수 없음' })
  async deleteSchedule(@Param('id') id: string) {
    // Remove from scheduler first
    await this.batchAnalysisScheduler.removeSchedule(id);
    return this.batchAnalysisService.deleteSchedule(id);
  }

  @Post('schedules/:id/toggle')
  @Permissions('analysis:write')
  @ApiOperation({ summary: '스케줄 활성화/비활성화 토글' })
  @ApiResponse({ status: 200, description: '스케줄 상태 변경 완료' })
  @ApiResponse({ status: 404, description: '스케줄을 찾을 수 없음' })
  async toggleSchedule(@Param('id') id: string) {
    const schedule = await this.batchAnalysisService.toggleSchedule(id);
    // Reload scheduler
    await this.batchAnalysisScheduler.reloadSchedule(schedule.id);
    return schedule;
  }

  @Get('tenants')
  @Permissions('analysis:read')
  @ApiOperation({ summary: '분석 가능한 테넌트 목록 조회' })
  @ApiResponse({ status: 200, description: '테넌트 목록 반환' })
  async getAvailableTenants(@Query('days') days?: number) {
    const tenants = await this.batchAnalysisService.getAvailableTenants(
      days || 30,
    );
    return { tenants };
  }
}
