import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import {
  PaymentMethodEnum,
  PaymentStatusEnum,
} from '@domain/entities/payment.entity'

import { Order } from './order.entity'

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    primaryKeyConstraintName: 'PK_payments_id',
  })
  public readonly id!: number

  @Column({ type: 'int', name: 'order_id' })
  public orderId!: number

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  public amount!: number

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  public currency!: string

  @Column({
    type: 'smallint',
    enum: PaymentStatusEnum,
    default: PaymentStatusEnum.Pending,
  })
  public status!: PaymentStatusEnum

  @Column({
    type: 'smallint',
    enum: PaymentMethodEnum,
    default: PaymentMethodEnum.Stripe,
    name: 'payment_method',
  })
  public paymentMethod!: PaymentMethodEnum

  @Column({ type: 'timestamp', nullable: true, name: 'payment_date' })
  public paymentDate!: Date

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'refund_amount',
  })
  public refundAmount!: number

  @Column({ type: 'timestamp', nullable: true, name: 'refund_date' })
  public refundDate!: Date

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'invoice_id' })
  public invoiceId!: string

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'stripe_invoice_id',
  })
  public stripeInvoiceId!: string

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'stripe_customer_id',
  })
  public stripeCustomerId!: string

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'customer_email',
  })
  public customerEmail!: string


  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'session_id',
  })
  public sessionId!: string

  @CreateDateColumn({ name: 'created_at' })
  public readonly createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  public readonly updatedAt!: Date

  // Relations

  @ManyToOne(() => Order, (order) => order.payments)
  @JoinColumn({ name: 'order_id' })
  public order!: Order
}
