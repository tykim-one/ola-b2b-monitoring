import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { BatchAnalysisService } from './batch-analysis.service';

@Injectable()
export class BatchAnalysisScheduler {
  private readonly logger = new Logger(BatchAnalysisScheduler.name);
  private readonly enabled: boolean;

  constructor(
    private readonly batchAnalysisService: BatchAnalysisService,
    private readonly configService: ConfigService,
  ) {
    this.enabled = this.configService.get<boolean>(
      'BATCH_ANALYSIS_SCHEDULER_ENABLED',
      false,
    );

    if (this.enabled) {
      this.logger.log('Batch analysis scheduler is enabled');
    } else {
      this.logger.log(
        'Batch analysis scheduler is disabled. Set BATCH_ANALYSIS_SCHEDULER_ENABLED=true to enable.',
      );
    }
  }

  /**
   * Run daily analysis at 2:00 AM (analyzes previous day's data)
   */
  @Cron('0 2 * * *', {
    name: 'daily-chat-analysis',
    timeZone: 'Asia/Seoul',
  })
  async runDailyAnalysis() {
    if (!this.enabled) {
      this.logger.debug('Scheduler disabled, skipping daily analysis');
      return;
    }

    this.logger.log('Starting daily chat analysis...');

    try {
      // Calculate yesterday's date
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const targetDate = yesterday.toISOString().split('T')[0];

      this.logger.log(`Creating analysis job for date: ${targetDate}`);

      // Create job for all tenants
      const job = await this.batchAnalysisService.createJob({
        targetDate,
        sampleSize: 100, // 100 samples per tenant
      });

      this.logger.log(`Created job: ${job.id}`);

      // Run the job
      await this.batchAnalysisService.runJob(job.id);

      this.logger.log(`Daily analysis job started: ${job.id}`);
    } catch (error) {
      this.logger.error(`Daily analysis failed: ${error.message}`, error.stack);
    }
  }

  /**
   * Cleanup old jobs (keep last 30 days)
   * Runs every Sunday at 3:00 AM
   */
  @Cron('0 3 * * 0', {
    name: 'cleanup-old-jobs',
    timeZone: 'Asia/Seoul',
  })
  async cleanupOldJobs() {
    if (!this.enabled) {
      return;
    }

    this.logger.log('Starting old jobs cleanup...');

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get old completed jobs
      const { jobs } = await this.batchAnalysisService.listJobs({
        status: 'COMPLETED',
        endDate: thirtyDaysAgo.toISOString().split('T')[0],
        limit: 100,
      });

      let deletedCount = 0;
      for (const job of jobs) {
        try {
          await this.batchAnalysisService.deleteJob(job.id);
          deletedCount++;
        } catch (error) {
          this.logger.warn(`Failed to delete job ${job.id}: ${error.message}`);
        }
      }

      this.logger.log(`Cleanup completed: ${deletedCount} old jobs deleted`);
    } catch (error) {
      this.logger.error(`Cleanup failed: ${error.message}`, error.stack);
    }
  }

  /**
   * Manual trigger for testing (not scheduled)
   */
  async triggerManualAnalysis(targetDate?: string) {
    const date = targetDate || new Date().toISOString().split('T')[0];

    this.logger.log(`Manual analysis triggered for date: ${date}`);

    const job = await this.batchAnalysisService.createJob({
      targetDate: date,
      sampleSize: 50,
    });

    await this.batchAnalysisService.runJob(job.id);

    return job;
  }
}
