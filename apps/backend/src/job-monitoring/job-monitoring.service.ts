import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { JobMonitoringDataSource } from './job-monitoring.datasource';
import { CacheService, CacheTTL } from '../cache/cache.service';
import { SlackNotificationService } from '../notifications/slack-notification.service';
import {
  JobExecutionLog,
  JobConfigSummary,
  JobMonitoringSummary,
} from './dto/job-monitoring.dto';

/** Slack 실패 알림 대상 config 목록 */
const MONITORED_CONFIGS = [
  'minkabu_news_translation',
  'wind_news_translation',
];

@Injectable()
export class JobMonitoringService {
  private readonly logger = new Logger(JobMonitoringService.name);
  private readonly lastAlertedIds = new Set<string>();

  constructor(
    private readonly dataSource: JobMonitoringDataSource,
    private readonly cacheService: CacheService,
    private readonly slackNotificationService: SlackNotificationService,
  ) {}

  async isHealthy(): Promise<boolean> {
    return this.dataSource.isHealthy();
  }

  async getLogs(limit = 100, days = 7): Promise<JobExecutionLog[]> {
    const cacheKey = CacheService.generateKey(
      'job-monitoring',
      'logs',
      limit,
      days,
    );
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.dataSource.getLogs(limit, days),
      CacheTTL.SHORT,
    );
  }

  async getConfigSummary(days = 7): Promise<JobConfigSummary[]> {
    const cacheKey = CacheService.generateKey(
      'job-monitoring',
      'config-summary',
      days,
    );
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.dataSource.getConfigSummary(days),
      CacheTTL.SHORT,
    );
  }

  async getSummary(days = 7): Promise<JobMonitoringSummary> {
    const cacheKey = CacheService.generateKey(
      'job-monitoring',
      'summary',
      days,
    );
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.dataSource.getSummary(days),
      CacheTTL.SHORT,
    );
  }

  invalidateCache(): void {
    this.cacheService.delByPattern('job-monitoring:');
    this.logger.log('Job monitoring cache invalidated');
  }

  // --- NEW: Cron-based failure alert ---

  @Cron('*/10 * * * *')
  async checkAndAlertFailedJobs(): Promise<void> {
    try {
      const failedJobs = await this.dataSource.getRecentFailedJobs(
        MONITORED_CONFIGS,
        10,
      );

      const newFailures = failedJobs.filter(
        (job) => !this.lastAlertedIds.has(job.insertId),
      );

      if (newFailures.length === 0) return;

      this.logger.warn(
        `Detected ${newFailures.length} new job failure(s) for monitored configs`,
      );

      // 실패 건별 개별 알림 전송
      for (const job of newFailures) {
        const severity = (job.failed ?? 0) >= 10 ? 'critical' : 'warning';

        await this.slackNotificationService.sendAlert({
          title: `Job 실패 감지: ${job.configName}`,
          message: `*${job.configName}* 작업에서 실패가 발생했습니다.`,
          severity,
          fields: [
            { name: 'Config', value: job.configName },
            { name: '실패 건수', value: `${job.failed ?? 0}건` },
            { name: '처리/전체', value: `${job.processed ?? 0} / ${job.fetched ?? 0}` },
            { name: '성공률', value: `${job.successRate ?? 0}%` },
            { name: '발생 시각', value: job.appTimestamp },
          ],
        });
      }

      // Track alerted IDs to prevent duplicates
      for (const job of newFailures) {
        this.lastAlertedIds.add(job.insertId);
      }

      // Keep Set size bounded (max 200 entries)
      if (this.lastAlertedIds.size > 200) {
        const idsArray = Array.from(this.lastAlertedIds);
        const trimmed = idsArray.slice(-200);
        this.lastAlertedIds.clear();
        for (const id of trimmed) {
          this.lastAlertedIds.add(id);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to check job failures: ${message}`);
    }
  }

  /** 테스트용: 수동으로 Slack 알림 전송 */
  async sendTestAlert(): Promise<void> {
    await this.slackNotificationService.sendAlert({
      title: 'Job 실패 감지: minkabu_news_translation (TEST)',
      message: '*minkabu_news_translation* 작업에서 실패가 발생했습니다. (테스트 알림)',
      severity: 'warning',
      fields: [
        { name: 'Config', value: 'minkabu_news_translation' },
        { name: '실패 건수', value: '3건' },
        { name: '처리/전체', value: '47 / 50' },
        { name: '성공률', value: '94%' },
        { name: '발생 시각', value: new Date().toISOString() },
      ],
    });
  }
}
