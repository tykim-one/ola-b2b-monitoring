import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { IbkChatReportService } from './ibk-chat-report.service';

@Injectable()
export class IbkChatReportScheduler {
  private readonly logger = new Logger(IbkChatReportScheduler.name);

  constructor(
    private readonly ibkChatReportService: IbkChatReportService,
  ) {
    this.logger.log('IBK-CHAT report scheduler registered (daily 02:00 KST)');
  }

  @Cron('0 2 * * *', { timeZone: 'Asia/Seoul' })
  async runDailyReport() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const targetDate = yesterday.toISOString().split('T')[0];

    this.logger.log(`Running daily IBK-CHAT report for ${targetDate}`);

    try {
      await this.ibkChatReportService.generateDailyReport(targetDate, false);
      this.logger.log(`Daily report triggered for ${targetDate}`);
    } catch (error) {
      this.logger.error(
        `Daily report failed for ${targetDate}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
