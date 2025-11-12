import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { NotificationProducerService } from './notification-producer.service';
import { ShoppingListProducerService } from './shopping-list-producer.service';
import { Stock } from '../stock/entities/stock.entity';
import { AppConfigType } from '../../config/configuration';

@Injectable()
export class NotificationScannerService {
  private readonly logger = new Logger(NotificationScannerService.name);
  private readonly leadDays: number;

  constructor(
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
    private readonly producerService: NotificationProducerService,
    private readonly shoppingListProducer: ShoppingListProducerService,
    configService: ConfigService<{ app: AppConfigType }, true>,
  ) {
    const appConfig = configService.getOrThrow<AppConfigType>('app');
    this.leadDays = appConfig.notification.leadDays;
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async scanAndDispatch(): Promise<void> {
    this.logger.debug('Running notification scanner job');

    const stocks = await this.stockRepository.find({
      relations: ['item', 'location'],
    });

    const now = new Date();
    const leadDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + this.leadDays,
    );

    for (const stock of stocks) {
      if (stock.quantity <= stock.minQuantity) {
        this.producerService.publish({
          stockId: stock.id,
          itemId: stock.item.id,
          itemName: stock.item.name,
          locationName: stock.location?.name ?? null,
          quantity: stock.quantity,
          minQuantity: stock.minQuantity,
          expiryDate: stock.expiryDate,
          type: 'low_stock',
          detectedAt: now.toISOString(),
        });
        this.shoppingListProducer.publish({
          itemId: stock.item.id,
          itemName: stock.item.name,
          quantity: Math.max(stock.minQuantity - stock.quantity, 1),
          locationName: stock.location?.name ?? null,
          reason: 'low_stock',
          detectedAt: now.toISOString(),
        });
      }

      if (stock.expiryDate) {
        const expiry = new Date(stock.expiryDate);
        if (expiry <= leadDate) {
          this.producerService.publish({
            stockId: stock.id,
            itemId: stock.item.id,
            itemName: stock.item.name,
            locationName: stock.location?.name ?? null,
            quantity: stock.quantity,
            minQuantity: stock.minQuantity,
            expiryDate: stock.expiryDate,
            type: 'near_expiry',
            detectedAt: now.toISOString(),
          });
          this.shoppingListProducer.publish({
            itemId: stock.item.id,
            itemName: stock.item.name,
            quantity: Math.max(stock.minQuantity ?? stock.quantity ?? 1, 1),
            locationName: stock.location?.name ?? null,
            reason: 'near_expiry',
            detectedAt: now.toISOString(),
          });
        }
      }
    }
  }
}
