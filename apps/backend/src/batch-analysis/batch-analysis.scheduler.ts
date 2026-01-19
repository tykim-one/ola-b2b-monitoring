import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { PrismaService } from '../admin/database/prisma.service';
import { BatchAnalysisService } from './batch-analysis.service';
import { BatchSchedulerConfig } from '../generated/prisma';

@Injectable()
export class BatchAnalysisScheduler implements OnModuleInit {
  private readonly logger = new Logger(BatchAnalysisScheduler.name);

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly prisma: PrismaService,
    private readonly batchAnalysisService: BatchAnalysisService,
  ) {}

  async onModuleInit() {
    await this.loadAllSchedules();
  }

  /**
   * Load all enabled schedules from DB and register cron jobs
   */
  async loadAllSchedules() {
    try {
      const schedules = await this.prisma.batchSchedulerConfig.findMany({
        where: { isEnabled: true },
      });

      for (const schedule of schedules) {
        this.registerCronJob(schedule);
      }

      this.logger.log(`Loaded ${schedules.length} batch analysis schedules`);
    } catch (error) {
      this.logger.error(`Failed to load schedules: ${error.message}`);
    }
  }

  /**
   * Build cron expression from schedule config
   * Format: "minute hour * * daysOfWeek"
   */
  private buildCronExpression(schedule: BatchSchedulerConfig): string {
    return `${schedule.minute} ${schedule.hour} * * ${schedule.daysOfWeek}`;
  }

  /**
   * Register a cron job for a schedule
   */
  registerCronJob(schedule: BatchSchedulerConfig) {
    const jobName = `batch-analysis-${schedule.id}`;
    const cronExpr = this.buildCronExpression(schedule);

    try {
      // Remove existing job if present
      if (this.schedulerRegistry.doesExist('cron', jobName)) {
        this.schedulerRegistry.deleteCronJob(jobName);
      }

      const job = new CronJob(
        cronExpr,
        () => this.executeSchedule(schedule.id),
        null,
        true,
        schedule.timeZone,
      );

      this.schedulerRegistry.addCronJob(jobName, job);
      job.start();

      this.logger.log(
        `Registered schedule "${schedule.name}" [${cronExpr}] (${schedule.timeZone})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to register schedule "${schedule.name}": ${error.message}`,
      );
    }
  }

  /**
   * Execute a scheduled analysis job
   */
  async executeSchedule(scheduleId: string) {
    try {
      // Reload schedule from DB to get latest config
      const schedule = await this.prisma.batchSchedulerConfig.findUnique({
        where: { id: scheduleId },
      });

      if (!schedule || !schedule.isEnabled) {
        this.logger.debug(`Schedule ${scheduleId} is disabled or not found`);
        return;
      }

      this.logger.log(`Executing schedule "${schedule.name}"...`);

      // Calculate yesterday's date
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const targetDate = yesterday.toISOString().split('T')[0];

      // Create and run analysis job
      const job = await this.batchAnalysisService.createJob({
        targetDate,
        tenantId: schedule.targetTenantId || undefined,
        sampleSize: schedule.sampleSize,
        promptTemplateId: schedule.promptTemplateId || undefined,
      });

      await this.batchAnalysisService.runJob(job.id);

      this.logger.log(
        `Schedule "${schedule.name}" started job ${job.id} for ${targetDate}`,
      );
    } catch (error) {
      this.logger.error(
        `Schedule execution failed for ${scheduleId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Reload a specific schedule (called when schedule is updated via API)
   */
  async reloadSchedule(scheduleId: string) {
    const jobName = `batch-analysis-${scheduleId}`;

    // Remove existing job
    if (this.schedulerRegistry.doesExist('cron', jobName)) {
      this.schedulerRegistry.deleteCronJob(jobName);
      this.logger.debug(`Removed existing cron job: ${jobName}`);
    }

    // Load and re-register if enabled
    const schedule = await this.prisma.batchSchedulerConfig.findUnique({
      where: { id: scheduleId },
    });

    if (schedule?.isEnabled) {
      this.registerCronJob(schedule);
    }
  }

  /**
   * Remove a schedule's cron job (called when schedule is deleted)
   */
  async removeSchedule(scheduleId: string) {
    const jobName = `batch-analysis-${scheduleId}`;

    if (this.schedulerRegistry.doesExist('cron', jobName)) {
      this.schedulerRegistry.deleteCronJob(jobName);
      this.logger.log(`Removed cron job: ${jobName}`);
    }
  }

  /**
   * Get all registered cron job names (for debugging)
   */
  getRegisteredJobs(): string[] {
    return this.schedulerRegistry.getCronJobs()
      ? Array.from(this.schedulerRegistry.getCronJobs().keys())
      : [];
  }
}
