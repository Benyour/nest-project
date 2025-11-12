import { ApiPropertyOptional } from '@nestjs/swagger';
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

export class UpdateUsageRecordDto {
  @ApiPropertyOptional({ description: '使用日期' })
  @IsOptional()
  @IsDateString()
  usageDate?: string;

  @ApiPropertyOptional({ description: '使用类型', enum: UsageRecordType })
  @IsOptional()
  @IsEnum(UsageRecordType)
  type?: UsageRecordType;

  @ApiPropertyOptional({ description: '状态', enum: UsageRecordStatus })
  @IsOptional()
  @IsEnum(UsageRecordStatus)
  status?: UsageRecordStatus;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional({
    description: '明细列表（完整替换）',
    type: [UsageRecordItemDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => UsageRecordItemDto)
  items?: UsageRecordItemDto[];
}
