import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    primaryKeyConstraintName: 'PK_suppliers_id',
  })
  public readonly id!: number

  @Column({ type: 'varchar', length: 255 })
  name!: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  contactName?: string

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone?: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string

  @Column({ type: 'varchar', length: 500, nullable: true })
  address?: string

  @Column({ type: 'text', nullable: true })
  note?: string

  @Column({ type: 'boolean', default: false, name: 'is_deleted' })
  isDeleted!: boolean

  @CreateDateColumn({ name: 'created_at' })
  public readonly createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  public readonly updatedAt!: Date
}
