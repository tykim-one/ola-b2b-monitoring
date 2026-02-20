import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BigQuery } from '@google-cloud/bigquery';
import {
  DailyKPI,
  QuestionTypeRow,
  RepresentativeQuestion,
  FailAnalysisRow,
  TokenBurstCase,
  CandidateQuestion,
  CollectedReportData,
} from '../interfaces/ibk-chat-report.interface';
import { IbkChatReportQueries } from '../queries/ibk-chat-report.queries';

@Injectable()
export class DataCollectorService {
  private readonly logger = new Logger(DataCollectorService.name);
  private bigQueryClient: BigQuery | null = null;
  private readonly projectId: string;
  private readonly datasetId: string;
  private readonly tableName: string;
  private readonly location: string;

  constructor(private readonly configService: ConfigService) {
    this.projectId = this.configService.get<string>('GCP_PROJECT_ID', '');
    this.datasetId = this.configService.get<string>('BIGQUERY_DATASET', '');
    this.tableName = this.configService.get<string>('BIGQUERY_TABLE', '');
    this.location = this.configService.get<string>(
      'GCP_BQ_LOCATION',
      'asia-northeast3',
    );
    this.initializeBigQuery();
  }

  private initializeBigQuery(): void {
    try {
      const keyFilename = this.configService.get<string>(
        'GOOGLE_APPLICATION_CREDENTIALS',
      );
      this.bigQueryClient = new BigQuery({
        projectId: this.projectId,
        keyFilename: keyFilename || undefined,
      });
      this.logger.log('BigQuery client initialized for IBK-CHAT report');
    } catch (error) {
      this.logger.error(
        `Failed to initialize BigQuery: ${(error as Error).message}`,
      );
    }
  }

  private async executeQuery<T>(query: string): Promise<T[]> {
    if (!this.bigQueryClient) {
      this.logger.error('BigQuery client not initialized');
      return [];
    }
    const [job] = await this.bigQueryClient.createQueryJob({
      query,
      location: this.location,
      maximumBytesBilled: '1000000000',
    });
    const [rows] = await job.getQueryResults();
    return rows as T[];
  }

  async getTotalRowCount(targetDate: string): Promise<number> {
    try {
      const query = IbkChatReportQueries.totalRowCount(
        this.projectId,
        this.datasetId,
        this.tableName,
        targetDate,
      );
      const rows = await this.executeQuery<{ total_count: number }>(query);
      return rows[0]?.total_count ?? 0;
    } catch (error) {
      this.logger.error(
        `Failed to get total row count: ${(error as Error).message}`,
      );
      return 0;
    }
  }

  async fetchDailyKPI(targetDate: string): Promise<DailyKPI> {
    try {
      const query = IbkChatReportQueries.dailyKPI(
        this.projectId,
        this.datasetId,
        this.tableName,
        targetDate,
      );
      const rows = await this.executeQuery<Record<string, unknown>>(query);
      const row = rows[0];
      if (!row) {
        return this.emptyKPI();
      }
      return {
        totalRequests: Number(row.total_requests ?? 0),
        successCount: Number(row.success_count ?? 0),
        failCount: Number(row.fail_count ?? 0),
        successRate: Number(row.success_rate ?? 0),
        p50Tokens: Number(row.p50_tokens ?? 0),
        p90Tokens: Number(row.p90_tokens ?? 0),
        p99Tokens: Number(row.p99_tokens ?? 0),
        maxTokens: Number(row.max_tokens ?? 0),
        avgTokens: Number(row.avg_tokens ?? 0),
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch daily KPI: ${(error as Error).message}`,
      );
      return this.emptyKPI();
    }
  }

  async fetchQuestionTypeStats(
    targetDate: string,
  ): Promise<QuestionTypeRow[]> {
    try {
      const query = IbkChatReportQueries.questionTypeSuccess(
        this.projectId,
        this.datasetId,
        this.tableName,
        targetDate,
      );
      const rows = await this.executeQuery<Record<string, unknown>>(query);
      return rows.map((row) => ({
        questionType: String(row.question_type ?? 'UNKNOWN'),
        total: Number(row.total ?? 0),
        successCount: Number(row.success_count ?? 0),
        successRate: Number(row.success_rate ?? 0),
      }));
    } catch (error) {
      this.logger.error(
        `Failed to fetch question type stats: ${(error as Error).message}`,
      );
      return [];
    }
  }

  async fetchRepresentativeQuestions(
    targetDate: string,
  ): Promise<RepresentativeQuestion[]> {
    try {
      const query = IbkChatReportQueries.representativeQuestions(
        this.projectId,
        this.datasetId,
        this.tableName,
        targetDate,
      );
      const rows = await this.executeQuery<Record<string, unknown>>(query);
      return rows.map((row) => ({
        questionType: String(row.question_type ?? 'UNKNOWN'),
        userInput: String(row.user_input ?? ''),
        responseNode: String(row.response_node ?? ''),
        failReason: row.fail_reason ? String(row.fail_reason) : null,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to fetch representative questions: ${(error as Error).message}`,
      );
      return [];
    }
  }

