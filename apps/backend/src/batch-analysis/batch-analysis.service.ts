import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BigQuery } from '@google-cloud/bigquery';
import { PrismaService } from '../admin/database/prisma.service';
import { LLMService } from '../admin/analysis/llm/llm.service';
import { MetricsQueries } from '../metrics/queries/metrics.queries';
import { SlackNotificationService } from '../notifications/slack-notification.service';
import {
  ChatSample,
  TenantForDate,
  ChatAnalysisResult,
  JobStatus,
} from './interfaces/batch-analysis.interface';
import { CreateJobDto } from './dto/create-job.dto';
import {
  CreatePromptTemplateDto,
  UpdatePromptTemplateDto,
} from './dto/create-prompt-template.dto';
import { JobFilterDto, ResultFilterDto } from './dto/job-filter.dto';
import { CreateScheduleDto, UpdateScheduleDto } from './dto/schedule.dto';
import {
  IssueFrequencyQueryDto,
  IssueFrequencyResponse,
  IssueFrequencyResult,
} from './dto/issue-frequency.dto';

// 파싱된 분석 결과 인터페이스
interface ParsedAnalysisResult {
  qualityScore: number | null;
  relevance: number | null;
  completeness: number | null;
  clarity: number | null;
  sentiment: string | null;
  summaryText: string | null;
  issues: string | null;
  improvements: string | null;
  missingData: string | null;
  issueCount: number | null;
  avgScore: number | null;
}

const DEFAULT_PROMPT_TEMPLATE = `당신은 대화 품질 분석 전문가입니다. 다음 고객-AI 대화를 분석하고 JSON 형식으로 응답해주세요.

## 분석 대상 대화

**사용자 질문:**
{{user_input}}

**AI 응답:**
{{llm_response}}

## 분석 항목

다음 JSON 형식으로 응답해주세요:
{
  "quality_score": (1-10 점수),
  "relevance": (질문에 대한 응답 관련성 1-10),
  "completeness": (응답의 완성도 1-10),
  "clarity": (응답의 명확성 1-10),
  "issues": ["발견된 문제점 목록"],
  "improvements": ["개선 제안 목록"],
  "sentiment": "positive" | "neutral" | "negative",
  "summary": "한 줄 요약"
}`;

@Injectable()
export class BatchAnalysisService {
  private readonly logger = new Logger(BatchAnalysisService.name);
  private bigQueryClient: BigQuery | null = null;
  private readonly projectId: string;
  private readonly datasetId: string;
  private readonly tableName: string;
  private readonly location: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LLMService,
    private readonly configService: ConfigService,
    private readonly slackNotificationService: SlackNotificationService,
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

