import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import type { ShoppingListStatus } from '../entities/shopping-list.entity';

export class UpdateShoppingListStatusDto {
  @ApiProperty({
    description: '清单状态',
    enum: ['pending', 'partial', 'completed'],
  })
  @IsEnum(['pending', 'partial', 'completed'])
  status!: ShoppingListStatus;
}
