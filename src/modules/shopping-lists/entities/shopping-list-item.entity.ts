import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Item } from '../../items/entities/item.entity';
import { ShoppingList } from './shopping-list.entity';

@Entity({ name: 'shopping_list_items' })
export class ShoppingListItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => ShoppingList, (list) => list.items, { onDelete: 'CASCADE' })
  shoppingList!: ShoppingList;

  @ManyToOne(() => Item, { eager: true, onDelete: 'CASCADE' })
  item!: Item;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 1 })
  quantity!: number;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status!: 'pending' | 'purchased';

  @Column({ type: 'text', nullable: true })
  remarks!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
