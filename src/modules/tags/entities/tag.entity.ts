import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Item } from '../../items/entities/item.entity';

@Entity({ name: 'tags' })
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  @Index('uq_tags_name', { unique: true })
  name!: string;

  @ManyToMany(() => Item, (item) => item.tags)
  items!: Item[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
