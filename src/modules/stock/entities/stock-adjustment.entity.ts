import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';
import { User } from '../../users/entities/user.entity';
import { Stock } from './stock.entity';

export enum StockAdjustmentType {
  MANUAL = 'manual_audit',
  PURCHASE = 'purchase',
  USAGE = 'usage',
  CORRECTION = 'correction',
}

@Entity({ name: 'stock_adjustments' })
export class StockAdjustment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Stock, { nullable: false, onDelete: 'CASCADE' })
  stock!: Stock;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdBy!: User | null;

  @Column({ type: 'varchar', length: 32 })
  type!: StockAdjustmentType;

  @Column({
    name: 'quantity_before',
    type: 'numeric',
    precision: 18,
    scale: 2,
    transformer: numericTransformer,
  })
  quantityBefore!: number;

  @Column({
    name: 'quantity_after',
    type: 'numeric',
    precision: 18,
    scale: 2,
    transformer: numericTransformer,
  })
  quantityAfter!: number;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 2,
    transformer: numericTransformer,
  })
  delta!: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  reason!: string | null;

  @Column({ type: 'text', nullable: true })
  remarks!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
