import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BigQuery } from '@google-cloud/bigquery';
import { PrismaService } from '../admin/database/prisma.service';
import { SentimentAnalysisService } from '../quality/sentiment-analysis.service';
import { CategoryClassifierService } from './category-classifier.service';
import { ProfileGeneratorService } from './profile-generator.service';
import { CacheService, CacheTTL } from '../cache/cache.service';
import {
  UserProfileSummary,
  SentimentAnalysisResult,
  CategoryDistribution,
  UserMessage,
  QuestionCategory,
  CategoryLabels,
  ProfilingJobInfo,
  JobStatus,
} from './interfaces/user-profiling.interface';
import { MetricsQueries } from '../metrics/queries/metrics.queries';

@Injectable()
export class UserProfilingService implements OnModuleInit {
  private readonly logger = new Logger(UserProfilingService.name);
  private bigQueryClient: BigQuery;
  private projectId: string;
  private datasetId: string;
  private tableName: string;
  private location: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly sentimentService: SentimentAnalysisService,
    private readonly categoryClassifier: CategoryClassifierService,
    private readonly profileGenerator: ProfileGeneratorService,
    private readonly cacheService: CacheService,
  ) {}

  onModuleInit() {
    this.projectId = this.configService.get<string>('GCP_PROJECT_ID') || '';
    this.datasetId = this.configService.get<string>('BIGQUERY_DATASET') || '';
    this.tableName = this.configService.get<string>('BIGQUERY_TABLE') || 'logs';
    this.location =
      this.configService.get<string>('GCP_BQ_LOCATION') || 'asia-northeast3';

    const credentials = this.configService.get<string>(
      'GOOGLE_APPLICATION_CREDENTIALS',
    );

    this.bigQueryClient = new BigQuery({
      projectId: this.projectId,
      keyFilename: credentials,
    });

    this.logger.log('UserProfilingService initialized');
  }

  /**
   * 유저 프로필 조회
   */
  async getUserProfile(
    userId: string,
    days: number = 30,
  ): Promise<UserProfileSummary> {
    const cacheKey = `user-profile:${userId}:${days}`;
    const cached = this.cacheService.get<UserProfileSummary>(cacheKey);
    if (cached) {
      return cached;
    }

    // DB에서 저장된 프로필 확인
    const savedProfile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    // BigQuery에서 유저 메시지 가져오기
    const messages = await this.getUserMessages(userId, days);

    // 실시간 감정 분석
    const sentiment = this.analyzeUserSentiment(messages);

    // 카테고리 분포 계산 (저장된 분석 결과 또는 빠른 분류)
    const categoryDistribution = await this.getCategoryDistribution(
      userId,
      messages,
    );

    // 상위 카테고리 계산
    const totalCategories = Object.values(categoryDistribution).reduce(
      (a, b) => a + b,
      0,
    );
    const topCategories = Object.entries(categoryDistribution)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({
        category: category as QuestionCategory,
        label: CategoryLabels[category as QuestionCategory] || category,
        count,
        percentage:
          totalCategories > 0 ? Math.round((count / totalCategories) * 100) : 0,
      }));

    // 테넌트 ID 가져오기
    const tenantId = messages.length > 0 ? messages[0].tenantId : 'unknown';

    const profile: UserProfileSummary = {
      userId,
      tenantId,
      totalMessages: messages.length,
      analyzedMessages: savedProfile?.analyzedMessages ?? 0,
      lastAnalyzedAt: savedProfile?.lastAnalyzedAt ?? null,
      frustrationRate:
        savedProfile?.frustrationRate ?? sentiment.frustrationLevel,
      aggressiveCount:
        savedProfile?.aggressiveCount ?? sentiment.aggressiveCount,
      sentiment,
      categoryDistribution,
      topCategories,
      behaviorSummary: savedProfile?.behaviorSummary ?? null,
      mainInterests: savedProfile?.mainInterests ?? null,
      painPoints: savedProfile?.painPoints ?? null,
    };

    this.cacheService.set(cacheKey, profile, CacheTTL.SHORT);
    return profile;
  }

  /**
   * 실시간 감정 분석 (기존 SentimentAnalysisService 활용)
   */
  analyzeUserSentiment(messages: UserMessage[]): SentimentAnalysisResult {
    if (messages.length === 0) {
      return {
        positive: 0,
        neutral: 100,
        negative: 0,
        aggressiveCount: 0,
        complaintCount: 0,
        frustrationLevel: 0,
        trend: 'stable',
      };
    }

    let positiveCount = 0;
    let neutralCount = 0;
    let negativeCount = 0;
    let aggressiveCount = 0;
    let complaintCount = 0;
    let totalFrustration = 0;

    for (const msg of messages) {
      const sentiment = this.sentimentService.analyzeSentiment(msg.userInput);

      totalFrustration += sentiment.frustrationLevel;

      if (sentiment.frustrationLevel > 0.6) {
        negativeCount++;
      } else if (sentiment.frustrationLevel > 0.3) {
        neutralCount++;
      } else {
        positiveCount++;
      }

      if (sentiment.frustrationLevel > 0.7) {
        aggressiveCount++;
      }

      if (sentiment.isComplaint) {
        complaintCount++;
      }
    }

    const total = messages.length;
    const frustrationLevels = messages.map(
      (m) =>
        this.sentimentService.analyzeSentiment(m.userInput).frustrationLevel,
    );

    // 트렌드 감지
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (frustrationLevels.length >= 3) {
      const midpoint = Math.floor(frustrationLevels.length / 2);
      const firstHalf = frustrationLevels.slice(0, midpoint);
      const secondHalf = frustrationLevels.slice(midpoint);
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg =
        secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      const diff = secondAvg - firstAvg;
      if (diff > 0.15) trend = 'increasing';
      else if (diff < -0.15) trend = 'decreasing';
    }

    return {
      positive: Math.round((positiveCount / total) * 100),
      neutral: Math.round((neutralCount / total) * 100),
      negative: Math.round((negativeCount / total) * 100),
      aggressiveCount,
      complaintCount,
      frustrationLevel: totalFrustration / total,
      trend,
    };
  }

  /**
   * 카테고리 분포 조회
   */
  async getCategoryDistribution(
    userId: string,
    messages?: UserMessage[],
  ): Promise<CategoryDistribution> {
    // DB에서 저장된 분석 결과 확인
    const savedAnalyses = await this.prisma.messageCategoryAnalysis.findMany({
      where: { userId },
    });

    if (savedAnalyses.length > 0) {
      const distribution: CategoryDistribution = {};
      for (const analysis of savedAnalyses) {
        distribution[analysis.category] =
          (distribution[analysis.category] || 0) + 1;
      }
      return distribution;
    }

    // 저장된 결과가 없으면 실시간 빠른 분류
    if (messages && messages.length > 0) {
      const distribution: CategoryDistribution = {};
      for (const msg of messages) {
        const result = this.categoryClassifier.classifyMessageQuick(
          msg.userInput,
        );
        distribution[result.category] =
          (distribution[result.category] || 0) + 1;
      }
      return distribution;
    }

    return {};
  }

  /**
   * BigQuery에서 유저 메시지 가져오기
   */
  async getUserMessages(
    userId: string,
    days: number = 30,
    limit: number = 100,
  ): Promise<UserMessage[]> {
    const { query, params } = MetricsQueries.userActivityDetail(
      this.projectId,
      this.datasetId,
      this.tableName,
      userId,
      days,
      limit,
      0,
    );

    try {
      const [rows] = await this.bigQueryClient.query({
        query,
        params,
        location: this.location,
      });

      return rows.map((row: any) => ({
        timestamp: new Date(row.timestamp?.value || row.timestamp),
        userInput: row.userInput || '',
        llmResponse: row.llmResponse || '',
        success: row.success === true,
        tenantId: row.tenantId || 'unknown',
        sessionId: row.sessionId,
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch user messages: ${error.message}`);
      return [];
    }
  }

  // ==================== 배치 작업 관련 ====================

  /**
   * 프로필링 배치 작업 생성
   */
  async createProfilingJob(
    targetDate: string,
    tenantId?: string,
  ): Promise<ProfilingJobInfo> {
    const job = await this.prisma.userProfilingJob.create({
      data: {
        status: 'PENDING',
        targetDate: new Date(targetDate),
        tenantId: tenantId || null,
      },
    });

    return this.mapJobToInfo(job);
  }

  /**
   * 배치 작업 목록 조회
   */
  async getProfilingJobs(
    status?: string,
    limit: number = 20,
  ): Promise<ProfilingJobInfo[]> {
    const jobs = await this.prisma.userProfilingJob.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return jobs.map((job) => this.mapJobToInfo(job));
  }

  /**
   * 배치 작업 실행
   */
  async runProfilingJob(jobId: string): Promise<ProfilingJobInfo> {
    const job = await this.prisma.userProfilingJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (job.status !== 'PENDING') {
      throw new Error(`Job is not in PENDING status: ${job.status}`);
    }

    // 작업 시작
    await this.prisma.userProfilingJob.update({
      where: { id: jobId },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    // 백그라운드에서 실행
    this.executeProfilingJob(jobId).catch((error) => {
      this.logger.error(`Job execution failed: ${error.message}`);
      this.prisma.userProfilingJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: error.message,
        },
      });
    });

    const updatedJob = await this.prisma.userProfilingJob.findUnique({
      where: { id: jobId },
    });

    return this.mapJobToInfo(updatedJob!);
  }

  /**
   * 배치 작업 실행 로직
   */
  private async executeProfilingJob(jobId: string): Promise<void> {
    const job = await this.prisma.userProfilingJob.findUnique({
      where: { id: jobId },
    });

    if (!job) return;

    const targetDateStr = job.targetDate.toISOString().split('T')[0];

    // 해당 날짜의 유저 목록 가져오기
    const users = await this.getUsersForDate(targetDateStr, job.tenantId);

    await this.prisma.userProfilingJob.update({
      where: { id: jobId },
      data: { totalUsers: users.length },
    });

    let processedUsers = 0;
    let failedUsers = 0;

    for (const user of users) {
      try {
        await this.analyzeAndSaveUserProfile(user.userId, user.tenantId);
        processedUsers++;
      } catch (error) {
        this.logger.error(
          `Failed to analyze user ${user.userId}: ${error.message}`,
        );
        failedUsers++;
      }

      // 진행 상황 업데이트
      await this.prisma.userProfilingJob.update({
        where: { id: jobId },
        data: { processedUsers, failedUsers },
      });
    }

    // 작업 완료
    await this.prisma.userProfilingJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });
  }

  /**
   * 특정 날짜의 유저 목록 가져오기
   */
  private async getUsersForDate(
    targetDate: string,
    tenantId?: string | null,
  ): Promise<Array<{ userId: string; tenantId: string }>> {
    const query = `
      SELECT DISTINCT
        request_metadata.x_enc_data AS userId,
        tenant_id AS tenantId
      FROM \`${this.projectId}.${this.datasetId}.${this.tableName}\`
      WHERE DATE(timestamp, 'Asia/Seoul') = '${targetDate}'
        AND request_metadata.x_enc_data IS NOT NULL
        ${tenantId ? `AND tenant_id = @tenantId` : ''}
      LIMIT 1000
    `;

    try {
      const [rows] = await this.bigQueryClient.query({
        query,
        params: tenantId ? { tenantId } : {},
        location: this.location,
      });
      return rows.map((row: any) => ({
        userId: row.userId,
        tenantId: row.tenantId,
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch users for date: ${error.message}`);
      return [];
    }
  }

  /**
   * 유저 프로필 분석 및 저장
   */
  private async analyzeAndSaveUserProfile(
    userId: string,
    tenantId: string,
  ): Promise<void> {
    // 메시지 가져오기
    const messages = await this.getUserMessages(userId, 30, 50);

    if (messages.length === 0) {
      return;
    }

    // LLM 카테고리 분류
    const categoryResults =
      await this.categoryClassifier.classifyMessagesWithLLM(messages);

    // 카테고리 분포 계산
    const categoryDistribution: CategoryDistribution = {};
    let aggressiveCount = 0;

    for (let i = 0; i < categoryResults.length; i++) {
      const result = categoryResults[i];
      categoryDistribution[result.category] =
        (categoryDistribution[result.category] || 0) + 1;

      if (result.isAggressive) {
        aggressiveCount++;
      }

      // 메시지별 분석 결과 저장
      const messageHash = this.categoryClassifier.generateMessageHash(
        messages[i].userInput,
      );

      await this.prisma.messageCategoryAnalysis.upsert({
        where: { userId_messageHash: { userId, messageHash } },
        create: {
          userId,
          tenantId,
          messageHash,
          category: result.category,
          confidence: result.confidence,
          sentiment: result.sentiment,
          isAggressive: result.isAggressive,
          userInput: messages[i].userInput,
          timestamp: messages[i].timestamp,
        },
        update: {
          category: result.category,
          confidence: result.confidence,
          sentiment: result.sentiment,
          isAggressive: result.isAggressive,
        },
      });
    }

    // 감정 분석
    const sentiment = this.analyzeUserSentiment(messages);

    // LLM 프로필 요약 생성
    const profileSummary = await this.profileGenerator.generateProfileSummary(
      userId,
      messages,
      categoryDistribution,
    );

    // 유저 프로필 저장
    await this.prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        tenantId,
        frustrationRate: sentiment.frustrationLevel,
        aggressiveCount,
        categoryDistribution: JSON.stringify(categoryDistribution),
        behaviorSummary: profileSummary.behaviorSummary,
        mainInterests: profileSummary.mainInterests,
        painPoints: profileSummary.painPoints,
        totalMessages: messages.length,
        analyzedMessages: messages.length,
        lastAnalyzedAt: new Date(),
      },
      update: {
        tenantId,
        frustrationRate: sentiment.frustrationLevel,
        aggressiveCount,
        categoryDistribution: JSON.stringify(categoryDistribution),
        behaviorSummary: profileSummary.behaviorSummary,
        mainInterests: profileSummary.mainInterests,
        painPoints: profileSummary.painPoints,
        totalMessages: messages.length,
        analyzedMessages: messages.length,
        lastAnalyzedAt: new Date(),
      },
    });
  }

  /**
   * Job 모델을 Info DTO로 변환
   */
  private mapJobToInfo(job: any): ProfilingJobInfo {
    return {
      id: job.id,
      status: job.status as JobStatus,
      targetDate: job.targetDate,
      tenantId: job.tenantId,
      totalUsers: job.totalUsers,
      processedUsers: job.processedUsers,
      failedUsers: job.failedUsers,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
    };
  }
}
