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

import { OrderStatusEnum } from '@domain/entities/order.entity'

import { Appointment } from './appointment.entity'
import { Payment } from './payment.entity'
import { User } from './user.entity'

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    primaryKeyConstraintName: 'PK_orders_id',
  })
  public readonly id!: number

  @Column({ type: 'int', name: 'user_id' })
  public userId!: number

  @Column({ type: 'int', name: 'appointment_id' })
  public appointmentId!: number

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_amount' })
  public totalAmount!: number

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  public currency!: string

  @Column({
    type: 'smallint',
    enum: OrderStatusEnum,
    default: OrderStatusEnum.Pending,
  })
  public status!: OrderStatusEnum

  @Column({ type: 'text', nullable: true })
  public note?: string

  @CreateDateColumn({ name: 'created_at' })
  public readonly createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  public readonly updatedAt!: Date

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  public user!: User

  @ManyToOne(() => Appointment)
  @JoinColumn({ name: 'appointment_id' })
  public appointment!: Appointment

  @OneToMany(() => Payment, (payment) => payment.order)
  public payments!: Payment[]
}