  async fetchFailAnalysis(targetDate: string): Promise<FailAnalysisRow[]> {
    try {
      const query = IbkChatReportQueries.failAnalysis(
        this.projectId,
        this.datasetId,
        this.tableName,
        targetDate,
      );
      const rows = await this.executeQuery<Record<string, unknown>>(query);
      return rows.map((row) => ({
        failCategory: String(row.fail_category ?? 'UNKNOWN'),
        responseNode: String(row.response_node ?? ''),
        count: Number(row.count ?? 0),
        sampleQuestions: Array.isArray(row.sample_questions)
          ? row.sample_questions.map(String)
          : [],
      }));
    } catch (error) {
      this.logger.error(
        `Failed to fetch fail analysis: ${(error as Error).message}`,
      );
      return [];
    }
  }

  async fetchTokenBurstCases(targetDate: string): Promise<TokenBurstCase[]> {
    try {
      const query = IbkChatReportQueries.tokenBurstCases(
        this.projectId,
        this.datasetId,
        this.tableName,
        targetDate,
      );
      const rows = await this.executeQuery<Record<string, unknown>>(query);
      return rows.map((row) => ({
        userInput: String(row.user_input ?? ''),
        questionType: String(row.question_type ?? 'UNKNOWN'),
        responseNode: String(row.response_node ?? ''),
        totalTokens: Number(row.total_tokens ?? 0),
        inputTokens: Number(row.input_tokens ?? 0),
        outputTokens: Number(row.output_tokens ?? 0),
      }));
    } catch (error) {
      this.logger.error(
        `Failed to fetch token burst cases: ${(error as Error).message}`,
      );
      return [];
    }
  }

  async fetchCandidateQuestions(
    targetDate: string,
  ): Promise<CandidateQuestion[]> {
    try {
      const query = IbkChatReportQueries.candidateHighValueQuestions(
        this.projectId,
        this.datasetId,
        this.tableName,
        targetDate,
      );
      const rows = await this.executeQuery<Record<string, unknown>>(query);
      return rows.map((row) => ({
        userInput: String(row.user_input ?? ''),
        responseNode: String(row.response_node ?? ''),
        failReason: String(row.fail_reason ?? ''),
        questionType: String(row.question_type ?? 'UNKNOWN'),
        totalTokens: Number(row.total_tokens ?? 0),
      }));
    } catch (error) {
      this.logger.error(
        `Failed to fetch candidate questions: ${(error as Error).message}`,
      );
      return [];
    }
  }

  async fetchExploratoryClusterSamples(
    targetDate: string,
  ): Promise<CandidateQuestion[]> {
    try {
      const query = IbkChatReportQueries.exploratoryClusterSamples(
        this.projectId,
        this.datasetId,
        this.tableName,
        targetDate,
      );
      const rows = await this.executeQuery<Record<string, unknown>>(query);
      return rows.map((row) => ({
        userInput: String(row.user_input ?? ''),
        responseNode: String(row.response_node ?? ''),
        failReason: '',
        questionType: String(row.question_type ?? 'UNKNOWN'),
        totalTokens: 0,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to fetch exploratory cluster samples: ${(error as Error).message}`,
      );
      return [];
    }
  }

  async collectAll(targetDate: string): Promise<CollectedReportData> {
    const [
      kpi,
      questionTypeStats,
      representativeQuestions,
      failAnalysis,
      tokenBurstCases,
      candidateQuestions,
      exploratoryClusterSamples,
    ] = await Promise.all([
      this.fetchDailyKPI(targetDate),
      this.fetchQuestionTypeStats(targetDate),
      this.fetchRepresentativeQuestions(targetDate),
      this.fetchFailAnalysis(targetDate),
      this.fetchTokenBurstCases(targetDate),
      this.fetchCandidateQuestions(targetDate),
      this.fetchExploratoryClusterSamples(targetDate),
    ]);

    return {
      targetDate,
      kpi,
      questionTypeStats,
      representativeQuestions,
      failAnalysis,
      tokenBurstCases,
      highValueQuestions: [],
      exploratoryClusterSamples,
    };
  }

  private emptyKPI(): DailyKPI {
    return {
      totalRequests: 0,
      successCount: 0,
      failCount: 0,
      successRate: 0,
      p50Tokens: 0,
      p90Tokens: 0,
      p99Tokens: 0,
      maxTokens: 0,
      avgTokens: 0,
    };
  }
}
