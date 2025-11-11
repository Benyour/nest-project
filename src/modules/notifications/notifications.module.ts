import { Module } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Stock } from '../stock/entities/stock.entity';
import { Item } from '../items/entities/item.entity';
import { Location } from '../locations/entities/location.entity';
import { NotificationProducerService } from './notification-producer.service';
import { NotificationConsumerService } from './notification-consumer.service';
import { EmailService } from './email.service';
import { NotificationScannerService } from './notification-scanner.service';
import { AppConfigType } from '../../config/configuration';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Stock, Item, Location])],
  controllers: [NotificationConsumerService],
  providers: [
    {
      provide: 'NOTIFICATION_QUEUE',
      inject: [ConfigService],
      useFactory: (
        configService: ConfigService<{ app: AppConfigType }, true>,
      ) => {
        const appConfig = configService.getOrThrow<AppConfigType>('app');

        return ClientProxyFactory.create({
          transport: Transport.RMQ,
          options: {
            urls: [appConfig.rabbitmq.url],
            queue: appConfig.rabbitmq.notificationQueue,
            queueOptions: {
              durable: true,
            },
          },
        });
      },
    },
    NotificationProducerService,
    EmailService,
    NotificationScannerService,
  ],
  exports: [NotificationProducerService, NotificationScannerService],
})
export class NotificationsModule {}
