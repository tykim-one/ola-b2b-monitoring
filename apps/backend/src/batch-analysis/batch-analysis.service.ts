import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BigQuery } from '@google-cloud/bigquery';
import { PrismaService } from '../admin/database/prisma.service';
import { LLMService } from '../admin/analysis/llm/llm.service';
import { MetricsQueries } from '../metrics/queries/metrics.queries';
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
   * List jobs with filters
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

    return { jobs, total };
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

      for (let i = 0; i < samples.length; i += batchSize) {
        const batch = samples.slice(i, i + batchSize);
        const results = await this.analyzeBatch(batch, job.promptTemplate);

        // Save results
        for (const result of results) {
          try {
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
              },
            });

            if (result.status === 'SUCCESS') {
              processedItems++;
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
}
