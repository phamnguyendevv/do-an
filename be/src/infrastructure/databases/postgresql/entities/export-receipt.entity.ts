import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { ExportReceiptItem } from '@domain/entities/export-receipt.entity'

import { BookstoreOrder } from './bookstore-order.entity'
import { User } from './user.entity'

@Entity('export_receipts')
@Index('IDX_export_receipts_order_id', ['orderId'])
@Index('IDX_export_receipts_created_by_id', ['createdById'])
export class ExportReceipt {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    primaryKeyConstraintName: 'PK_export_receipts_id',
  })
  public readonly id!: number

  @Column({ type: 'varchar', length: 50, name: 'receipt_code', unique: true })
  public receiptCode!: string

  /**
   * ID đơn hàng liên kết (FK tới bookstore_orders.id).
   */
  @Column({ type: 'bigint', nullable: true, name: 'order_id' })
  public orderId?: number

  @ManyToOne(() => BookstoreOrder, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'order_id' })
  public order?: BookstoreOrder

  @Column({ type: 'varchar', length: 255 })
  public reason!: string

  @Column({
    type: 'timestamp',
    name: 'export_date',
    default: () => 'CURRENT_TIMESTAMP',
  })
  public exportDate!: Date

  @Column({ type: 'int', name: 'total_items', default: 0 })
  public totalItems!: number

  @Column({ type: 'text', nullable: true })
  public note?: string

  @Column({ type: 'jsonb', default: [] })
  public items!: ExportReceiptItem[]

  @Column({ type: 'varchar', length: 255, name: 'created_by', nullable: true })
  public createdBy?: string

  @Column({ type: 'bigint', nullable: true, name: 'created_by_id' })
  public createdById?: number

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  public creator?: User

  @CreateDateColumn({ name: 'created_at' })
  public readonly createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  public readonly updatedAt!: Date
}
