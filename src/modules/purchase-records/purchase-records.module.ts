import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Item } from '../items/entities/item.entity';
import { Location } from '../locations/entities/location.entity';
import { Stock } from '../stock/entities/stock.entity';
import { StockAdjustment } from '../stock/entities/stock-adjustment.entity';
import { StockModule } from '../stock/stock.module';
import { User } from '../users/entities/user.entity';
import { PurchaseRecordItem } from './entities/purchase-record-item.entity';
import { PurchaseRecord } from './entities/purchase-record.entity';
import { PurchaseRecordsController } from './purchase-records.controller';
import { PurchaseRecordsService } from './purchase-records.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseRecord,
      PurchaseRecordItem,
      Item,
      Location,
      Stock,
      StockAdjustment,
      User,
    ]),
    StockModule,
  ],
  controllers: [PurchaseRecordsController],
  providers: [PurchaseRecordsService],
})
export class PurchaseRecordsModule {}
