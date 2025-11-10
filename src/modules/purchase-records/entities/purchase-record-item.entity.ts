import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';
import { Item } from '../../items/entities/item.entity';
import { Location } from '../../locations/entities/location.entity';
import { PurchaseRecord } from './purchase-record.entity';

@Entity({ name: 'purchase_record_items' })
export class PurchaseRecordItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => PurchaseRecord, (record) => record.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  record!: PurchaseRecord;

  @ManyToOne(() => Item, { nullable: false, onDelete: 'RESTRICT' })
  item!: Item;

  @ManyToOne(() => Location, { nullable: false, onDelete: 'RESTRICT' })
  location!: Location;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 2,
    transformer: numericTransformer,
  })
  quantity!: number;

  @Column({
    name: 'unit_price',
    type: 'numeric',
    precision: 18,
    scale: 2,
    transformer: numericTransformer,
    nullable: true,
  })
  unitPrice!: number | null;

  @Column({
    name: 'total_price',
    type: 'numeric',
    precision: 18,
    scale: 2,
    transformer: numericTransformer,
    nullable: true,
  })
  totalPrice!: number | null;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate!: string | null;

  @Column({ type: 'text', nullable: true })
  remarks!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
