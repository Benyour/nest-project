import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Item } from '../items/entities/item.entity';
import { Location } from '../locations/entities/location.entity';
import { Stock } from '../stock/entities/stock.entity';
import { StockAdjustment } from '../stock/entities/stock-adjustment.entity';
import { StockModule } from '../stock/stock.module';
import { User } from '../users/entities/user.entity';
import { UsageRecordItem } from './entities/usage-record-item.entity';
import { UsageRecord } from './entities/usage-record.entity';
import { UsageRecordsController } from './usage-records.controller';
import { UsageRecordsService } from './usage-records.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UsageRecord,
      UsageRecordItem,
      Item,
      Location,
      Stock,
      StockAdjustment,
      User,
    ]),
    StockModule,
    AuthModule,
  ],
  controllers: [UsageRecordsController],
  providers: [UsageRecordsService],
})
export class UsageRecordsModule {}
