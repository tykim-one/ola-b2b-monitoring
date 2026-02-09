import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SlackNotificationService } from '../notifications/slack-notification.service';
import { PrismaService } from '../admin/database/prisma.service';
import { ExternalDbService } from './external-db.service';
import { TargetLoaderService } from './target-loader.service';
import {
  ReportType,
  REPORT_TYPES,
  ReportCheckResult,
  MonitoringResult,
  ReportTableConfig,
} from './interfaces';

@Injectable()
export class ReportMonitoringService {
  private readonly logger = new Logger(ReportMonitoringService.name);

  // 마지막 체크 결과 캐시
  private lastResult: MonitoringResult | null = null;

  // 리포트 타입별 테이블 설정
  private readonly tableConfigs: Map<ReportType, ReportTableConfig>;

  constructor(
    private readonly configService: ConfigService,
    private readonly externalDb: ExternalDbService,
    private readonly targetLoader: TargetLoaderService,
    private readonly slackService: SlackNotificationService,
    private readonly prisma: PrismaService,
  ) {
    this.tableConfigs = this.loadTableConfigs();
  }

  /**
   * 환경변수에서 테이블 설정 로드
   * 모든 리포트 타입이 gold.daily_item_info 테이블을 사용
   */
  private loadTableConfigs(): Map<ReportType, ReportTableConfig> {
    const configs = new Map<ReportType, ReportTableConfig>();

    // 모든 타입이 gold.daily_item_info 테이블 사용
    const dataTable =
      this.configService.get<string>('REPORT_DATA_TABLE') ||
      'gold.daily_item_info';

    for (const reportType of REPORT_TYPES) {
      configs.set(reportType, {
        reportType,
        tableName: dataTable,
        symbolColumn: 'symbol', // forex도 daily_item_info에서는 symbol 컬럼
        updatedAtColumn: 'updated_at',
      });
    }

    return configs;
  }

  /**
   * 전체 리포트 체크 실행
   */
  async runFullCheck(
    trigger: 'manual' | 'scheduled' = 'manual',
  ): Promise<MonitoringResult> {
    this.logger.log('Starting full report monitoring check...');

    if (!this.externalDb.isConnected()) {
      this.logger.warn('External DB not connected. Skipping check.');
      return this.createEmptyResult('DB not connected');
    }

    const results: ReportCheckResult[] = [];
    let totalMissing = 0;
    let totalIncomplete = 0;
    let totalSuspicious = 0;
    let totalStale = 0;

    for (const reportType of REPORT_TYPES) {
      try {
        const result = await this.checkReport(reportType);
        results.push(result);

        totalMissing += result.missingSymbols.length;
        totalIncomplete += result.incompleteSymbols.length;
        totalSuspicious += result.suspiciousSymbols.length;
        totalStale += result.staleSymbols.length;

        // 이슈가 있으면 Slack 알림
        if (result.hasCriticalIssues) {
          await this.sendSlackAlert(result);
        }
      } catch (error) {
        this.logger.error(`Check failed for ${reportType}: ${error.message}`);
        results.push(this.createErrorResult(reportType, error.message));
      }
    }

    const issueReports = results.filter((r) => r.hasCriticalIssues).length;

    const monitoringResult: MonitoringResult = {
      results,
      summary: {
        totalReports: results.length,
        healthyReports: results.length - issueReports,
        issueReports,
        totalMissing,
        totalIncomplete,
        totalSuspicious,
        totalStale,
      },
      timestamp: new Date(),
    };

    // 결과 캐시
    this.lastResult = monitoringResult;

    await this.saveHistory(monitoringResult, trigger);

    this.logger.log(
      `Monitoring completed: ${issueReports}/${results.length} reports have issues ` +
        `(missing: ${totalMissing}, incomplete: ${totalIncomplete}, suspicious: ${totalSuspicious}, stale: ${totalStale})`,
    );

    return monitoringResult;
  }

