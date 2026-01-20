import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BigQuery } from '@google-cloud/bigquery';
import { LLMService } from '../admin/analysis/llm/llm.service';
import { MetricsQueries } from '../metrics/queries/metrics.queries';
import {
  SessionStats,
  SessionListItem,
  SessionTimeline,
  PaginatedSessions,
  ConversationTurn,
  LLMSessionAnalysis,
  SessionAnalysisResult,
} from './interfaces';
import { SessionFilterDto, CreateSessionAnalysisJobDto } from './dto';

@Injectable()
export class SessionAnalysisService {
  private readonly logger = new Logger(SessionAnalysisService.name);
  private bigQueryClient: BigQuery | null = null;
  private readonly projectId: string;
  private readonly datasetId: string;
  private readonly tableName: string;
  private readonly location: string;

  constructor(
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
        location: this.location,
      });

      this.logger.log('BigQuery client initialized for Session Analysis');
    } catch (error) {
      this.logger.error('Failed to initialize BigQuery client', error);
    }
  }

  private async executeQuery<T>(query: string): Promise<T[]> {
    if (!this.bigQueryClient) {
      throw new Error('BigQuery client not initialized');
    }

    const [rows] = await this.bigQueryClient.query({
      query,
      location: this.location,
    });

    return rows as T[];
  }

  /**
   * Get session statistics (real-time)
   */
  async getSessionStats(filter: SessionFilterDto): Promise<SessionStats> {
    const query = MetricsQueries.sessionResolutionStats(
      this.projectId,
      this.datasetId,
      this.tableName,
      filter.days || 7,
      filter.tenantId,
    );

    const results = await this.executeQuery<SessionStats>(query);

    if (results.length === 0) {
      return {
        totalSessions: 0,
        resolvedSessions: 0,
        resolutionRate: 0,
        avgTurnsToResolution: 0,
        abandonmentRate: 0,
        avgSessionDuration: 0,
        frustratedSessions: 0,
        frustrationRate: 0,
      };
    }

    return results[0];
  }

  /**
   * Get paginated session list (real-time)
   */
  async getSessions(filter: SessionFilterDto): Promise<PaginatedSessions> {
    const [sessions, countResult] = await Promise.all([
      this.executeQuery<SessionListItem>(
        MetricsQueries.sessionList(
          this.projectId,
          this.datasetId,
          this.tableName,
          filter.days || 7,
          filter.tenantId,
          filter.isResolved,
          filter.hasFrustration,
          filter.limit || 20,
          filter.offset || 0,
        ),
      ),
      this.executeQuery<{ total: number }>(
        MetricsQueries.sessionCount(
          this.projectId,
          this.datasetId,
          this.tableName,
          filter.days || 7,
          filter.tenantId,
          filter.isResolved,
          filter.hasFrustration,
        ),
      ),
    ]);

    return {
      sessions,
      total: countResult[0]?.total || 0,
      limit: filter.limit || 20,
      offset: filter.offset || 0,
    };
  }

  /**
   * Get session timeline with conversation history
   */
  async getSessionTimeline(sessionId: string): Promise<SessionTimeline> {
    const query = MetricsQueries.sessionConversationHistory(
      this.projectId,
      this.datasetId,
      this.tableName,
      sessionId,
    );

    const turns = await this.executeQuery<ConversationTurn>(query);

    if (turns.length === 0) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    // Extract tenant and user info from first turn's metadata
    const sessionInfo = await this.getSessionInfo(sessionId);

    // Analyze session resolution using heuristic
    const analysis = this.analyzeSessionHeuristic(turns);

    return {
      sessionId,
      tenantId: sessionInfo?.tenantId || 'unknown',
      userId: sessionInfo?.userId || null,
      turns,
      analysis: {
        sessionId,
        tenantId: sessionInfo?.tenantId || 'unknown',
        userId: sessionInfo?.userId || null,
        turnCount: turns.length,
        isResolved: analysis.isResolved,
        resolutionMethod: analysis.method,
        resolutionTurn: analysis.turn,
        hasFrustration: this.detectFrustration(turns),
        abandonmentReason: analysis.isResolved ? null : 'Unknown - requires LLM analysis',
        qualityScore: null,
        sessionStart: turns[0].timestamp,
        sessionEnd: turns[turns.length - 1].timestamp,
        durationMinutes: this.calculateDuration(turns[0].timestamp, turns[turns.length - 1].timestamp),
      },
    };
  }

  /**
   * Analyze session with LLM for deep insights
   */
  async analyzeSessionWithLLM(sessionId: string): Promise<LLMSessionAnalysis> {
    const timeline = await this.getSessionTimeline(sessionId);
    const turns = timeline.turns;

    const prompt = `다음 챗봇 대화를 분석하여 JSON 형식으로 응답하세요.

대화 내역:
${turns.map((t, i) => `[턴 ${i + 1}] 사용자: ${t.userInput}\n챗봇: ${t.llmResponse}`).join('\n\n')}

분석 항목 (JSON 형식으로 응답):
{
  "isResolved": (사용자가 원하는 정보/해결책을 얻었는가? true/false),
  "resolutionTurn": (해결된 경우 몇 번째 턴에서 해결되었는가? 미해결 시 null),
  "abandonmentReason": (미해결 시 이유, 예: "정보 부족", "반복 응답", "주제 이탈", 해결된 경우 null),
  "qualityScore": (전체 대화 품질 점수 1-10),
  "summary": (대화 내용 한 줄 요약)
}

반드시 유효한 JSON 형식으로만 응답하세요.`;

    try {
      const response = await this.llmService.generateAnalysis([
        { role: 'user', content: prompt },
      ]);
      const cleanedResponse = this.cleanJsonResponse(response.content);
      return JSON.parse(cleanedResponse);
    } catch (error) {
      this.logger.error(`Failed to analyze session with LLM: ${sessionId}`, error);
      return {
        isResolved: false,
        resolutionTurn: null,
        abandonmentReason: 'LLM analysis failed',
        qualityScore: 0,
        summary: 'Analysis failed',
      };
    }
  }

  /**
   * Get available tenants for filtering
   */
  async getTenants(days: number = 7): Promise<string[]> {
    const query = `
      SELECT DISTINCT tenant_id
      FROM \`${this.projectId}.${this.datasetId}.${this.tableName}\`
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)
        AND request_metadata.session_id IS NOT NULL
      ORDER BY tenant_id
    `;

    const results = await this.executeQuery<{ tenant_id: string }>(query);
    return results.map((r) => r.tenant_id);
  }

  // ==================== Private Helper Methods ====================

  private async getSessionInfo(sessionId: string): Promise<{ tenantId: string; userId: string | null } | null> {
    const query = `
      SELECT
        tenant_id AS tenantId,
        request_metadata.x_enc_data AS userId
      FROM \`${this.projectId}.${this.datasetId}.${this.tableName}\`
      WHERE request_metadata.session_id = '${sessionId}'
      LIMIT 1
    `;

    const results = await this.executeQuery<{ tenantId: string; userId: string | null }>(query);
    return results[0] || null;
  }

  private analyzeSessionHeuristic(turns: ConversationTurn[]): { isResolved: boolean; method: 'HEURISTIC' | 'LLM' | 'UNKNOWN'; turn: number | null } {
    if (turns.length === 0) {
      return { isResolved: false, method: 'UNKNOWN', turn: null };
    }

    const lastTurn = turns[turns.length - 1];
    const thankPatterns = /감사|고마워|thanks|thank you|got it|알겠|해결|완료|좋아|perfect|great/i;

    // Pattern 1: Ends with thank expression
    if (thankPatterns.test(lastTurn.userInput || '')) {
      return { isResolved: true, method: 'HEURISTIC', turn: turns.length };
    }

    // Pattern 2: All turns successful and no frustration
    const allSuccessful = turns.every((t) => t.success);
    const hasFrustration = this.detectFrustration(turns);

    if (allSuccessful && !hasFrustration) {
      return { isResolved: true, method: 'HEURISTIC', turn: turns.length };
    }

    // Cannot determine - needs LLM analysis
    return { isResolved: false, method: 'UNKNOWN', turn: null };
  }

  private detectFrustration(turns: ConversationTurn[]): boolean {
    const frustrationPatterns = /왜|도대체|짜증|화나|답답|이상해|바보|멍청|안돼|못해|실망|최악|쓰레기|환불|고소|신고|stupid|useless|terrible|worst|angry|frustrated/i;

    return turns.some((t) => frustrationPatterns.test(t.userInput || ''));
  }

  private calculateDuration(start: Date, end: Date): number {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    return Math.round((endTime - startTime) / 60000 * 100) / 100; // minutes with 2 decimal places
  }

  private cleanJsonResponse(response: string): string {
    // Remove markdown code blocks if present
    let cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    // Find JSON object
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return jsonMatch[0];
    }

    return cleaned.trim();
  }
}
