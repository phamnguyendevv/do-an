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

import { AppointmentStatusEnum } from '@domain/entities/appointment.entity'

import { Order } from './order.entity'
import { PromotionUsage } from './promotion-usage.entity'
import { Service } from './service.entity'
import { User } from './user.entity'

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    primaryKeyConstraintName: 'PK_appointments_id',
  })
  public readonly id!: number

  @Column({ type: 'int', name: 'client_id' })
  public clientId!: number

  @Column({ type: 'int', name: 'provider_id' })
  public providerId!: number

  @Column({ type: 'int', name: 'service_id' })
  public serviceId!: number

  @Column({
    type: 'smallint',
    enum: AppointmentStatusEnum,
    default: AppointmentStatusEnum.Pending,
  })
  public status!: AppointmentStatusEnum

  @Column({ type: 'text', nullable: true })
  public notes!: string
  // === DATES ===
  @Column({ type: 'timestamp', name: 'start_time' })
  public startTime!: Date

  @Column({ type: 'timestamp', name: 'end_time' })
  public endTime!: Date

  @Column({ type: 'int' })
  public duration!: number

  @Column({ type: 'text', nullable: true, name: 'cancellation_reason' })
  public cancellationReason!: string

  @Column({ type: 'int', name: 'cancelled_by_user_id', nullable: true })
  public cancelledByUserId?: number

  @Column({ type: 'timestamp', nullable: true, name: 'cancelled_at' })
  public cancelledAt?: Date

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_amount' })
  public totalAmount!: number

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'final_amount',
    nullable: true,
  })
  public finalAmount!: number

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'commission_amount',
  })
  public commissionAmount!: number

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'provider_amount' })
  public providerAmount!: number

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'discount_amount',
    nullable: true,
  })
  public discountAmount!: number

  @Column({ type: 'timestamp', nullable: true, name: 'reminder_sent_at' })
  public reminderSentAt?: Date

  @Column({ type: 'boolean', default: true, name: 'send_reminders' })
  public sendReminders!: boolean

  @Column({ type: 'boolean', default: false, name: 'is_deleted' })
  public isDeleted!: boolean

  @CreateDateColumn({ name: 'created_at' })
  public readonly createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  public readonly updatedAt!: Date

  @ManyToOne(() => User, (user) => user.clientAppointments)
  @JoinColumn({ name: 'client_id' })
  public client!: User

  @ManyToOne(() => User, (user) => user.providerAppointments)
  @JoinColumn({ name: 'provider_id' })
  public provider!: User

  @ManyToOne(() => Service, (service) => service.appointments)
  @JoinColumn({ name: 'service_id' })
  public service!: Service

  @ManyToOne(() => User, (user) => user.cancelledAppointments)
  @JoinColumn({ name: 'cancelled_by_user_id' })
  public cancelledByUser?: User

  @OneToMany(() => PromotionUsage, (usage) => usage.appointment)
  public promotionUsages!: PromotionUsage[]

  @OneToMany(() => Order, (order) => order.appointment)
  public orders!: Order[]
}
