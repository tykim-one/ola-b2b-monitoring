import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { UserProfilingService } from './user-profiling.service';
import {
  GetUserProfileDto,
  GetSentimentDto,
  GetCategoriesDto,
  CreateProfilingJobDto,
  GetJobsDto,
} from './dto/user-profile.dto';
import { Public } from '../admin/auth/decorators/public.decorator';

@Controller('api/user-profiling')
export class UserProfilingController {
  constructor(private readonly userProfilingService: UserProfilingService) {}

  /**
   * 유저 프로필 조회
   */
  @Public()
  @Get(':userId')
  async getUserProfile(
    @Param('userId') userId: string,
    @Query() query: GetUserProfileDto,
  ) {
    try {
      const profile = await this.userProfilingService.getUserProfile(
        userId,
        query.days,
      );
      return profile;
    } catch (error) {
      throw new HttpException(
        `Failed to get user profile: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 유저 실시간 감정 분석
   */
  @Public()
  @Get(':userId/sentiment')
  async getUserSentiment(
    @Param('userId') userId: string,
    @Query() query: GetSentimentDto,
  ) {
    try {
      const messages = await this.userProfilingService.getUserMessages(
        userId,
        query.days,
      );
      const sentiment =
        this.userProfilingService.analyzeUserSentiment(messages);
      return sentiment;
    } catch (error) {
      throw new HttpException(
        `Failed to analyze sentiment: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 유저 카테고리 분포 조회
   */
  @Public()
  @Get(':userId/categories')
  async getUserCategories(
    @Param('userId') userId: string,
    @Query() query: GetCategoriesDto,
  ) {
    try {
      const messages = await this.userProfilingService.getUserMessages(
        userId,
        query.days,
      );
      const categories = await this.userProfilingService.getCategoryDistribution(
        userId,
        messages,
      );
      return categories;
    } catch (error) {
      throw new HttpException(
        `Failed to get categories: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ==================== 배치 작업 API ====================

  /**
   * 프로필링 배치 작업 목록 조회
   */
  @Public()
  @Get('jobs')
  async getJobs(@Query() query: GetJobsDto) {
    try {
      const jobs = await this.userProfilingService.getProfilingJobs(
        query.status,
        query.limit,
      );
      return jobs;
    } catch (error) {
      throw new HttpException(
        `Failed to get jobs: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 프로필링 배치 작업 생성
   */
  @Public()
  @Post('jobs')
  async createJob(@Body() body: CreateProfilingJobDto) {
    try {
      const job = await this.userProfilingService.createProfilingJob(
        body.targetDate,
        body.tenantId,
      );
      return job;
    } catch (error) {
      throw new HttpException(
        `Failed to create job: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 프로필링 배치 작업 실행
   */
  @Public()
  @Post('jobs/:jobId/run')
  async runJob(@Param('jobId') jobId: string) {
    try {
      const job = await this.userProfilingService.runProfilingJob(jobId);
      return job;
    } catch (error) {
      throw new HttpException(
        `Failed to run job: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
