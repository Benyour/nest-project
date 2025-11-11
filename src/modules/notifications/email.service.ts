import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { StockNotificationEvent } from './notification-producer.service';
import { AppConfigType } from '../../config/configuration';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter?: Transporter;
  private readonly from: string;

  constructor(configService: ConfigService<{ app: AppConfigType }, true>) {
    const appConfig = configService.getOrThrow<AppConfigType>('app');
    const { host, port, secure, user, pass, from } = appConfig.mail;

    this.from = from;

    if (!host || !user || !pass) {
      this.logger.warn(
        'Mail credentials are not fully configured, email sending disabled',
      );
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  async sendStockNotification(
    event: StockNotificationEvent,
    recipients: string[],
  ): Promise<void> {
    if (!this.transporter) {
      this.logger.warn('Transporter not initialized, cannot send email');
      return;
    }

    const subject =
      event.type === 'low_stock'
        ? `低库存提醒：${event.itemName}`
        : `临期提醒：${event.itemName}`;

    const lines = [
      `物品：${event.itemName}`,
      `所在位置：${event.locationName ?? '未知'}`,
      `当前数量：${event.quantity}`,
      `最低库存阈值：${event.minQuantity}`,
      `检测时间：${event.detectedAt}`,
    ];

    if (event.expiryDate) {
      lines.push(`过期日期：${event.expiryDate}`);
    }

    const html = `
      <p>${subject}</p>
      <ul>
        ${lines.map((line) => `<li>${line}</li>`).join('')}
      </ul>
    `;

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await this.transporter.sendMail({
        from: this.from,
        to: recipients,
        subject,
        html,
      });
      this.logger.log(`Notification email sent for stock ${event.stockId}`);
    } catch (error) {
      this.logger.error('Failed to send notification email', error);
    }
  }
}
