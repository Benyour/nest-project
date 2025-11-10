import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

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
}
