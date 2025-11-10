import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { StockAdjustmentType } from '../entities/stock-adjustment.entity';

export class AdjustStockDto {
  @ApiProperty({ description: '调整类型', enum: StockAdjustmentType })
  @IsEnum(StockAdjustmentType)
  type!: StockAdjustmentType;

  @ApiProperty({
    description: '库存增减数量，正数代表入库，负数代表出库',
    example: -2,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  delta!: number;

  @ApiPropertyOptional({ description: '调整原因说明' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  reason?: string;

  @ApiPropertyOptional({ description: '备注信息' })
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional({ description: '操作者用户 ID' })
  @IsOptional()
  @IsUUID()
  createdById?: string;
}
