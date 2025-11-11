import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import type { StockNotificationEvent } from './notification-producer.service';
import { EmailService } from './email.service';
import { AppConfigType } from '../../config/configuration';

@Controller()
export class NotificationConsumerService {
  private readonly logger = new Logger(NotificationConsumerService.name);
  private readonly emailEnabled: boolean;
  private readonly recipients: string[];

  constructor(
    configService: ConfigService<{ app: AppConfigType }, true>,
    private readonly emailService: EmailService,
  ) {
    const appConfig = configService.getOrThrow<AppConfigType>('app');
    this.emailEnabled = appConfig.notification.emailEnabled;
    this.recipients = appConfig.notification.recipients;
  }

  @EventPattern('notifications.stock')
  async handleStockNotification(
    @Payload() event: StockNotificationEvent,
  ): Promise<void> {
    this.logger.log(
      `Received notification event for stock ${event.stockId}: ${event.type}`,
    );

    if (!this.emailEnabled) {
      this.logger.debug('Email notifications disabled, skipping send');
      return;
    }

    if (!this.recipients.length) {
      this.logger.warn(
        'Email notifications enabled but no recipients configured',
      );
      return;
    }

    await this.emailService.sendStockNotification(event, this.recipients);
  }
}
