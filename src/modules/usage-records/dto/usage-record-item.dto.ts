import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class UsageRecordItemDto {
  @ApiProperty({ description: '物品 ID' })
  @IsUUID()
  itemId!: string;

  @ApiProperty({ description: '使用位置 ID' })
  @IsUUID()
  locationId!: string;

  @ApiProperty({ description: '使用数量', example: 1.5 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantity!: number;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  remarks?: string;
}
