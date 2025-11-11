import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateItemDto {
  @ApiProperty({ description: '所属分类 ID' })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ description: '物品名称' })
  @IsString()
  @MaxLength(128)
  name!: string;

  @ApiPropertyOptional({ description: '物品编码/条形码' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;

  @ApiPropertyOptional({ description: '品牌信息' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  brand?: string;

  @ApiPropertyOptional({ description: '规格描述' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  specification?: string;

  @ApiProperty({ description: '计量单位，例如 个/包/瓶' })
  @IsString()
  @MaxLength(16)
  unit!: string;

  @ApiPropertyOptional({ description: '默认存放位置 ID' })
  @IsOptional()
  @IsUUID()
  defaultLocationId?: string;

  @ApiPropertyOptional({ description: '保质期（天）' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  shelfLifeDays?: number;

  @ApiPropertyOptional({ description: '图片 URL' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  imageUrl?: string;

  @ApiPropertyOptional({ description: '备注信息' })
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional({
    description: '关联标签 ID 列表',
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
