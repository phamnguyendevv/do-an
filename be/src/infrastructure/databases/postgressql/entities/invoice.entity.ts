import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { Appointment } from './appointment.entity'
import { Order } from './order.entity'
import { Payment } from './payment.entity'
import { User } from './user.entity'

export enum InvoiceStatusEnum {
  Draft = 1,
  Sent = 2,
  Paid = 3,
  Overdue = 4,
  Cancelled = 5,
  Refunded = 6,
}

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ unique: true })
  invoiceNumber!: string

  @Column()
  appointmentId!: number

  @Column()
  orderId!: number

  @Column()
  providerId!: number

  @Column()
  clientId!: number

  @Column({ type: 'timestamp' })
  issueDate!: Date

  @Column({ type: 'timestamp' })
  dueDate!: Date

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal!: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount!: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxAmount!: number

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount!: number

  @Column({ default: 'usd' })
  currency!: string

  @Column({
    type: 'enum',
    enum: InvoiceStatusEnum,
    default: InvoiceStatusEnum.Draft,
  })
  status!: InvoiceStatusEnum

  @Column({ type: 'text', nullable: true })
  notes?: string

  @Column({ nullable: true })
  paymentTerms?: string

  @Column({ default: false })
  isDeleted!: boolean

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  // Relations
  @OneToOne(() => Appointment, { eager: true })
  @JoinColumn({ name: 'appointmentId' })
  appointment?: Appointment

  @OneToOne(() => Order, { eager: true })
  @JoinColumn({ name: 'orderId' })
  order?: Order

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'providerId' })
  provider?: User

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'clientId' })
  client?: User

  @OneToMany(() => Payment, (payment) => payment.invoiceId)
  payments?: Payment[]
}
