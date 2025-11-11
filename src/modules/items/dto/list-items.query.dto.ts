import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class ListItemsQueryDto {
  @ApiPropertyOptional({ description: '按分类筛选' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: '按默认位置筛选' })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({ description: '名称或编码关键字模糊搜索' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  keyword?: string;

  @ApiPropertyOptional({
    description: '按标签筛选（传多个时为包含任意一个标签）',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (Array.isArray(value)) {
      return value
        .map((item) => (typeof item === 'string' ? item.trim() : String(item)))
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }
    return undefined;
  })
  @ArrayUnique()
  @IsUUID('4', { each: true })
  tagIds?: string[];
}