  /**
   * 특정 리포트 타입 체크
   */
  async checkReport(reportType: ReportType): Promise<ReportCheckResult> {
    this.logger.debug(`Checking report: ${reportType}`);

    const config = this.tableConfigs.get(reportType);
    if (!config) {
      throw new Error(`No configuration found for report type: ${reportType}`);
    }

    // 타겟 로드 (DB에서 비동기 로드)
    const targets = await this.targetLoader.loadTargets(reportType);
    if (targets.length === 0) {
      this.logger.warn(`No targets found for ${reportType}`);
      return this.createEmptyCheckResult(reportType);
    }

    const symbols = targets.map((t) => t.symbol);

    // 1. 존재 여부 체크
    const existence = await this.externalDb.checkDataExists(
      config.tableName,
      symbols,
      config.symbolColumn,
    );

    // 2. 완전성 체크 (존재하는 것들만) - NEW
    const completeness = await this.externalDb.checkDataCompleteness(
      config.tableName,
      existence.existing,
      reportType,
      config.symbolColumn,
    );

    // 3. 신선도 체크 (존재하는 것들만)
    const freshness = await this.externalDb.checkDataFreshness(
      config.tableName,
      existence.existing,
      config.symbolColumn,
      config.updatedAtColumn,
    );

    // 이슈 판정: 누락, 불완전, 의심, 오래됨 중 하나라도 있으면 이슈
    const hasCriticalIssues =
      existence.missing.length > 0 ||
      completeness.incomplete.length > 0 ||
      completeness.suspicious.length > 0 ||
      freshness.stale.length > 0;

    const result: ReportCheckResult = {
      reportType,
      totalTargets: symbols.length,

      // 존재 여부
      existingCount: existence.existing.length,
      missingSymbols: existence.missing,

      // 완전성 (NEW)
      completeCount: completeness.complete.length,
      incompleteSymbols: completeness.incomplete,
      incompleteDetails: completeness.incompleteDetails,
      suspiciousSymbols: completeness.suspicious,
      suspiciousDetails: completeness.suspiciousDetails,

      // 신선도
      freshCount: freshness.fresh.length,
      staleSymbols: freshness.stale,
      staleDetails: freshness.staleDetails,

      hasCriticalIssues,
      checkedAt: new Date(),
    };

    this.logger.debug(
      `Report ${reportType}: ${existence.existing.length}/${symbols.length} exist, ` +
        `${completeness.complete.length} complete, ${completeness.incomplete.length} incomplete, ` +
        `${completeness.suspicious.length} suspicious, ${freshness.stale.length} stale`,
    );

    return result;
  }

  /**
   * 마지막 체크 결과 조회
   */
  getLastResult(): MonitoringResult | null {
    return this.lastResult;
  }

  /**
   * Slack 알림 발송
   */
  private async sendSlackAlert(result: ReportCheckResult): Promise<void> {
    // 심각도 판정: 누락 > 불완전 > 의심/오래됨
    const severity =
      result.missingSymbols.length > 0 || result.incompleteSymbols.length > 0
        ? 'critical'
        : 'warning';

    const missingText = this.formatSymbolList(result.missingSymbols, 10);
    const incompleteText = this.formatIncompleteList(
      result.incompleteDetails,
      5,
    );
    const suspiciousText = this.formatSuspiciousList(
      result.suspiciousDetails,
      5,
    );
    const staleText = this.formatStaleList(result.staleDetails, 5);

    const reportTypeNames: Record<ReportType, string> = {
      ai_stock: 'AI 주식',
      commodity: '원자재',
      forex: '환율',
      dividend: '배당주',
      summary: 'Summary',
    };

    const fields = [
      { name: '리포트 타입', value: reportTypeNames[result.reportType] },
      { name: '전체 타겟', value: `${result.totalTargets}개` },
      { name: '🔴 누락', value: missingText },
      { name: '🟠 불완전 (NULL)', value: incompleteText },
      { name: '🟡 확인필요 (변동없음)', value: suspiciousText },
      { name: '⚠️ 오래됨', value: staleText },
      { name: '체크 시간', value: result.checkedAt.toISOString() },
    ];

    await this.slackService.sendAlert({
      title: `리포트 데이터 이슈 감지: ${reportTypeNames[result.reportType]}`,
      message: this.buildAlertMessage(result),
      severity,
      fields,
    });

    this.logger.log(`Slack alert sent for ${result.reportType}`);
  }

