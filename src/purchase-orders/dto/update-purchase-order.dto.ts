import { PartialType } from '@nestjs/mapped-types';
import { CreatePurchaseOrderDto } from './create-purchase-order.dto';
import { IsArray, IsOptional } from 'class-validator';
import { CreatePurchaseOrderItemDto } from './create-purchase-order-item.dto';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePurchaseOrderDto extends PartialType(
  CreatePurchaseOrderDto,
) {
  @ApiPropertyOptional({
    description: '完整的明细列表，传入时会替换旧明细',
    type: () => CreatePurchaseOrderItemDto,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @Type(() => CreatePurchaseOrderItemDto)
  items?: CreatePurchaseOrderItemDto[];
}
