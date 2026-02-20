import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../admin/database/prisma.service';
import { SlackNotificationService } from '../notifications/slack-notification.service';
import { DataCollectorService } from './services/data-collector.service';
import { QuestionScorerService } from './services/question-scorer.service';
import { ReportBuilderService } from './services/report-builder.service';
import { ListReportsDto } from './dto/list-reports.dto';

const MIN_ROW_THRESHOLD = 50;

@Injectable()
export class IbkChatReportService implements OnModuleInit {
  private readonly logger = new Logger(IbkChatReportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dataCollector: DataCollectorService,
    private readonly questionScorer: QuestionScorerService,
    private readonly reportBuilder: ReportBuilderService,
    private readonly slackNotification: SlackNotificationService,
  ) {}

  async onModuleInit() {
    await this.resetStaleRunningReports();
  }

  private async resetStaleRunningReports() {
    const updated = await this.prisma.ibkChatDailyReport.updateMany({
      where: { status: 'RUNNING' },
      data: {
        status: 'FAILED',
        errorMessage: 'Server restarted while report was generating',
        completedAt: new Date(),
      },
    });
    if (updated.count > 0) {
      this.logger.warn(
        `Reset ${updated.count} stale RUNNING report(s) to FAILED`,
      );
    }
  }

  private toUTCMidnight(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  }

  async generateDailyReport(
    targetDate: string,
    force = false,
  ): Promise<{ reportId: string; status: string }> {
    const targetDateTime = this.toUTCMidnight(targetDate);

    const existing = await this.prisma.ibkChatDailyReport.findUnique({
      where: { targetDate: targetDateTime },
    });

    if (existing?.status === 'RUNNING') {
      throw new ConflictException(
        `Report for ${targetDate} is already running`,
      );
    }

    if (existing && !force) {
      if (existing.status === 'COMPLETED' || existing.status === 'SKIPPED') {
        throw new ConflictException(
          `Report for ${targetDate} already exists (status: ${existing.status}). Use force=true to regenerate.`,
        );
      }
    }

    if (existing && force) {
      await this.prisma.ibkChatDailyReport.delete({
        where: { id: existing.id },
      });
    }

    const report = await this.prisma.ibkChatDailyReport.create({
      data: {
        targetDate: targetDateTime,
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    this.executeReportGeneration(report.id, targetDate).catch((error) => {
      this.logger.error(
        `Report generation failed for ${targetDate}: ${(error as Error).message}`,
      );
    });

    return { reportId: report.id, status: 'RUNNING' };
  }

  private async executeReportGeneration(
    reportId: string,
    targetDate: string,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      const rowCount = await this.dataCollector.getTotalRowCount(targetDate);

      if (rowCount < MIN_ROW_THRESHOLD) {
        await this.prisma.ibkChatDailyReport.update({
          where: { id: reportId },
          data: {
            status: 'SKIPPED',
            rowCount,
            durationMs: Date.now() - startTime,
            completedAt: new Date(),
            errorMessage: `Data insufficient: ${rowCount} rows (minimum: ${MIN_ROW_THRESHOLD})`,
          },
        });
        this.logger.log(
          `Report SKIPPED for ${targetDate}: only ${rowCount} rows`,
        );
        return;
      }

      const collectedData = await this.dataCollector.collectAll(targetDate);

      const highValueQuestions = this.questionScorer.getTop30(
        await this.dataCollector.fetchCandidateQuestions(targetDate),
      );
      collectedData.highValueQuestions = highValueQuestions;

      const reportMarkdown =
        await this.reportBuilder.generateReport(collectedData);

      const reportMetadata = JSON.stringify({
        totalRequests: collectedData.kpi.totalRequests,
        successRate: collectedData.kpi.successRate,
        failCount: collectedData.kpi.failCount,
        topQuestionTypes: collectedData.questionTypeStats
          .slice(0, 5)
          .map((s) => s.questionType),
        tokenP99: collectedData.kpi.p99Tokens,
      });

      const durationMs = Date.now() - startTime;

      await this.prisma.ibkChatDailyReport.update({
        where: { id: reportId },
        data: {
          status: 'COMPLETED',
          reportMarkdown,
          reportMetadata,
          rowCount,
          durationMs,
          completedAt: new Date(),
        },
      });

      this.logger.log(
        `Report COMPLETED for ${targetDate}: ${rowCount} rows, ${durationMs}ms`,
      );

      await this.slackNotification
        .sendAlert({
          title: 'IBK-CHAT 일일 리포트 생성 완료',
          message: `*${targetDate}* 리포트가 생성되었습니다.\n총 ${rowCount}건, 성공률 ${collectedData.kpi.successRate}%, 소요시간 ${(durationMs / 1000).toFixed(1)}초`,
          severity: 'info',
        })
        .catch(() => {});
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = (error as Error).message;

      await this.prisma.ibkChatDailyReport.update({
        where: { id: reportId },
        data: {
          status: 'FAILED',
          errorMessage,
          durationMs,
          completedAt: new Date(),
        },
      });

      this.logger.error(
        `Report FAILED for ${targetDate}: ${errorMessage}`,
        (error as Error).stack,
      );

      await this.slackNotification
        .sendAlert({
          title: 'IBK-CHAT 일일 리포트 생성 실패',
          message: `*${targetDate}* 리포트 생성에 실패했습니다.\n에러: ${errorMessage}`,
          severity: 'critical',
        })
        .catch(() => {});
    }
  }

  async listReports(dto: ListReportsDto) {
    const where: Record<string, unknown> = {};

    if (dto.status) {
      where.status = dto.status;
    }

    if (dto.startDate || dto.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (dto.startDate) {
        dateFilter.gte = this.toUTCMidnight(dto.startDate);
      }
      if (dto.endDate) {
        dateFilter.lte = this.toUTCMidnight(dto.endDate);
      }
      where.targetDate = dateFilter;
    }

    const [reports, total] = await Promise.all([
      this.prisma.ibkChatDailyReport.findMany({
        where,
        select: {
          id: true,
          targetDate: true,
          status: true,
          rowCount: true,
          durationMs: true,
          createdAt: true,
          completedAt: true,
        },
        orderBy: { targetDate: 'desc' },
        take: dto.limit ?? 20,
        skip: dto.offset ?? 0,
      }),
      this.prisma.ibkChatDailyReport.count({ where }),
    ]);

    return { reports, total };
  }

  async getReport(date: string) {
    const targetDateTime = this.toUTCMidnight(date);
    const report = await this.prisma.ibkChatDailyReport.findUnique({
      where: { targetDate: targetDateTime },
    });

    if (!report) {
      throw new NotFoundException(`Report not found for date: ${date}`);
    }

    return report;
  }

  async deleteReport(id: string) {
    const report = await this.prisma.ibkChatDailyReport.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException(`Report not found: ${id}`);
    }

    await this.prisma.ibkChatDailyReport.delete({ where: { id } });
    return { deleted: true };
  }

  async getStats() {
    const [total, completed, failed, skipped, running] = await Promise.all([
      this.prisma.ibkChatDailyReport.count(),
      this.prisma.ibkChatDailyReport.count({
        where: { status: 'COMPLETED' },
      }),
      this.prisma.ibkChatDailyReport.count({ where: { status: 'FAILED' } }),
      this.prisma.ibkChatDailyReport.count({
        where: { status: 'SKIPPED' },
      }),
      this.prisma.ibkChatDailyReport.count({
        where: { status: 'RUNNING' },
      }),
    ]);

    return { total, completed, failed, skipped, running };
  }
}
