import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { PurchaseOrder } from './purchase-order.entity';
import { numericTransformer } from '../../common/transformers/numeric.transformer';

@Entity({ name: 'purchase_order_items' })
export class PurchaseOrderItem {
  @ApiProperty({
    description: '明细主键 ID',
    example: '8b3b4e02-19df-4d28-9851-dc8072337b4f',
  })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({
    description: '所属采购订单',
    type: () => PurchaseOrder,
  })
  @ManyToOne(() => PurchaseOrder, (order) => order.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder!: PurchaseOrder;

  @ApiProperty({
    description: '关联的采购订单 ID',
    example: '6ef1bf49-89c5-4f1c-8c00-211b69bb2a15',
  })
  @Column({ name: 'purchase_order_id', type: 'uuid' })
  purchaseOrderId!: string;

  @ApiProperty({ description: '明细行号', example: 1 })
  @Column({ name: 'line_no', type: 'int' })
  lineNo!: number;

  @ApiProperty({ description: '物料编码', example: 'MAT-001' })
  @Column({ name: 'sku_code', type: 'varchar', length: 64 })
  skuCode!: string;

  @ApiProperty({ description: '物料名称', example: '高速螺丝' })
  @Column({ name: 'sku_name', type: 'varchar', length: 255 })
  skuName!: string;

  @ApiProperty({
    description: '规格型号',
    example: 'M4*16',
    nullable: true,
  })
  @Column({
    name: 'specification',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  specification!: string | null;

  @ApiProperty({
    description: '计量单位',
    example: 'PCS',
    nullable: true,
  })
  @Column({ name: 'uom', type: 'varchar', length: 32, nullable: true })
  uom!: string | null;

  @ApiProperty({ description: '采购数量', example: 100 })
  @Column({
    name: 'quantity',
    type: 'numeric',
    precision: 18,
    scale: 2,
    transformer: numericTransformer,
  })
  quantity!: number;

  @ApiProperty({ description: '未税单价', example: 2.35 })
  @Column({
    name: 'unit_price',
    type: 'numeric',
    precision: 18,
    scale: 6,
    transformer: numericTransformer,
  })
  unitPrice!: number;

  @ApiProperty({ description: '适用税率（%）', example: 13 })
  @Column({
    name: 'tax_rate',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 13.0,
    transformer: numericTransformer,
  })
  taxRate!: number;

  @ApiProperty({ description: '未税金额', example: 235 })
  @Column({
    name: 'amount_excl_tax',
    type: 'numeric',
    precision: 18,
    scale: 2,
    transformer: numericTransformer,
  })
  amountExclTax!: number;

  @ApiProperty({ description: '税额', example: 30.55 })
  @Column({
    name: 'tax_amount',
    type: 'numeric',
    precision: 18,
    scale: 2,
    transformer: numericTransformer,
  })
  taxAmount!: number;

  @ApiProperty({ description: '含税金额', example: 265.55 })
  @Column({
    name: 'amount_incl_tax',
    type: 'numeric',
    precision: 18,
    scale: 2,
    transformer: numericTransformer,
  })
  amountInclTax!: number;

  @ApiProperty({
    description: '预计到货日期',
    example: '2025-01-18',
    nullable: true,
  })
  @Column({ name: 'delivery_date', type: 'date', nullable: true })
  deliveryDate!: string | null;

  @ApiProperty({
    description: '明细备注',
    example: '需附合格证',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  remarks!: string | null;

  @ApiProperty({ description: '创建时间', example: '2025-01-10T02:15:30.123Z' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty({ description: '更新时间', example: '2025-01-10T03:10:11.456Z' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
