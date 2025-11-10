import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePurchaseOrderItemDto {
  @ApiPropertyOptional({
    description: '明细行号，不传默认按顺序生成',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  lineNo?: number;

  @ApiProperty({
    description: '物料编码',
    maxLength: 64,
    example: 'MAT-001',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  skuCode!: string;

  @ApiProperty({
    description: '物料名称',
    maxLength: 255,
    example: '高速螺丝',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  skuName!: string;

  @ApiPropertyOptional({
    description: '规格型号',
    maxLength: 255,
    example: 'M4*16',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  specification?: string;

  @ApiPropertyOptional({
    description: '计量单位',
    maxLength: 32,
    example: 'PCS',
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  uom?: string;

  @ApiProperty({
    description: '采购数量',
    example: 100,
    minimum: 0,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  quantity!: number;

  @ApiProperty({
    description: '未税单价',
    example: 2.35,
    minimum: 0,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  unitPrice!: number;

  @ApiPropertyOptional({ description: '明细税率（%）', example: 13 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  taxRate?: number;

  @ApiPropertyOptional({
    description: '未税金额，默认会按数量 * 单价计算',
    example: 235,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  amountExclTax?: number;

  @ApiPropertyOptional({
    description: '税额，默认按未税金额 * 税率计算',
    example: 30.55,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  taxAmount?: number;

  @ApiPropertyOptional({
    description: '含税金额，默认按未税金额 + 税额计算',
    example: 265.55,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  amountInclTax?: number;

  @ApiPropertyOptional({
    description: '预计到货日期',
    example: '2025-01-18',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @ApiPropertyOptional({ description: '明细备注', example: '需附合格证' })
  @IsOptional()
  @IsString()
  remarks?: string;
}
