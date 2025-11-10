import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';
import { Item } from '../../items/entities/item.entity';
import { Location } from '../../locations/entities/location.entity';

@Entity({ name: 'stock' })
@Unique('uq_stock_item_location', ['item', 'location'])
export class Stock {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Item, { nullable: false, onDelete: 'RESTRICT' })
  @Index('idx_stock_item')
  item!: Item;

  @ManyToOne(() => Location, { nullable: false, onDelete: 'RESTRICT' })
  @Index('idx_stock_location')
  location!: Location;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  quantity!: number;

  @Column({
    name: 'min_quantity',
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  minQuantity!: number;

  @Column({
    name: 'latest_purchase_price',
    type: 'numeric',
    precision: 18,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  latestPurchasePrice!: number | null;

  @Column({ name: 'latest_purchase_date', type: 'date', nullable: true })
  latestPurchaseDate!: string | null;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate!: string | null;

  @Column({ type: 'text', nullable: true })
  memo!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
