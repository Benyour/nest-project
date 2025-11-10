import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { UsageRecordItem } from './usage-record-item.entity';

export enum UsageRecordType {
  DAILY = 'daily',
  EXPIRED = 'expired',
  DAMAGED = 'damaged',
  GIFT = 'gift',
  OTHER = 'other',
}

export enum UsageRecordStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

@Entity({ name: 'usage_records' })
export class UsageRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'usage_date', type: 'date' })
  usageDate!: string;

  @Column({ type: 'varchar', length: 16, default: UsageRecordType.DAILY })
  type!: UsageRecordType;

  @Column({ type: 'varchar', length: 16, default: UsageRecordStatus.DRAFT })
  status!: UsageRecordStatus;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  createdBy!: User;

  @Column({ type: 'text', nullable: true })
  remarks!: string | null;

  @OneToMany(() => UsageRecordItem, (item) => item.record, {
    cascade: true,
  })
  items!: UsageRecordItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
