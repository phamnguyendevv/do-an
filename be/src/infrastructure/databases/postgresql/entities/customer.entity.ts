import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('customers')
@Index('IDX_customers_phone', ['phone'], { unique: true })
export class Customer {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    primaryKeyConstraintName: 'PK_customers_id',
  })
  public readonly id!: number

  @Column({ type: 'varchar', length: 255 })
  public name!: string

  @Column({ type: 'varchar', length: 50 })
  public phone!: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  public email?: string

  @Column({ type: 'text', nullable: true })
  public address?: string

  @Column({ type: 'text', nullable: true })
  public note?: string

  @Column({ type: 'int', default: 0, name: 'total_orders' })
  public totalOrders!: number

  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
    name: 'total_spent',
  })
  public totalSpent!: number

  @Column({ type: 'timestamp', nullable: true, name: 'last_order_at' })
  public lastOrderAt?: Date

  @CreateDateColumn({ name: 'created_at' })
  public readonly createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  public readonly updatedAt!: Date
}
