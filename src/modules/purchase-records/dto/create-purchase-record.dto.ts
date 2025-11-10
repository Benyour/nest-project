import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PurchaseRecordStatus } from '../entities/purchase-record.entity';
import { PurchaseRecordItemDto } from './purchase-record-item.dto';

export class CreatePurchaseRecordDto {
  @ApiProperty({ description: '采购单编号（可自动生成）' })
  @IsString()
  @MaxLength(32)
  code!: string;

  @ApiProperty({ description: '创建人用户 ID' })
  @IsUUID()
  createdById!: string;

  @ApiProperty({ description: '采购日期', example: '2025-01-01' })
  @IsDateString()
  purchaseDate!: string;

  @ApiPropertyOptional({ description: '供应商/门店名称' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  storeName?: string;

  @ApiPropertyOptional({ description: '门店类型（线上/线下）' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  storeType?: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional({
    description: '初始状态，默认 draft',
    enum: PurchaseRecordStatus,
  })
  @IsOptional()
  @IsEnum(PurchaseRecordStatus)
  status?: PurchaseRecordStatus;

  @ApiProperty({ description: '采购明细列表', type: [PurchaseRecordItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => PurchaseRecordItemDto)
  items!: PurchaseRecordItemDto[];
}