  /**
   * 심볼 목록 포맷팅
   */
  private formatSymbolList(symbols: string[], limit: number): string {
    if (symbols.length === 0) return '없음';
    const display = symbols.slice(0, limit).join(', ');
    return symbols.length > limit
      ? `${display} 외 ${symbols.length - limit}건`
      : display;
  }

  /**
   * 불완전 데이터 목록 포맷팅
   */
  private formatIncompleteList(
    details: Array<{ symbol: string; missingFields: string[] }>,
    limit: number,
  ): string {
    if (details.length === 0) return '없음';
    const display = details
      .slice(0, limit)
      .map((d) => `${d.symbol}(${d.missingFields.join(',')})`)
      .join(', ');
    return details.length > limit
      ? `${display} 외 ${details.length - limit}건`
      : display;
  }

  /**
   * 의심 데이터 목록 포맷팅
   */
  private formatSuspiciousList(
    details: Array<{ symbol: string; unchangedFields: string[] }>,
    limit: number,
  ): string {
    if (details.length === 0) return '없음';
    const display = details
      .slice(0, limit)
      .map((d) => `${d.symbol}(${d.unchangedFields.join(',')})`)
      .join(', ');
    return details.length > limit
      ? `${display} 외 ${details.length - limit}건`
      : display;
  }

  /**
   * 오래된 데이터 목록 포맷팅
   */
  private formatStaleList(
    details: Array<{ symbol: string; daysBehind: number }>,
    limit: number,
  ): string {
    if (details.length === 0) return '없음';
    const display = details
      .slice(0, limit)
      .map((d) => `${d.symbol}(${d.daysBehind}일 전)`)
      .join(', ');
    return details.length > limit
      ? `${display} 외 ${details.length - limit}건`
      : display;
  }

  /**
   * 알림 메시지 생성
   */
  private buildAlertMessage(result: ReportCheckResult): string {
    const issues: string[] = [];

    if (result.missingSymbols.length > 0) {
      issues.push(`🔴 *${result.missingSymbols.length}개* 데이터 누락`);
    }

    if (result.incompleteSymbols.length > 0) {
      issues.push(`🟠 *${result.incompleteSymbols.length}개* 필수 필드 NULL`);
    }

    if (result.suspiciousSymbols.length > 0) {
      issues.push(
        `🟡 *${result.suspiciousSymbols.length}개* 전날과 값 동일 (확인 필요)`,
      );
    }

    if (result.staleSymbols.length > 0) {
      issues.push(`⚠️ *${result.staleSymbols.length}개* 데이터 오래됨`);
    }

    return issues.length > 0
      ? `다음 이슈가 발견되었습니다:\n• ${issues.join('\n• ')}`
      : '이슈 없음';
  }

  /**
   * 빈 결과 생성 (DB 연결 실패 등)
   */
  private createEmptyResult(reason: string): MonitoringResult {
    return {
      results: [],
      summary: {
        totalReports: 0,
        healthyReports: 0,
        issueReports: 0,
        totalMissing: 0,
        totalIncomplete: 0,
        totalSuspicious: 0,
        totalStale: 0,
      },
      timestamp: new Date(),
    };
  }

