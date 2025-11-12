import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Stock } from '../stock/entities/stock.entity';
import { Item } from '../items/entities/item.entity';
import { Location } from '../locations/entities/location.entity';
import { NotificationProducerService } from './notification-producer.service';
import { ShoppingListProducerService } from './shopping-list-producer.service';
import { NotificationConsumerService } from './notification-consumer.service';
import { EmailService } from './email.service';
import { NotificationScannerService } from './notification-scanner.service';
import { AppConfigType } from '../../config/configuration';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Stock, Item, Location]),
    ClientsModule.registerAsync([
      {
        name: 'NOTIFICATION_QUEUE',
        inject: [ConfigService],
        useFactory: (
          configService: ConfigService<{ app: AppConfigType }, true>,
        ) => {
          const appConfig = configService.getOrThrow<AppConfigType>('app');
          if (!appConfig.rabbitmq.url) {
            throw new Error('RabbitMQ connection is not configured');
          }
          return {
            transport: Transport.RMQ,
            options: {
              urls: [appConfig.rabbitmq.url],
              queue: appConfig.rabbitmq.notificationQueue,
              queueOptions: {
                durable: true,
              },
            },
          };
        },
      },
      {
        name: 'SHOPPING_LIST_QUEUE',
        inject: [ConfigService],
        useFactory: (
          configService: ConfigService<{ app: AppConfigType }, true>,
        ) => {
          const appConfig = configService.getOrThrow<AppConfigType>('app');
          if (!appConfig.rabbitmq.url) {
            throw new Error('RabbitMQ connection is not configured');
          }
          return {
            transport: Transport.RMQ,
            options: {
              urls: [appConfig.rabbitmq.url],
              queue: appConfig.rabbitmq.shoppingListQueue,
              queueOptions: {
                durable: true,
              },
            },
          };
        },
      },
    ]),
  ],
  controllers: [NotificationConsumerService],
  providers: [
    NotificationProducerService,
    ShoppingListProducerService,
    EmailService,
    NotificationScannerService,
  ],
  exports: [
    NotificationProducerService,
    ShoppingListProducerService,
    NotificationScannerService,
  ],
})
export class NotificationsModule {}
