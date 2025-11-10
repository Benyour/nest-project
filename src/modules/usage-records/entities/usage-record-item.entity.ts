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
import { UsageRecord } from './usage-record.entity';

@Entity({ name: 'usage_record_items' })
export class UsageRecordItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => UsageRecord, (record) => record.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  record!: UsageRecord;

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

  @Column({ type: 'text', nullable: true })
  remarks!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
