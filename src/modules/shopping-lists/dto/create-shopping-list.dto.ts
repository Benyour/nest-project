import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CreateShoppingListItemDto } from './create-shopping-list-item.dto';

export class CreateShoppingListDto {
  @ApiProperty({ description: '清单名称', maxLength: 128 })
  @IsString()
  @MaxLength(128)
  name!: string;

  @ApiPropertyOptional({ description: '备注', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  remarks?: string;

  @ApiProperty({
    description: '清单条目',
    type: [CreateShoppingListItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  items!: CreateShoppingListItemDto[];
}
