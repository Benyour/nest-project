import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePurchaseOrderItemDto } from './create-purchase-order-item.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePurchaseOrderDto {
  @ApiProperty({
    description: '采购订单编号',
    maxLength: 32,
    example: 'PO-2025-0001',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  orderCode!: string;

  @ApiProperty({
    description: '供应商名称',
    maxLength: 255,
    example: '上海智采供应链',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  supplierName!: string;

  @ApiPropertyOptional({
    description: '供应商联系人',
    maxLength: 64,
    example: '王明',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  supplierContact?: string;

  @ApiPropertyOptional({
    description: '供应商联系电话',
    maxLength: 32,
    example: '13800001111',
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  supplierPhone?: string;

  @ApiProperty({
    description: '下单日期',
    example: '2025-01-10',
    format: 'date',
  })
  @IsDateString()
  orderDate!: string;

  @ApiPropertyOptional({
    description: '预计到货日期',
    example: '2025-01-20',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  expectedArrivalDate?: string;

  @ApiPropertyOptional({
    description: '币种',
    maxLength: 8,
    example: 'CNY',
    default: 'CNY',
  })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @ApiPropertyOptional({ description: '订单税率（%）', example: 13 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  taxRate?: number;

  @ApiPropertyOptional({
    description: '订单状态',
    maxLength: 32,
    example: 'draft',
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  status?: string;

  @ApiPropertyOptional({
    description: '订单备注',
    example: '紧急采购，请优先处理',
  })
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiProperty({
    description: '采购订单明细列表',
    type: () => CreatePurchaseOrderItemDto,
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => CreatePurchaseOrderItemDto)
  items!: CreatePurchaseOrderItemDto[];
}
