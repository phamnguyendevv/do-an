import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { ExportReceiptItem } from '@domain/entities/export-receipt.entity'

@Entity('export_receipts')
export class ExportReceipt {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    primaryKeyConstraintName: 'PK_export_receipts_id',
  })
  public readonly id!: number

  @Column({ type: 'varchar', length: 50, name: 'receipt_code', unique: true })
  public receiptCode!: string

  @Column({ type: 'varchar', length: 100, name: 'order_id', nullable: true })
  public orderId?: string

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

  @CreateDateColumn({ name: 'created_at' })
  public readonly createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  public readonly updatedAt!: Date
}
