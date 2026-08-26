import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'

import { Appointment } from './appointment.entity'
import { Promotion } from './promotion.entity'
import { User } from './user.entity'

@Entity('promotion_usage')
export class PromotionUsage {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    primaryKeyConstraintName: 'PK_promotion_usage_id',
  })
  public readonly id!: number

  @Column({ type: 'int', name: 'promotion_id' })
  public promotionId!: number

  @Column({ type: 'int', name: 'appointment_id' })
  public appointmentId!: number

  @Column({ type: 'int', name: 'client_id' })
  public clientId!: number

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'discount_amount' })
  public discountAmount!: number

  @CreateDateColumn({ name: 'used_at' })
  public usedAt!: Date

  // Relations
  @ManyToOne(() => Promotion, (promotion) => promotion.usages)
  @JoinColumn({ name: 'promotion_id' })
  public promotion!: Promotion

  @ManyToOne(() => Appointment, (appointment) => appointment.promotionUsages)
  @JoinColumn({ name: 'appointment_id' })
  public appointment!: Appointment

  @ManyToOne(() => User, (user) => user.promotionUsages)
  @JoinColumn({ name: 'client_id' })
  public client!: User
}
