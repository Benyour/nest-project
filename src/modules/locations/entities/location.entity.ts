import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'locations' })
export class Location {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Location, (location) => location.children, {
    onDelete: 'SET NULL',
  })
  parent!: Location | null;

  @OneToMany(() => Location, (location) => location.parent)
  children!: Location[];

  @Column({ type: 'varchar', length: 64 })
  name!: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  description!: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
