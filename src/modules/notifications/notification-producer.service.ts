import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

export interface StockNotificationEvent {
  stockId: string;
  itemId: string;
  itemName: string;
  locationName: string | null;
  quantity: number;
  minQuantity: number;
  expiryDate: string | null;
  type: 'low_stock' | 'near_expiry';
  detectedAt: string;
}

@Injectable()
export class NotificationProducerService {
  private readonly logger = new Logger(NotificationProducerService.name);

  constructor(
    @Inject('NOTIFICATION_QUEUE') private readonly client: ClientProxy,
  ) {}

  publish(event: StockNotificationEvent): void {
    this.client.emit<StockNotificationEvent>('notifications.stock', event);
    this.logger.debug(
      `Published notification event for stock ${event.stockId}: ${event.type}`,
    );
  }
}
