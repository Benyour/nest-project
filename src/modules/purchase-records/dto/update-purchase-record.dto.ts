import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PurchaseRecordStatus } from '../entities/purchase-record.entity';
import { PurchaseRecordItemDto } from './purchase-record-item.dto';

export class UpdatePurchaseRecordDto {
  @ApiPropertyOptional({ description: '采购日期' })
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiPropertyOptional({ description: '供应商/门店名称' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  storeName?: string;

  @ApiPropertyOptional({ description: '门店类型' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  storeType?: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional({ description: '状态', enum: PurchaseRecordStatus })
  @IsOptional()
  @IsEnum(PurchaseRecordStatus)
  status?: PurchaseRecordStatus;

  @ApiPropertyOptional({
    description: '明细列表（完整替换）',
    type: [PurchaseRecordItemDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => PurchaseRecordItemDto)
  items?: PurchaseRecordItemDto[];
}
