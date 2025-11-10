import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';
import { User } from '../../users/entities/user.entity';
import { PurchaseRecordItem } from './purchase-record-item.entity';

export enum PurchaseRecordStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

@Entity({ name: 'purchase_records' })
export class PurchaseRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 32, unique: true })
  code!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  createdBy!: User;

  @Column({ name: 'purchase_date', type: 'date' })
  purchaseDate!: string;

  @Column({ type: 'varchar', length: 16, default: PurchaseRecordStatus.DRAFT })
  status!: PurchaseRecordStatus;

  @Column({ name: 'store_name', type: 'varchar', length: 128, nullable: true })
  storeName!: string | null;

  @Column({ name: 'store_type', type: 'varchar', length: 16, nullable: true })
  storeType!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  remarks!: string | null;

  @Column({
    name: 'total_amount',
    type: 'numeric',
    precision: 18,
    scale: 2,
    transformer: numericTransformer,
    default: 0,
  })
  totalAmount!: number;

  @OneToMany(() => PurchaseRecordItem, (item) => item.record, {
    cascade: true,
  })
  items!: PurchaseRecordItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
