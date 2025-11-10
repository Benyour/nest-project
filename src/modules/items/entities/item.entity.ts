import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Category } from '../../categories/entities/category.entity';
import { Location } from '../../locations/entities/location.entity';

@Entity({ name: 'items' })
export class Item {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Category, { nullable: false, onDelete: 'RESTRICT' })
  category!: Category;

  @ManyToOne(() => Location, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  defaultLocation!: Location | null;

  @Column({ type: 'varchar', length: 128 })
  @Index('idx_items_name')
  name!: string;

  @Column({ type: 'varchar', length: 64, nullable: true, unique: true })
  code!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  brand!: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  specification!: string | null;

  @Column({ type: 'varchar', length: 16 })
  unit!: string;

  @Column({ type: 'int', name: 'shelf_life_days', nullable: true })
  shelfLifeDays!: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  imageUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  remarks!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
