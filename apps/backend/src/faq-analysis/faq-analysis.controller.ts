import {
  Controller,
  Post,
  Get,
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
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { FAQAnalysisService } from './faq-analysis.service';
import {
  FAQAnalysisRequestDto,
  FAQAnalysisResponseDto,
  CreateFAQJobDto,
  FAQJobDto,
  FAQJobResultDto,
} from './dto/faq-analysis.dto';

/**
 * FAQ Analysis Controller
 *
 * FAQ 분석 API 엔드포인트
 */
@ApiTags('FAQ Analysis')
@ApiBearerAuth()
@Controller('api/quality/faq-analysis')
export class FAQAnalysisController {
  constructor(private readonly faqAnalysisService: FAQAnalysisService) {}

  /**
   * FAQ 분석 실행
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'FAQ 분석 실행',
    description:
      '지정된 기간의 질문 데이터를 분석하여 자주 묻는 질문(FAQ)을 클러스터링하고 사유를 분석합니다.',
  })
  @ApiResponse({
    status: 200,
    description: 'FAQ 분석 결과',
    type: FAQAnalysisResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청 파라미터',
  })
  @ApiResponse({
    status: 500,
    description: '서버 오류',
  })
  async analyze(
    @Body() request: FAQAnalysisRequestDto,
  ): Promise<FAQAnalysisResponseDto> {
    return this.faqAnalysisService.analyze(request);
  }

  /**
   * 사용 가능한 테넌트 목록 조회
   */
  @Get('tenants')
  @ApiOperation({
    summary: '테넌트 목록 조회',
    description: '분석 가능한 테넌트 ID 목록을 반환합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '테넌트 ID 목록',
    type: [String],
  })
  async getTenants(
    @Query('periodDays') periodDays?: number,
  ): Promise<string[]> {
    return this.faqAnalysisService.getTenants(periodDays || 30);
  }

  // ==================== Job CRUD 엔드포인트 ====================

  /**
   * FAQ Job 목록 조회
   */
  @Get('jobs')
  @ApiOperation({
    summary: 'FAQ Job 목록 조회',
    description: 'FAQ 분석 작업 목록을 조회합니다.',
  })
  @ApiQuery({ name: 'status', required: false, description: 'Job 상태 필터' })
  @ApiQuery({ name: 'tenantId', required: false, description: '테넌트 ID 필터' })
  @ApiResponse({
    status: 200,
    description: 'FAQ Job 목록',
    type: [FAQJobDto],
  })
  async getJobs(
    @Query('status') status?: string,
    @Query('tenantId') tenantId?: string,
  ): Promise<FAQJobDto[]> {
    return this.faqAnalysisService.getJobs({ status, tenantId });
  }

  /**
   * FAQ Job 상세 조회
   */
  @Get('jobs/:id')
  @ApiOperation({
    summary: 'FAQ Job 상세 조회',
    description: '특정 FAQ 분석 작업의 상세 정보를 조회합니다.',
  })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({
    status: 200,
    description: 'FAQ Job 상세',
    type: FAQJobDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Job을 찾을 수 없음',
  })
  async getJob(@Param('id') id: string): Promise<FAQJobDto> {
    return this.faqAnalysisService.getJob(id);
  }

  /**
   * FAQ Job 생성
   */
  @Post('jobs')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'FAQ Job 생성',
    description: '새로운 FAQ 분석 작업을 생성합니다 (PENDING 상태).',
  })
  @ApiResponse({
    status: 201,
    description: '생성된 FAQ Job',
    type: FAQJobDto,
  })
  async createJob(@Body() dto: CreateFAQJobDto): Promise<FAQJobDto> {
    return this.faqAnalysisService.createJob(dto);
  }

  /**
   * FAQ Job 실행
   */
  @Post('jobs/:id/run')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'FAQ Job 실행',
    description: 'PENDING 상태의 FAQ 분석 작업을 실행합니다.',
  })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({
    status: 200,
    description: '실행 시작된 FAQ Job',
    type: FAQJobDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Job을 찾을 수 없음',
  })
  async runJob(@Param('id') id: string): Promise<FAQJobDto> {
    return this.faqAnalysisService.runJob(id);
  }

  /**
   * FAQ Job 삭제
   */
  @Delete('jobs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'FAQ Job 삭제',
    description: 'FAQ 분석 작업과 관련 결과를 삭제합니다.',
  })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({
    status: 204,
    description: '삭제 완료',
  })
  @ApiResponse({
    status: 404,
    description: 'Job을 찾을 수 없음',
  })
  async deleteJob(@Param('id') id: string): Promise<void> {
    return this.faqAnalysisService.deleteJob(id);
  }

  /**
   * FAQ Job 결과 조회
   */
  @Get('jobs/:id/results')
  @ApiOperation({
    summary: 'FAQ Job 결과 조회',
    description: 'FAQ 분석 작업의 클러스터 결과를 조회합니다.',
  })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({
    status: 200,
    description: 'FAQ Job 결과 목록',
    type: [FAQJobResultDto],
  })
  async getJobResults(@Param('id') id: string): Promise<FAQJobResultDto[]> {
    return this.faqAnalysisService.getJobResults(id);
  }
}
