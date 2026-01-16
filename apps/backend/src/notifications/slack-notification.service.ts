import { Injectable, Logger } from '@nestjs/common';
import { WebClient } from '@slack/web-api';
import { ConfigService } from '@nestjs/config';

export interface SlackAlert {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  fields?: { name: string; value: string }[];
  channel?: string;
}

export interface FrustrationAlertData {
  userId: string;
  tenantId: string;
  frustrationLevel: number;
  recentQueries: string[];
  timestamp: string;
}

export interface NewPatternAlertData {
  pattern: string;
  recentCount: number;
  isNew: boolean;
  firstSeen: string;
}

@Injectable()
export class SlackNotificationService {
  private readonly logger = new Logger(SlackNotificationService.name);
  private readonly slackClient: WebClient | null;
  private readonly webhookUrl: string | null;
  private readonly defaultChannel: string;
  private readonly isEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.webhookUrl =
      this.configService.get<string>('SLACK_WEBHOOK_URL') || null;
    const botToken = this.configService.get<string>('SLACK_BOT_TOKEN') || null;
    this.defaultChannel =
      this.configService.get<string>('SLACK_DEFAULT_CHANNEL') || '#alerts';

    // Initialize Slack client only if bot token is provided
    this.slackClient = botToken ? new WebClient(botToken) : null;

    // Service is enabled if either webhook URL or bot token is configured
    this.isEnabled = !!(this.webhookUrl || botToken);

    if (this.isEnabled) {
      this.logger.log('Slack notification service initialized successfully');
    } else {
      this.logger.warn(
        'Slack notification service disabled: No SLACK_WEBHOOK_URL or SLACK_BOT_TOKEN configured',
      );
    }
  }

  /**
   * Get color code based on severity level
   */
  private getSeverityColor(severity: 'info' | 'warning' | 'critical'): string {
    const colors = {
      info: '#2196F3', // Blue
      warning: '#FF9800', // Orange
      critical: '#F44336', // Red
    };
    return colors[severity];
  }

  /**
   * Get emoji based on severity level
   */
  private getSeverityEmoji(severity: 'info' | 'warning' | 'critical'): string {
    const emojis = {
      info: ':information_source:',
      warning: ':warning:',
      critical: ':rotating_light:',
    };
    return emojis[severity];
  }

  /**
   * Send a generic alert to Slack
   */
  async sendAlert(alert: SlackAlert): Promise<void> {
    if (!this.isEnabled) {
      this.logger.debug('Slack notifications disabled, skipping alert');
      return;
    }

    try {
      const channel = alert.channel || this.defaultChannel;
      const color = this.getSeverityColor(alert.severity);
      const emoji = this.getSeverityEmoji(alert.severity);

      const blocks: any[] = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${emoji} ${alert.title}`,
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: alert.message,
          },
        },
      ];

      // Add fields if provided
      if (alert.fields && alert.fields.length > 0) {
        const fields = alert.fields.map((field) => ({
          type: 'mrkdwn',
          text: `*${field.name}:*\n${field.value}`,
        }));

        blocks.push({
          type: 'section',
          fields,
        });
      }

      // Add context with timestamp
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Severity: *${alert.severity.toUpperCase()}* | ${new Date().toISOString()}`,
          },
        ],
      });

      // Send via bot token if available, otherwise use webhook
      if (this.slackClient) {
        await this.slackClient.chat.postMessage({
          channel,
          blocks,
          attachments: [
            {
              color,
              fallback: `${alert.title}: ${alert.message}`,
            },
          ],
        });
      } else if (this.webhookUrl) {
        const response = await fetch(this.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel,
            blocks,
            attachments: [
              {
                color,
                fallback: `${alert.title}: ${alert.message}`,
              },
            ],
          }),
        });

        if (!response.ok) {
          throw new Error(
            `Webhook request failed: ${response.status} ${response.statusText}`,
          );
        }
      }

      this.logger.log(`Slack alert sent: ${alert.title} (${alert.severity})`);
    } catch (error) {
      this.logger.error(
        `Failed to send Slack alert: ${error.message}`,
        error.stack,
      );
      // Don't throw - gracefully handle failures
    }
  }

  /**
   * Send frustrated user alert
   */
  async sendFrustrationAlert(data: FrustrationAlertData): Promise<void> {
    const severity = data.frustrationLevel >= 0.8 ? 'critical' : 'warning';
    const queriesText = data.recentQueries
      .slice(0, 5)
      .map((q, i) => `${i + 1}. ${q}`)
      .join('\n');

    await this.sendAlert({
      title: 'Frustrated User Detected',
      message: `User showing signs of frustration with repeated failed queries.`,
      severity,
      fields: [
        {
          name: 'User ID',
          value: data.userId,
        },
        {
          name: 'Tenant ID',
          value: data.tenantId,
        },
        {
          name: 'Frustration Level',
          value: `${(data.frustrationLevel * 100).toFixed(1)}%`,
        },
        {
          name: 'Recent Queries',
          value: queriesText || 'No recent queries',
        },
        {
          name: 'Timestamp',
          value: data.timestamp,
        },
      ],
    });
  }

  /**
   * Send new pattern alert
   */
  async sendNewPatternAlert(data: NewPatternAlertData): Promise<void> {
    const severity = data.recentCount > 50 ? 'warning' : 'info';
    const statusText = data.isNew
      ? '🆕 New Pattern Detected'
      : '📈 Pattern Surge Detected';

    await this.sendAlert({
      title: statusText,
      message: `A ${data.isNew ? 'new' : 'known'} query pattern is gaining traction.`,
      severity,
      fields: [
        {
          name: 'Pattern',
          value: `\`${data.pattern}\``,
        },
        {
          name: 'Recent Count',
          value: data.recentCount.toString(),
        },
        {
          name: 'Status',
          value: data.isNew
            ? 'New (first seen today)'
            : 'Existing (increased usage)',
        },
        {
          name: 'First Seen',
          value: data.firstSeen,
        },
      ],
    });
  }

  /**
   * Check if Slack notifications are enabled
   */
  isNotificationEnabled(): boolean {
    return this.isEnabled;
  }
}
