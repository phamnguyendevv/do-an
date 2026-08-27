import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { OrderStatusEnum, PaymentStatusEnum } from '@domain/entities/order-enums.entity'

export interface BookstoreOrderItem {
  bookId: number | string
  title: string
  quantity: number
  price: number
}

@Entity('bookstore_orders')
@Index('IDX_bookstore_orders_order_code', ['orderCode'])
@Index('IDX_bookstore_orders_status', ['status'])
@Index('IDX_bookstore_orders_payment', ['payment'])
@Index('IDX_bookstore_orders_status_payment', ['status', 'payment'])
@Index('IDX_bookstore_orders_created_at', ['createdAt'])
export class BookstoreOrder {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    primaryKeyConstraintName: 'PK_bookstore_orders_id',
  })
  public readonly id!: number

  @Column({ type: 'varchar', length: 50, name: 'order_code', unique: true })
  public orderCode!: string

  @Column({ type: 'varchar', length: 255, name: 'customer_name' })
  public customerName!: string

  @Column({ type: 'varchar', length: 50, name: 'customer_phone' })
  public customerPhone!: string

  @Column({ type: 'text', name: 'customer_address' })
  public customerAddress!: string

  @Column({ type: 'int', name: 'province_id', nullable: true })
  public provinceId?: number

  @Column({ type: 'int', name: 'district_id', nullable: true })
  public districtId?: number

  @Column({ type: 'varchar', length: 50, name: 'ward_code', nullable: true })
  public wardCode?: string

  @Column({ type: 'jsonb', default: [] })
  public items!: BookstoreOrderItem[]

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  public subtotal!: number

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  public discount!: number

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'shipping_fee' })
  public shippingFee!: number

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  public total!: number

  @Column({ type: 'varchar', length: 50, default: PaymentStatusEnum.Unpaid })
  public payment!: PaymentStatusEnum | string

  @Column({ type: 'varchar', length: 100, name: 'shipping_method', default: 'Giao Hàng Nhanh (GHN)' })
  public shippingMethod!: string

  @Column({ type: 'varchar', length: 100, name: 'tracking_code', nullable: true })
  public trackingCode?: string

  @Column({ type: 'varchar', length: 50, default: OrderStatusEnum.Pending })
  public status!: OrderStatusEnum | string

  @Column({ type: 'text', nullable: true })
  public note?: string

  @CreateDateColumn({ name: 'created_at' })
  public readonly createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  public readonly updatedAt!: Date
}
