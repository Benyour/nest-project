import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  UsageRecordStatus,
  UsageRecordType,
} from '../entities/usage-record.entity';
import { UsageRecordItemDto } from './usage-record-item.dto';

export class CreateUsageRecordDto {
  @ApiProperty({ description: '使用日期', example: '2025-01-20' })
  @IsDateString()
  usageDate!: string;

  @ApiProperty({
    description: '使用类型',
    enum: UsageRecordType,
    default: UsageRecordType.DAILY,
  })
  @IsEnum(UsageRecordType)
  type!: UsageRecordType;

  @ApiPropertyOptional({
    description: '初始状态，默认 draft',
    enum: UsageRecordStatus,
  })
  @IsOptional()
  @IsEnum(UsageRecordStatus)
  status?: UsageRecordStatus;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiProperty({ description: '使用明细列表', type: [UsageRecordItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => UsageRecordItemDto)
  items!: UsageRecordItemDto[];
}
