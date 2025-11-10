import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateStockDto {
  @ApiProperty({ description: '物品 ID' })
  @IsUUID()
  itemId!: string;

  @ApiProperty({ description: '存放位置 ID' })
  @IsUUID()
  locationId!: string;

  @ApiProperty({ description: '当前库存数量', example: 10 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  quantity!: number;

  @ApiPropertyOptional({ description: '低库存阈值', example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minQuantity?: number;

  @ApiPropertyOptional({ description: '最新采购单价', example: 25.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  latestPurchasePrice?: number;

  @ApiPropertyOptional({ description: '最近采购日期', example: '2025-01-01' })
  @IsOptional()
  @IsDateString()
  latestPurchaseDate?: string;

  @ApiPropertyOptional({ description: '预计过期日期', example: '2025-02-01' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ description: '备注信息' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  memo?: string;
}