      this.logger.log('BigQuery client initialized for batch analysis');
    } catch (error) {
      this.logger.error(`Failed to initialize BigQuery: ${error.message}`);
    }
  }

  /**
   * Parse LLM analysis result JSON and extract structured fields
   */
  private parseAnalysisResult(content: string): ParsedAnalysisResult {
    try {
      // 마크다운 코드 블록 제거 (LLM이 ```json ... ``` 형태로 응답하는 경우)
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();

      const json = JSON.parse(cleanContent);

      const qualityScore =
        typeof json.quality_score === 'number' ? json.quality_score : null;
      const relevance =
        typeof json.relevance === 'number' ? json.relevance : null;
      const completeness =
        typeof json.completeness === 'number' ? json.completeness : null;
      const clarity = typeof json.clarity === 'number' ? json.clarity : null;

      // Calculate average score from available scores
      const scores = [qualityScore, relevance, completeness, clarity].filter(
        (s): s is number => s !== null,
      );
      const avgScore =
        scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : null;

      // Extract arrays
      const issues = Array.isArray(json.issues) ? json.issues : [];
      const improvements = Array.isArray(json.improvements)
        ? json.improvements
        : [];
      const missingData = Array.isArray(json.missing_data)
        ? json.missing_data
        : null;

      return {
        qualityScore,
        relevance,
        completeness,
        clarity,
        sentiment: json.sentiment || null,
        summaryText: json.summary || null,
        issues: JSON.stringify(issues),
        improvements: JSON.stringify(improvements),
        missingData: missingData ? JSON.stringify(missingData) : null,
        issueCount: issues.length,
        avgScore,
      };
    } catch {
      // JSON parsing failed - return all nulls
      return {
        qualityScore: null,
        relevance: null,
        completeness: null,
        clarity: null,
        sentiment: null,
        summaryText: null,
        issues: null,
        improvements: null,
        missingData: null,
        issueCount: null,
        avgScore: null,
      };
    }
  }

  // ==================== Slack Notifications ====================

  /**
   * Job 완료 시 요약 알림 발송
   * avgScore < 5: critical, avgScore < 7: warning, 그 외: 알림 안 함
   */
  private async sendJobCompletionAlert(
    jobId: string,
    targetDate: Date,
    avgScore: number,
    lowScoreCount: number,
    totalCount: number,
  ): Promise<void> {
    const severity =
      avgScore < 5 ? 'critical' : avgScore < 7 ? 'warning' : 'info';

    // 양호한 경우 알림 안 함
    if (severity === 'info') return;

    await this.slackNotificationService.sendAlert({
      title: 'Batch Analysis Completed',
      message: `Job completed with ${severity === 'critical' ? 'poor' : 'below average'} quality scores.`,
      severity,
      fields: [
        { name: 'Job ID', value: jobId.slice(0, 8) },
        {
          name: 'Target Date',
          value: targetDate.toLocaleDateString('ko-KR'),
        },
        { name: 'Avg Score', value: `${avgScore.toFixed(1)}/10` },
        {
          name: 'Low Quality',
          value: `${lowScoreCount}/${totalCount} (${((lowScoreCount / totalCount) * 100).toFixed(1)}%)`,
        },
      ],
    });
  }

  /**
   * 개별 낮은 품질 결과 알림 발송
   * qualityScore < 5 인 경우 critical 알림
   */
  private async sendLowQualityAlert(
    tenantId: string,
    userInput: string,
    parsed: ParsedAnalysisResult,
  ): Promise<void> {
    if (!parsed.qualityScore || parsed.qualityScore >= 5) return;

    let issuesPreview = 'N/A';
    if (parsed.issues) {
      try {
        const issueArray = JSON.parse(parsed.issues) as string[];
        issuesPreview = issueArray.slice(0, 2).join(', ') || 'N/A';
      } catch {
        issuesPreview = 'N/A';
      }
    }

    await this.slackNotificationService.sendAlert({
      title: 'Low Quality Response Detected',
      message: `A chat response scored below threshold (${parsed.qualityScore}/10).`,
      severity: 'critical',
      fields: [
        { name: 'Tenant', value: tenantId },
        { name: 'Score', value: `${parsed.qualityScore}/10` },
        {
          name: 'User Query',
          value:
            userInput.length > 100 ? userInput.slice(0, 100) + '...' : userInput,
        },
        { name: 'Issues', value: issuesPreview },
      ],
    });
  }

  // ==================== Job Management ====================

  /**
   * Create a new batch analysis job
   */
  async createJob(dto: CreateJobDto) {
    // Get prompt template
    let promptTemplate = DEFAULT_PROMPT_TEMPLATE;

    if (dto.promptTemplateId) {
      const template = await this.prisma.analysisPromptTemplate.findUnique({
        where: { id: dto.promptTemplateId },
      });
      if (template) {
        promptTemplate = template.prompt;
      }
    } else {
      // Try to get default template
      const defaultTemplate = await this.prisma.analysisPromptTemplate.findFirst(
        {
          where: { isDefault: true, isActive: true },
        },
      );
      if (defaultTemplate) {
        promptTemplate = defaultTemplate.prompt;
      }
    }

    const job = await this.prisma.batchAnalysisJob.create({
      data: {
        status: 'PENDING',
        targetDate: new Date(dto.targetDate),
        tenantId: dto.tenantId || null,
        sampleSize: dto.sampleSize || 100,
        promptTemplate,
      },
    });

    this.logger.log(`Created batch analysis job: ${job.id}`);
    return job;
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string) {
    const job = await this.prisma.batchAnalysisJob.findUnique({
      where: { id: jobId },
      include: {
        _count: {
          select: { results: true },
        },
      },
    });

    if (!job) {
      throw new NotFoundException(`Job not found: ${jobId}`);
    }

    return job;
  }

  /**
   * List jobs with filters and aggregated scores
   */
  async listJobs(filter: JobFilterDto) {
    const where: any = {};

    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.tenantId) {
      where.tenantId = filter.tenantId;
    }
    if (filter.startDate || filter.endDate) {
      where.targetDate = {};
      if (filter.startDate) {
        where.targetDate.gte = new Date(filter.startDate);
      }
      if (filter.endDate) {
        where.targetDate.lte = new Date(filter.endDate);
      }
    }

    const [jobs, total] = await Promise.all([
      this.prisma.batchAnalysisJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filter.limit || 20,
        skip: filter.offset || 0,
        include: {
          _count: {
            select: { results: true },
          },
        },
      }),
      this.prisma.batchAnalysisJob.count({ where }),
    ]);

    // 각 Job의 평균 점수 계산
    const jobsWithScores = await Promise.all(
      jobs.map(async (job) => {
        const aggregation = await this.prisma.batchAnalysisResult.aggregate({
          where: {
            jobId: job.id,
            status: 'SUCCESS',
            avgScore: { not: null },
          },
          _avg: {
            qualityScore: true,
            relevance: true,
            completeness: true,
            clarity: true,
            avgScore: true,
          },
          _count: {
            id: true,
          },
        });

        return {
          ...job,
          scoreStats: {
            avgQualityScore: aggregation._avg.qualityScore,
            avgRelevance: aggregation._avg.relevance,
            avgCompleteness: aggregation._avg.completeness,
            avgClarity: aggregation._avg.clarity,
            avgScore: aggregation._avg.avgScore,
            scoredCount: aggregation._count.id,
          },
        };
      }),
    );

    return { jobs: jobsWithScores, total };
  }

  /**
   * Delete a job and its results
   */
  async deleteJob(jobId: string) {
    const job = await this.prisma.batchAnalysisJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException(`Job not found: ${jobId}`);
    }

    await this.prisma.batchAnalysisJob.delete({
      where: { id: jobId },
    });

    this.logger.log(`Deleted batch analysis job: ${jobId}`);
    return { deleted: true };
  }

  // ==================== Job Execution ====================

  /**
   * Run a batch analysis job
   */
  async runJob(jobId: string) {
    const job = await this.prisma.batchAnalysisJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException(`Job not found: ${jobId}`);
    }

    if (job.status === 'RUNNING') {
      throw new Error('Job is already running');
    }

    // Update job status to RUNNING
    await this.prisma.batchAnalysisJob.update({
      where: { id: jobId },
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    // Run job in background
    this.executeJobAsync(jobId).catch((error) => {
      this.logger.error(`Job ${jobId} failed: ${error.message}`);
    });

    return { jobId, status: 'RUNNING' };
  }

  /**
   * Execute job asynchronously
   */
  private async executeJobAsync(jobId: string): Promise<void> {
    try {
      const job = await this.prisma.batchAnalysisJob.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        throw new Error(`Job not found: ${jobId}`);
      }

      const targetDate = job.targetDate.toISOString().split('T')[0];

      // Fetch chat samples
      let samples: ChatSample[];
      if (job.tenantId) {
        // Single tenant
        samples = await this.fetchChatSamples(
          job.tenantId,
          targetDate,
          job.sampleSize,
        );
      } else {
        // All tenants - get tenant list first
        const tenants = await this.getTenantsForDate(targetDate);
        samples = [];
        for (const tenant of tenants) {
          const tenantSamples = await this.fetchChatSamples(
            tenant.tenant_id,
            targetDate,
            Math.min(job.sampleSize, Math.ceil(tenant.chat_count / 2)),
          );
          samples.push(...tenantSamples);
        }
      }

      // Update total items
      await this.prisma.batchAnalysisJob.update({
        where: { id: jobId },
        data: { totalItems: samples.length },
      });

      if (samples.length === 0) {
        await this.prisma.batchAnalysisJob.update({
          where: { id: jobId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        });
        return;
      }

      // Process in batches of 10
      const batchSize = 10;
      let processedItems = 0;
      let failedItems = 0;
      let lowQualityAlertCount = 0; // Rate limiting: 최대 5개 알림

      for (let i = 0; i < samples.length; i += batchSize) {
        const batch = samples.slice(i, i + batchSize);
        const results = await this.analyzeBatch(batch, job.promptTemplate);

        // Save results
        for (const result of results) {
          try {
            // Parse analysis result to extract structured fields
            const parsed =
              result.status === 'SUCCESS'
                ? this.parseAnalysisResult(result.analysisResult)
                : {
                    qualityScore: null,
                    relevance: null,
                    completeness: null,
                    clarity: null,
                    sentiment: null,
                    summaryText: null,
                    issues: null,
                    improvements: null,
                    missingData: null,
                    issueCount: null,
                    avgScore: null,
                  };

            await this.prisma.batchAnalysisResult.create({
              data: {
                jobId,
                originalTimestamp: result.sample.timestamp,
                tenantId: result.sample.tenant_id,
                sessionId: result.sample.session_id,
                userInput: result.sample.user_input,
                llmResponse: result.sample.llm_response,
                analysisPrompt: result.analysisPrompt,
                analysisResult: result.analysisResult,
                modelName: result.modelName,
                latencyMs: result.latencyMs,
                inputTokens: result.inputTokens,
                outputTokens: result.outputTokens,
                status: result.status,
                errorMessage: result.errorMessage,
                // Parsed fields for aggregation
                ...parsed,
              },
            });

            if (result.status === 'SUCCESS') {
              processedItems++;

              // 낮은 품질 알림 (Job 당 최대 5개)
              if (
                lowQualityAlertCount < 5 &&
                parsed.qualityScore !== null &&
                parsed.qualityScore < 5
              ) {
                lowQualityAlertCount++;
                this.sendLowQualityAlert(
                  result.sample.tenant_id,
                  result.sample.user_input,
                  parsed,
                ).catch((err) => {
                  this.logger.warn(`Failed to send low quality alert: ${err.message}`);
                });
              }
            } else {
              failedItems++;
            }
          } catch (error) {
            this.logger.error(`Failed to save result: ${error.message}`);
            failedItems++;
          }
        }

        // Update progress
        await this.prisma.batchAnalysisJob.update({
          where: { id: jobId },
          data: { processedItems, failedItems },
        });
      }

      // Mark as completed
      await this.prisma.batchAnalysisJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          processedItems,
          failedItems,
        },
      });

      this.logger.log(
        `Job ${jobId} completed: ${processedItems} processed, ${failedItems} failed`,
      );

      // Job 완료 알림 발송
      try {
        const stats = await this.prisma.batchAnalysisResult.aggregate({
          where: { jobId, status: 'SUCCESS', avgScore: { not: null } },
          _avg: { avgScore: true },
          _count: { id: true },
        });

        const lowScoreCount = await this.prisma.batchAnalysisResult.count({
          where: { jobId, status: 'SUCCESS', qualityScore: { lt: 5 } },
        });

        if (stats._avg.avgScore !== null && stats._count.id > 0) {
          await this.sendJobCompletionAlert(
            jobId,
            job.targetDate,
            stats._avg.avgScore,
            lowScoreCount,
            stats._count.id,
          );
        }
      } catch (alertError) {
        this.logger.warn(`Failed to send job completion alert: ${alertError.message}`);
      }
    } catch (error) {
      this.logger.error(`Job execution failed: ${error.message}`, error.stack);

      await this.prisma.batchAnalysisJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
        },
      });
    }
  }

  /**
   * Fetch chat samples from BigQuery
   */
  private async fetchChatSamples(
    tenantId: string | null,
    targetDate: string,
    sampleSize: number,
  ): Promise<ChatSample[]> {
    if (!this.bigQueryClient) {
      throw new Error('BigQuery client not initialized');
    }

    const query = MetricsQueries.chatSamplesForAnalysis(
      this.projectId,
      this.datasetId,
      this.tableName,
      tenantId,
      targetDate,
      sampleSize,
    );

    try {
      const [job] = await this.bigQueryClient.createQueryJob({
        query,
        location: this.location,
      });
      const [rows] = await job.getQueryResults();

      return rows.map((row: any) => ({
        timestamp: new Date(row.timestamp.value || row.timestamp),
        tenant_id: row.tenant_id,
        session_id: row.session_id || null,
        user_input: row.user_input,
        llm_response: row.llm_response,
        success: row.success,
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch chat samples: ${error.message}`);
      return [];
    }
  }

  /**
   * Get tenants for a specific date
   */
  private async getTenantsForDate(targetDate: string): Promise<TenantForDate[]> {
    if (!this.bigQueryClient) {
      throw new Error('BigQuery client not initialized');
    }

    const query = MetricsQueries.tenantsForDate(
      this.projectId,
      this.datasetId,
      this.tableName,
      targetDate,
    );

    try {
      const [job] = await this.bigQueryClient.createQueryJob({
        query,
        location: this.location,
      });
      const [rows] = await job.getQueryResults();

      return rows.map((row: any) => ({
        tenant_id: row.tenant_id,
        chat_count: Number(row.chat_count),
      }));
    } catch (error) {
      this.logger.error(`Failed to get tenants for date: ${error.message}`);
      return [];
    }
  }

  /**
   * Analyze a batch of chats using LLM
   */
  private async analyzeBatch(
    samples: ChatSample[],
    promptTemplate: string,
  ): Promise<ChatAnalysisResult[]> {
    const results: ChatAnalysisResult[] = [];

    for (const sample of samples) {
      try {
        // Build prompt
        const prompt = promptTemplate
          .replace('{{user_input}}', sample.user_input)
          .replace('{{llm_response}}', sample.llm_response);

        const startTime = Date.now();

        // Call LLM
        const response = await this.llmService.generateAnalysis([
          { role: 'user', content: prompt },
        ]);

        const latencyMs = Date.now() - startTime;

        results.push({
          sample,
          analysisPrompt: prompt,
          analysisResult: response.content,
          modelName: this.llmService.getProviderName(),
          latencyMs,
          inputTokens: response.inputTokens || 0,
          outputTokens: response.outputTokens || 0,
          status: 'SUCCESS',
        });
      } catch (error) {
        this.logger.warn(
          `Analysis failed for sample: ${error.message}`,
        );

        results.push({
          sample,
          analysisPrompt: promptTemplate
            .replace('{{user_input}}', sample.user_input)
            .replace('{{llm_response}}', sample.llm_response),
          analysisResult: '',
          modelName: this.llmService.getProviderName(),
          latencyMs: 0,
          inputTokens: 0,
          outputTokens: 0,
          status: 'FAILED',
          errorMessage: error.message,
        });
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return results;
  }

  // ==================== Results ====================

  /**
   * List analysis results with filters
   */
  async listResults(filter: ResultFilterDto) {
    const where: any = {};

    if (filter.jobId) {
      where.jobId = filter.jobId;
    }
    if (filter.tenantId) {
      where.tenantId = filter.tenantId;
    }
    if (filter.status) {
      where.status = filter.status;
    }

    // 새로운 필터: 평균 점수 범위
    if (filter.minAvgScore !== undefined || filter.maxAvgScore !== undefined) {
      where.avgScore = {};
      if (filter.minAvgScore !== undefined) {
        where.avgScore.gte = filter.minAvgScore;
      }
      if (filter.maxAvgScore !== undefined) {
        where.avgScore.lte = filter.maxAvgScore;
      }
    }

    // 새로운 필터: 감정
    if (filter.sentiment) {
      where.sentiment = filter.sentiment;
    }

    // 새로운 필터: 이슈 보유 여부
    if (filter.hasIssues !== undefined) {
      if (filter.hasIssues) {
        where.issueCount = { gt: 0 };
      } else {
        where.OR = [{ issueCount: 0 }, { issueCount: null }];
      }
    }

    const [results, total] = await Promise.all([
      this.prisma.batchAnalysisResult.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filter.limit || 20,
        skip: filter.offset || 0,
      }),
      this.prisma.batchAnalysisResult.count({ where }),
    ]);

    return { results, total };
  }

  /**
   * Get result by ID
   */
  async getResult(resultId: string) {
    const result = await this.prisma.batchAnalysisResult.findUnique({
      where: { id: resultId },
      include: { job: true },
    });

    if (!result) {
      throw new NotFoundException(`Result not found: ${resultId}`);
    }

    return result;
  }

  // ==================== Prompt Templates ====================

  /**
   * Create a prompt template
   */
  async createPromptTemplate(dto: CreatePromptTemplateDto) {
    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.analysisPromptTemplate.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.analysisPromptTemplate.create({
      data: {
        name: dto.name,
        description: dto.description,
        prompt: dto.prompt,
        isDefault: dto.isDefault || false,
      },
    });
  }

  /**
   * List prompt templates
   */
  async listPromptTemplates() {
    return this.prisma.analysisPromptTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get prompt template by ID
   */
  async getPromptTemplate(id: string) {
    const template = await this.prisma.analysisPromptTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Template not found: ${id}`);
    }

    return template;
  }

  /**
   * Update prompt template
   */
  async updatePromptTemplate(id: string, dto: UpdatePromptTemplateDto) {
    const template = await this.prisma.analysisPromptTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Template not found: ${id}`);
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.analysisPromptTemplate.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.analysisPromptTemplate.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.prompt && { prompt: dto.prompt }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  /**
   * Delete prompt template
   */
  async deletePromptTemplate(id: string) {
    const template = await this.prisma.analysisPromptTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Template not found: ${id}`);
    }

    await this.prisma.analysisPromptTemplate.delete({
      where: { id },
    });

    return { deleted: true };
  }

  // ==================== Issue Frequency ====================

  /**
   * Get issue frequency report
   * Aggregates issues from analysis results and returns top N by frequency
   */
  async getIssueFrequency(
    query: IssueFrequencyQueryDto,
  ): Promise<IssueFrequencyResponse> {
    const where: any = {
      status: 'SUCCESS',
      issues: { not: null },
    };

    if (query.jobId) {
      where.jobId = query.jobId;
    }
    if (query.tenantId) {
      where.tenantId = query.tenantId;
    }
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate + 'T23:59:59.999Z');
      }
    }

    // Fetch all results with issues
    const results = await this.prisma.batchAnalysisResult.findMany({
      where,
      select: {
        id: true,
        userInput: true,
        tenantId: true,
        avgScore: true,
        issues: true,
      },
    });

    // Aggregate issues
    const issueMap = new Map<
      string,
      {
        count: number;
        samples: { id: string; userInput: string; tenantId: string; avgScore: number | null }[];
      }
    >();

    let totalIssues = 0;

    for (const result of results) {
      if (!result.issues) continue;

      try {
        const issueArray = JSON.parse(result.issues) as string[];
        if (!Array.isArray(issueArray)) continue;

        for (const issue of issueArray) {
          const normalizedIssue = issue.trim();
          if (!normalizedIssue) continue;

          totalIssues++;

          if (!issueMap.has(normalizedIssue)) {
            issueMap.set(normalizedIssue, { count: 0, samples: [] });
          }

          const entry = issueMap.get(normalizedIssue)!;
          entry.count++;

          // Keep up to 3 sample results per issue
          if (entry.samples.length < 3) {
            entry.samples.push({
              id: result.id,
              userInput:
                result.userInput.length > 100
                  ? result.userInput.substring(0, 100) + '...'
                  : result.userInput,
              tenantId: result.tenantId,
              avgScore: result.avgScore,
            });
          }
        }
      } catch {
        // Skip invalid JSON
        continue;
      }
    }

    // Sort by count and take top N
    const limit = query.limit || 10;
    const sortedIssues = Array.from(issueMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit);

    const issues: IssueFrequencyResult[] = sortedIssues.map(([issue, data]) => ({
      issue,
      count: data.count,
      percentage:
        totalIssues > 0 ? Math.round((data.count / totalIssues) * 10000) / 100 : 0,
      sampleResults: data.samples,
    }));

    return {
      issues,
      totalIssues,
      totalResults: results.length,
      filters: {
        jobId: query.jobId,
        tenantId: query.tenantId,
        startDate: query.startDate,
        endDate: query.endDate,
      },
    };
  }

  // ==================== Statistics ====================

  /**
   * Get job statistics
   */
  async getJobStatistics() {
    const [
      totalJobs,
      pendingJobs,
      runningJobs,
      completedJobs,
      failedJobs,
      totalResults,
      successResults,
      failedResults,
    ] = await Promise.all([
      this.prisma.batchAnalysisJob.count(),
      this.prisma.batchAnalysisJob.count({ where: { status: 'PENDING' } }),
      this.prisma.batchAnalysisJob.count({ where: { status: 'RUNNING' } }),
      this.prisma.batchAnalysisJob.count({ where: { status: 'COMPLETED' } }),
      this.prisma.batchAnalysisJob.count({ where: { status: 'FAILED' } }),
      this.prisma.batchAnalysisResult.count(),
      this.prisma.batchAnalysisResult.count({ where: { status: 'SUCCESS' } }),
      this.prisma.batchAnalysisResult.count({ where: { status: 'FAILED' } }),
    ]);

    return {
      jobs: {
        total: totalJobs,
        pending: pendingJobs,
        running: runningJobs,
        completed: completedJobs,
        failed: failedJobs,
      },
      results: {
        total: totalResults,
        success: successResults,
        failed: failedResults,
      },
    };
  }

  // ==================== Schedule Management ====================

  async listSchedules() {
    return this.prisma.batchSchedulerConfig.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSchedule(id: string) {
    const schedule = await this.prisma.batchSchedulerConfig.findUnique({
      where: { id },
    });
    if (!schedule) {
      throw new NotFoundException(`Schedule not found: ${id}`);
    }
    return schedule;
  }

  async createSchedule(dto: CreateScheduleDto) {
    return this.prisma.batchSchedulerConfig.create({
      data: {
        name: dto.name,
        isEnabled: dto.isEnabled ?? true,
        hour: dto.hour,
        minute: dto.minute,
        daysOfWeek: dto.daysOfWeek,
        timeZone: dto.timeZone ?? 'Asia/Seoul',
        targetTenantId: dto.targetTenantId || null,
        sampleSize: dto.sampleSize ?? 100,
        promptTemplateId: dto.promptTemplateId || null,
      },
    });
  }

  async updateSchedule(id: string, dto: UpdateScheduleDto) {
    await this.getSchedule(id); // Verify exists
    return this.prisma.batchSchedulerConfig.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.isEnabled !== undefined && { isEnabled: dto.isEnabled }),
        ...(dto.hour !== undefined && { hour: dto.hour }),
        ...(dto.minute !== undefined && { minute: dto.minute }),
        ...(dto.daysOfWeek !== undefined && { daysOfWeek: dto.daysOfWeek }),
        ...(dto.timeZone !== undefined && { timeZone: dto.timeZone }),
        ...(dto.targetTenantId !== undefined && { targetTenantId: dto.targetTenantId || null }),
        ...(dto.sampleSize !== undefined && { sampleSize: dto.sampleSize }),
        ...(dto.promptTemplateId !== undefined && { promptTemplateId: dto.promptTemplateId || null }),
      },
    });
  }

  async deleteSchedule(id: string) {
    await this.getSchedule(id); // Verify exists
    await this.prisma.batchSchedulerConfig.delete({ where: { id } });
    return { deleted: true };
  }

  async toggleSchedule(id: string) {
    const schedule = await this.getSchedule(id);
    return this.prisma.batchSchedulerConfig.update({
      where: { id },
      data: { isEnabled: !schedule.isEnabled },
    });
  }

  async getAvailableTenants(days: number = 30) {
    // Use existing BigQuery client to get tenant list
    if (!this.bigQueryClient) {
      return [];
    }

    const query = `
      SELECT DISTINCT
        tenant_id,
        COUNT(*) AS chat_count
      FROM \`${this.projectId}.${this.datasetId}.${this.tableName}\`
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)
        AND user_input IS NOT NULL
        AND llm_response IS NOT NULL
      GROUP BY tenant_id
      HAVING COUNT(*) >= 10
      ORDER BY chat_count DESC
    `;

    try {
      const [job] = await this.bigQueryClient.createQueryJob({
        query,
        location: this.location,
      });
      const [rows] = await job.getQueryResults();
      return rows.map((row: any) => ({
        tenant_id: row.tenant_id,
        chat_count: Number(row.chat_count),
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch tenants: ${error.message}`);
      return [];
    }
  }

  // ==================== Migration ====================

  /**
   * 기존 데이터의 파싱 필드 마이그레이션
   * analysisResult는 있지만 qualityScore가 NULL인 레코드를 다시 파싱하여 업데이트
   */
  async migrateParseFields(): Promise<{ updated: number; failed: number }> {
    const results = await this.prisma.batchAnalysisResult.findMany({
      where: {
        qualityScore: null,
        analysisResult: { not: '' },
      },
    });

    this.logger.log(
      `Found ${results.length} records to migrate for parse fields`,
    );

    let updated = 0;
    let failed = 0;

    for (const result of results) {
      const parsed = this.parseAnalysisResult(result.analysisResult);
      if (parsed.qualityScore !== null) {
        await this.prisma.batchAnalysisResult.update({
          where: { id: result.id },
          data: {
            qualityScore: parsed.qualityScore,
            relevance: parsed.relevance,
            completeness: parsed.completeness,
            clarity: parsed.clarity,
            sentiment: parsed.sentiment,
            summaryText: parsed.summaryText,
            issues: parsed.issues,
            improvements: parsed.improvements,
            missingData: parsed.missingData,
            issueCount: parsed.issueCount,
            avgScore: parsed.avgScore,
          },
        });
        updated++;
      } else {
        failed++;
        this.logger.warn(`Failed to parse result ${result.id}`);
      }
    }

    this.logger.log(
      `Migration completed: ${updated} updated, ${failed} failed`,
    );
    return { updated, failed };
  }
}
