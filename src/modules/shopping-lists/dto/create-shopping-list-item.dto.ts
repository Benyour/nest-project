import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateShoppingListItemDto {
  @ApiProperty({ description: '物品 ID' })
  @IsUUID()
  itemId!: string;

  @ApiProperty({
    description: '需要购买数量',
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity!: number;

  @ApiPropertyOptional({
    description: '初始状态（默认 pending）',
    enum: ['pending', 'purchased'],
  })
  @IsOptional()
  @IsEnum(['pending', 'purchased'])
  status?: 'pending' | 'purchased';

  @ApiPropertyOptional({ description: '备注', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  remarks?: string;
}
