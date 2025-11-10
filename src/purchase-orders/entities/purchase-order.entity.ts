import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { PurchaseOrderItem } from './purchase-order-item.entity';
import { numericTransformer } from '../../common/transformers/numeric.transformer';

@Entity({ name: 'purchase_orders' })
export class PurchaseOrder {
  @ApiProperty({
    description: '主键 ID',
    example: '6ef1bf49-89c5-4f1c-8c00-211b69bb2a15',
  })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: '采购订单编号', example: 'PO-2025-0001' })
  @Column({ name: 'order_code', type: 'varchar', length: 32, unique: true })
  orderCode!: string;

  @ApiProperty({ description: '供应商名称', example: '上海智采供应链' })
  @Column({ name: 'supplier_name', type: 'varchar', length: 255 })
  supplierName!: string;

  @ApiProperty({
    description: '供应商联系人',
    example: '王明',
    nullable: true,
  })
  @Column({
    name: 'supplier_contact',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  supplierContact!: string | null;

  @ApiProperty({
    description: '供应商联系电话',
    example: '13800001111',
    nullable: true,
  })
  @Column({
    name: 'supplier_phone',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  supplierPhone!: string | null;

  @ApiProperty({ description: '下单日期', example: '2025-01-10' })
  @Column({ name: 'order_date', type: 'date' })
  orderDate!: string;

  @ApiProperty({
    description: '预计到货日期',
    example: '2025-01-20',
    nullable: true,
  })
  @Column({ name: 'expected_arrival_date', type: 'date', nullable: true })
  expectedArrivalDate!: string | null;

  @ApiProperty({ description: '币种', example: 'CNY', default: 'CNY' })
  @Column({ type: 'varchar', length: 8, default: 'CNY' })
  currency!: string;

  @ApiProperty({ description: '订单适用税率（%）', example: 13 })
  @Column({
    name: 'tax_rate',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 13.0,
    transformer: numericTransformer,
  })
  taxRate!: number;

  @ApiProperty({ description: '未税金额合计', example: 1234.56 })
  @Column({
    name: 'subtotal_amount',
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  subtotalAmount!: number;

  @ApiProperty({ description: '税额合计', example: 160.49 })
  @Column({
    name: 'tax_amount',
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  taxAmount!: number;

  @ApiProperty({ description: '含税金额合计', example: 1395.05 })
  @Column({
    name: 'total_amount',
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  totalAmount!: number;

  @ApiProperty({ description: '订单状态', example: 'draft', default: 'draft' })
  @Column({ type: 'varchar', length: 32, default: 'draft' })
  status!: string;

  @ApiProperty({
    description: '订单备注',
    example: '紧急采购，请优先处理',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  remarks!: string | null;

  @ApiProperty({
    description: '采购订单明细列表',
    type: () => PurchaseOrderItem,
    isArray: true,
  })
  @OneToMany(() => PurchaseOrderItem, (item) => item.purchaseOrder, {
    cascade: true,
  })
  items!: PurchaseOrderItem[];

  @ApiProperty({ description: '创建时间', example: '2025-01-10T02:15:30.123Z' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty({ description: '更新时间', example: '2025-01-10T03:10:11.456Z' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
