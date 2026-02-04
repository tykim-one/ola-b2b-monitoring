import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BigQuery } from '@google-cloud/bigquery';
import { FAQClusteringService } from './services/faq-clustering.service';
import { ReasonAnalysisService } from './services/reason-analysis.service';
import {
  FAQAnalysisRequestDto,
  FAQAnalysisResponseDto,
  CreateFAQJobDto,
  FAQJobDto,
  FAQJobResultDto,
} from './dto/faq-analysis.dto';
import { RawQuestion, FAQCluster } from './interfaces/faq-cluster.interface';
import { PrismaService } from '../admin/database/prisma.service';

/**
 * FAQ Analysis Service
 *
 * BigQuery에서 질문 데이터를 추출하고, 클러스터링 및 사유 분석을 수행
 */
@Injectable()
export class FAQAnalysisService {
  private readonly logger = new Logger(FAQAnalysisService.name);
  private bigQueryClient: BigQuery | null = null;
  private readonly projectId: string;
  private readonly datasetId: string;
  private readonly tableName: string;
  private readonly location: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly clusteringService: FAQClusteringService,
    private readonly reasonAnalysisService: ReasonAnalysisService,
    private readonly prisma: PrismaService,
  ) {
    this.projectId = this.configService.get<string>('GCP_PROJECT_ID', '');
    this.datasetId = this.configService.get<string>('BIGQUERY_DATASET', '');
    this.tableName = this.configService.get<string>('BIGQUERY_TABLE', '');
    this.location = this.configService.get<string>(
      'GCP_BQ_LOCATION',
      'asia-northeast3',
    );

    this.initializeBigQuery();
  }

  private async initializeBigQuery(): Promise<void> {
    try {
      const keyFilename = this.configService.get<string>(
        'GOOGLE_APPLICATION_CREDENTIALS',
      );

      this.bigQueryClient = new BigQuery({
        projectId: this.projectId,
        keyFilename: keyFilename || undefined,
      });

      this.logger.log('BigQuery client initialized for FAQ analysis');
    } catch (error) {
      this.logger.error(`Failed to initialize BigQuery: ${error.message}`);
    }
  }

  /**
   * FAQ 분석 실행 (메인 진입점)
   */
  async analyze(
    request: FAQAnalysisRequestDto,
  ): Promise<FAQAnalysisResponseDto> {
    const startTime = Date.now();
    this.logger.log(
      `FAQ 분석 시작: period=${request.periodDays}일, topN=${request.topN}, tenant=${request.tenantId || '전체'}`,
    );

    try {
      // 1. BigQuery에서 질문 데이터 추출
      const rawQuestions = await this.fetchQuestions(
        request.periodDays,
        request.tenantId,
      );

      if (rawQuestions.length === 0) {
        return this.createEmptyResponse(request);
      }

      // 2. 텍스트 정규화 및 1차 그룹화
      const normalizedGroups =
        this.clusteringService.groupByNormalization(rawQuestions);

      // 3. LLM 기반 유사 그룹 병합
      const { clusters: mergedClusters, llmApplied } =
        await this.clusteringService.mergeWithLLM(
          normalizedGroups,
          request.topN,
        );

      // 4. 각 클러스터별 사유 분석
      const faqClusters =
        await this.reasonAnalysisService.analyzeReasonsBatch(mergedClusters);

      // 5. 응답 생성
      const endTime = Date.now();
      this.logger.log(
        `FAQ 분석 완료: ${faqClusters.length}개 클러스터, ${endTime - startTime}ms`,
      );

      return this.createResponse(
        request,
        rawQuestions.length,
        faqClusters,
        llmApplied,
      );
    } catch (error) {
      this.logger.error(`FAQ 분석 실패: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * BigQuery에서 질문 데이터 추출
   */
  private async fetchQuestions(
    periodDays: number,
    tenantId?: string,
  ): Promise<RawQuestion[]> {
    if (!this.bigQueryClient) {
      throw new Error('BigQuery client not initialized');
    }

    const tenantFilter = tenantId ? `AND tenant_id = '${tenantId}'` : '';

    const query = `
      SELECT
        user_input,
        tenant_id,
        COUNT(*) as count
      FROM \`${this.projectId}.${this.datasetId}.${this.tableName}\`
      WHERE
        timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${periodDays} DAY)
        AND user_input IS NOT NULL
        AND TRIM(user_input) != ''
        ${tenantFilter}
      GROUP BY user_input, tenant_id
      ORDER BY count DESC
      LIMIT 1000
    `;

    this.logger.debug(
      `FAQ 쿼리 실행: period=${periodDays}, tenant=${tenantId}`,
    );

    try {
      const [rows] = await this.bigQueryClient.query({
        query,
        location: this.location,
      });

      return rows.map((row: any) => ({
        userInput: row.user_input,
        tenantId: row.tenant_id,
        count: Number(row.count),
      }));
    } catch (error) {
      this.logger.error(`BigQuery 쿼리 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * 빈 응답 생성
   */
  private createEmptyResponse(
    request: FAQAnalysisRequestDto,
  ): FAQAnalysisResponseDto {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - request.periodDays);

    return {
      analyzedAt: now.toISOString(),
      totalQuestions: 0,
      period: {
        start: startDate.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0],
        days: request.periodDays,
      },
      clusters: [],
      filters: {
        tenantId: request.tenantId,
        topN: request.topN,
      },
      llmMergeApplied: false,
    };
  }

  /**
   * 응답 생성
   */
  private createResponse(
    request: FAQAnalysisRequestDto,
    totalQuestions: number,
    clusters: FAQCluster[],
    llmMergeApplied: boolean,
  ): FAQAnalysisResponseDto {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - request.periodDays);

    return {
      analyzedAt: now.toISOString(),
      totalQuestions,
      period: {
        start: startDate.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0],
        days: request.periodDays,
      },
      clusters,
      filters: {
        tenantId: request.tenantId,
        topN: request.topN,
      },
      llmMergeApplied,
    };
  }

  /**
   * 사용 가능한 테넌트 목록 조회
   */
  async getTenants(periodDays: number = 30): Promise<string[]> {
    if (!this.bigQueryClient) {
      throw new Error('BigQuery client not initialized');
    }

    const query = `
      SELECT DISTINCT tenant_id
      FROM \`${this.projectId}.${this.datasetId}.${this.tableName}\`
      WHERE
        timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${periodDays} DAY)
        AND tenant_id IS NOT NULL
      ORDER BY tenant_id
    `;

    try {
      const [rows] = await this.bigQueryClient.query({
        query,
        location: this.location,
      });

      return rows.map((row: any) => row.tenant_id);
    } catch (error) {
      this.logger.error(`테넌트 목록 조회 실패: ${error.message}`);
      throw error;
    }
  }

  // ==================== Job CRUD 메서드 ====================

  /**
   * FAQ 분석 Job 생성
   */
  async createJob(dto: CreateFAQJobDto): Promise<FAQJobDto> {
    const job = await this.prisma.fAQAnalysisJob.create({
      data: {
        tenantId: dto.tenantId || null,
        periodDays: dto.periodDays,
        topN: dto.topN,
        status: 'PENDING',
      },
    });

    this.logger.log(`FAQ Job 생성: ${job.id}`);
    return this.mapJobToDto(job);
  }

  /**
   * FAQ 분석 Job 목록 조회
   */
  async getJobs(filter?: {
    status?: string;
    tenantId?: string;
  }): Promise<FAQJobDto[]> {
    const where: any = {};

    if (filter?.status) {
      where.status = filter.status;
    }
    if (filter?.tenantId) {
      where.tenantId = filter.tenantId;
    }

    const jobs = await this.prisma.fAQAnalysisJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { results: true },
        },
      },
    });

    return jobs.map((job) => this.mapJobToDto(job));
  }

  /**
   * FAQ 분석 Job 상세 조회
   */
  async getJob(id: string): Promise<FAQJobDto> {
    const job = await this.prisma.fAQAnalysisJob.findUnique({
      where: { id },
      include: {
        _count: {
          select: { results: true },
        },
      },
    });

    if (!job) {
      throw new NotFoundException(`FAQ Job not found: ${id}`);
    }

    return this.mapJobToDto(job);
  }

  /**
   * FAQ 분석 Job 실행
   */
  async runJob(id: string): Promise<FAQJobDto> {
    const job = await this.prisma.fAQAnalysisJob.findUnique({
      where: { id },
    });

    if (!job) {
      throw new NotFoundException(`FAQ Job not found: ${id}`);
    }

    if (job.status !== 'PENDING') {
      throw new Error(`Job is not in PENDING status: ${job.status}`);
    }

    // 상태 업데이트
    await this.prisma.fAQAnalysisJob.update({
      where: { id },
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    // 비동기 실행
    this.executeJob(id, job.periodDays, job.topN, job.tenantId || undefined);

    return this.getJob(id);
  }

  /**
   * FAQ 분석 Job 실제 실행 (비동기)
   */
  private async executeJob(
    jobId: string,
    periodDays: number,
    topN: number,
    tenantId?: string,
  ): Promise<void> {
    try {
      this.logger.log(`FAQ Job 실행 시작: ${jobId}`);

      // 1. BigQuery에서 질문 데이터 추출
      const rawQuestions = await this.fetchQuestions(periodDays, tenantId);

      if (rawQuestions.length === 0) {
        await this.prisma.fAQAnalysisJob.update({
          where: { id: jobId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            totalQuestions: 0,
            clusterCount: 0,
            llmMergeApplied: false,
          },
        });
        return;
      }

      // 2. 텍스트 정규화 및 1차 그룹화
      const normalizedGroups =
        this.clusteringService.groupByNormalization(rawQuestions);

      // 3. LLM 기반 유사 그룹 병합
      const { clusters: mergedClusters, llmApplied } =
        await this.clusteringService.mergeWithLLM(normalizedGroups, topN);

      // 4. 각 클러스터별 사유 분석
      const faqClusters =
        await this.reasonAnalysisService.analyzeReasonsBatch(mergedClusters);

      // 5. 결과 저장
      for (let i = 0; i < faqClusters.length; i++) {
        const cluster = faqClusters[i];
        await this.prisma.fAQAnalysisResult.create({
          data: {
            jobId,
            rank: i + 1,
            representativeQuestion: cluster.representativeQuestion,
            frequency: cluster.frequency,
            reasonAnalysis: cluster.reasonAnalysis,
            isMerged: cluster.isMerged,
            questions: JSON.stringify(cluster.questions),
          },
        });
      }

      // 6. Job 완료 처리
      await this.prisma.fAQAnalysisJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          totalQuestions: rawQuestions.length,
          clusterCount: faqClusters.length,
          llmMergeApplied: llmApplied,
        },
      });

      this.logger.log(
        `FAQ Job 완료: ${jobId}, ${faqClusters.length}개 클러스터`,
      );
    } catch (error) {
      this.logger.error(`FAQ Job 실패: ${jobId}, ${error.message}`);
      await this.prisma.fAQAnalysisJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: error.message,
        },
      });
    }
  }

  /**
   * FAQ 분석 Job 삭제
   */
  async deleteJob(id: string): Promise<void> {
    const job = await this.prisma.fAQAnalysisJob.findUnique({
      where: { id },
    });

    if (!job) {
      throw new NotFoundException(`FAQ Job not found: ${id}`);
    }

    await this.prisma.fAQAnalysisJob.delete({
      where: { id },
    });

    this.logger.log(`FAQ Job 삭제: ${id}`);
  }

  /**
   * FAQ 분석 Job 결과 조회
   */
  async getJobResults(jobId: string): Promise<FAQJobResultDto[]> {
    const results = await this.prisma.fAQAnalysisResult.findMany({
      where: { jobId },
      orderBy: { rank: 'asc' },
    });

    return results.map((result) => ({
      id: result.id,
      jobId: result.jobId,
      rank: result.rank,
      representativeQuestion: result.representativeQuestion,
      frequency: result.frequency,
      reasonAnalysis: result.reasonAnalysis,
      isMerged: result.isMerged,
      questions: JSON.parse(result.questions),
      createdAt: result.createdAt.toISOString(),
    }));
  }

  /**
   * Job 엔티티를 DTO로 변환
   */
  private mapJobToDto(job: any): FAQJobDto {
    return {
      id: job.id,
      status: job.status,
      tenantId: job.tenantId,
      periodDays: job.periodDays,
      topN: job.topN,
      totalQuestions: job.totalQuestions,
      clusterCount: job.clusterCount,
      llmMergeApplied: job.llmMergeApplied,
      startedAt: job.startedAt?.toISOString() || null,
      completedAt: job.completedAt?.toISOString() || null,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt.toISOString(),
      resultCount: job._count?.results || 0,
    };
  }
}
