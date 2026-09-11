import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'

import { OrderHistoryAction } from '@domain/entities/order-history.entity'

import { BookstoreOrder } from './bookstore-order.entity'

@Entity('order_histories')
@Index('IDX_order_histories_order_id', ['orderId'])
@Index('IDX_order_histories_order_code', ['orderCode'])
@Index('IDX_order_histories_action', ['action'])
@Index('IDX_order_histories_created_at', ['createdAt'])
export class OrderHistory {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    primaryKeyConstraintName: 'PK_order_histories_id',
  })
  public readonly id!: number

  @Column({ type: 'bigint', name: 'order_id' })
  public orderId!: number

  @ManyToOne(() => BookstoreOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  public order?: BookstoreOrder

  @Column({ type: 'varchar', length: 50, name: 'order_code' })
  public orderCode!: string

  @Column({ type: 'varchar', length: 50 })
  public action!: OrderHistoryAction | string

  @Column({ type: 'varchar', length: 50, name: 'from_status', nullable: true })
  public fromStatus?: string

  @Column({ type: 'varchar', length: 50, name: 'to_status', nullable: true })
  public toStatus?: string

  @Column({ type: 'varchar', length: 50, name: 'from_payment', nullable: true })
  public fromPayment?: string

  @Column({ type: 'varchar', length: 50, name: 'to_payment', nullable: true })
  public toPayment?: string

  @Column({ type: 'varchar', length: 255 })
  public title!: string

  @Column({ type: 'text', nullable: true })
  public note?: string

  @Column({ type: 'varchar', length: 255, default: 'System' })
  public actor!: string

  @Column({ type: 'varchar', length: 50, name: 'actor_role', nullable: true })
  public actorRole?: string

  @Column({ type: 'jsonb', nullable: true })
  public metadata?: Record<string, any>

  @CreateDateColumn({ name: 'created_at' })
  public readonly createdAt!: Date
}
