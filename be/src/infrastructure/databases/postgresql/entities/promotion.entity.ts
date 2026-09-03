import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('promotions')
@Index('IDX_promotions_code', ['code'], { unique: true })
export class Promotion {
  @PrimaryGeneratedColumn({ type: 'bigint', primaryKeyConstraintName: 'PK_promotions_id' })
  public readonly id!: number

  @Column({ type: 'varchar', length: 50 })
  public code!: string

  @Column({ type: 'varchar', length: 255 })
  public name!: string

  @Column({ type: 'varchar', length: 20, name: 'discount_type' })
  public discountType!: 'PERCENTAGE' | 'FIXED'

  @Column({ type: 'decimal', precision: 14, scale: 2, name: 'discount_value' })
  public discountValue!: number

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0, name: 'min_order_value' })
  public minOrderValue!: number

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true, name: 'max_discount' })
  public maxDiscount?: number

  @Column({ type: 'int', nullable: true, name: 'usage_limit' })
  public usageLimit?: number

  @Column({ type: 'int', default: 0, name: 'used_count' })
  public usedCount!: number

  @Column({ type: 'timestamp', name: 'starts_at' })
  public startsAt!: Date

  @Column({ type: 'timestamp', name: 'ends_at' })
  public endsAt!: Date

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  public isActive!: boolean

  @Column({ type: 'text', nullable: true })
  public note?: string

  @CreateDateColumn({ name: 'created_at' })
  public readonly createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  public readonly updatedAt!: Date
}
