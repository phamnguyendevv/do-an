import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { PromotionUsage } from './promotion-usage.entity'
import { User } from './user.entity'

@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    primaryKeyConstraintName: 'PK_promotions_id',
  })
  public readonly id!: number

  @Column({ type: 'int', name: 'provider_id' })
  public providerId!: number

  @Column({ type: 'varchar', length: 50 })
  public code!: string

  @Column({ type: 'varchar', length: 255 })
  public name!: string

  @Column({ type: 'text', nullable: true })
  public description!: string

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'discount_value' })
  public discountValue!: number

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'max_discount',
  })
  public maxDiscount!: number

  @Column({ type: 'int', default: 1, name: 'usage_limit' })
  public usageLimit!: number

  @Column({ type: 'int', default: 0, name: 'used_count' })
  public usedCount!: number

  @Column({ type: 'date', name: 'start_date' })
  public startDate!: Date

  @Column({ type: 'date', name: 'end_date' })
  public endDate!: Date

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  public isActive!: boolean

  @CreateDateColumn({ name: 'created_at' })
  public readonly createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  public readonly updatedAt!: Date

  @Column({ type: 'boolean', default: false, name: 'is_deleted' })
  public isDeleted!: boolean

  // Relations
  @ManyToOne(() => User, (user) => user.promotions)
  @JoinColumn({ name: 'provider_id' })
  public provider!: User

  @OneToMany(() => PromotionUsage, (usage) => usage.promotion)
  public usages!: PromotionUsage[]
}