  /**
   * 빈 체크 결과 생성
   */
  private createEmptyCheckResult(reportType: ReportType): ReportCheckResult {
    return {
      reportType,
      totalTargets: 0,
      existingCount: 0,
      missingSymbols: [],
      completeCount: 0,
      incompleteSymbols: [],
      incompleteDetails: [],
      suspiciousSymbols: [],
      suspiciousDetails: [],
      freshCount: 0,
      staleSymbols: [],
      staleDetails: [],
      hasCriticalIssues: false,
      checkedAt: new Date(),
    };
  }

  /**
   * 에러 결과 생성
   */
  private createErrorResult(
    reportType: ReportType,
    errorMessage: string,
  ): ReportCheckResult {
    return {
      reportType,
      totalTargets: 0,
      existingCount: 0,
      missingSymbols: [],
      completeCount: 0,
      incompleteSymbols: [],
      incompleteDetails: [],
      suspiciousSymbols: [],
      suspiciousDetails: [],
      freshCount: 0,
      staleSymbols: [],
      staleDetails: [],
      hasCriticalIssues: true,
      checkedAt: new Date(),
    };
  }

  /**
   * DB 연결 상태 확인
   */
  async getHealthStatus(): Promise<{
    dbConnected: boolean;
    dbType: string | null;
    availableTargetFiles: Array<{ reportType: ReportType; filename: string }>;
  }> {
    const dbHealth = await this.externalDb.healthCheck();
    const files = await this.targetLoader.listAvailableFiles();

    return {
      dbConnected: dbHealth.connected,
      dbType: dbHealth.type,
      availableTargetFiles: files,
    };
  }

  /**
   * 체크 결과를 DB에 저장
   */
  private async saveHistory(
    result: MonitoringResult,
    trigger: 'manual' | 'scheduled',
  ): Promise<void> {
    try {
      await this.prisma.reportMonitoringHistory.create({
        data: {
          trigger,
          totalReports: result.summary.totalReports,
          healthyReports: result.summary.healthyReports,
          issueReports: result.summary.issueReports,
          totalMissing: result.summary.totalMissing,
          totalIncomplete: result.summary.totalIncomplete,
          totalSuspicious: result.summary.totalSuspicious,
          totalStale: result.summary.totalStale,
          hasIssues: result.summary.issueReports > 0,
          results: JSON.stringify(result.results),
          checkedAt: result.timestamp,
        },
      });
      this.logger.debug('Monitoring result saved to history');
    } catch (error) {
      this.logger.error(`Failed to save history: ${error.message}`);
      // 이력 저장 실패가 체크 자체를 중단시키지 않도록
    }
  }

  /**
   * 체크 이력 조회 (페이지네이션)
   */
  async getHistory(params: {
    limit?: number;
    offset?: number;
    hasIssues?: boolean;
  }): Promise<{
    items: Array<{
      id: string;
      trigger: string;
      totalReports: number;
      healthyReports: number;
      issueReports: number;
      totalMissing: number;
      totalIncomplete: number;
      totalSuspicious: number;
      totalStale: number;
      hasIssues: boolean;
      checkedAt: Date;
    }>;
    total: number;
  }> {
    const where: Record<string, unknown> = {};
    if (params.hasIssues !== undefined) {
      where.hasIssues = params.hasIssues;
    }

    const [items, total] = await Promise.all([
      this.prisma.reportMonitoringHistory.findMany({
        where,
        orderBy: { checkedAt: 'desc' },
        take: params.limit || 20,
        skip: params.offset || 0,
        select: {
          id: true,
          trigger: true,
          totalReports: true,
          healthyReports: true,
          issueReports: true,
          totalMissing: true,
          totalIncomplete: true,
          totalSuspicious: true,
          totalStale: true,
          hasIssues: true,
          checkedAt: true,
          // results JSON은 목록에서 제외 (대역폭 절약)
        },
      }),
      this.prisma.reportMonitoringHistory.count({ where }),
    ]);

    return { items, total };
  }
}
