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

import { ImportReceiptItem } from '@domain/entities/import-receipt.entity'

import { Supplier } from './supplier.entity'
import { User } from './user.entity'

@Entity('import_receipts')
@Index('IDX_import_receipts_created_by_id', ['createdById'])
export class ImportReceipt {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    primaryKeyConstraintName: 'PK_import_receipts_id',
  })
  public readonly id!: number

  @Column({ type: 'varchar', length: 50, name: 'receipt_code', unique: true })
  public receiptCode!: string

  @Column({ type: 'bigint', name: 'supplier_id', nullable: true })
  public supplierId?: number

  @ManyToOne(() => Supplier, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'supplier_id' })
  public supplier?: Supplier

  @Column({ type: 'varchar', length: 255, name: 'supplier_name' })
  public supplierName!: string

  @Column({
    type: 'timestamp',
    name: 'import_date',
    default: () => 'CURRENT_TIMESTAMP',
  })
  public importDate!: Date

  @Column({ type: 'int', name: 'total_items', default: 0 })
  public totalItems!: number

  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
    name: 'total_value',
  })
  public totalValue!: number

  @Column({ type: 'text', nullable: true })
  public note?: string

  @Column({ type: 'jsonb', default: [] })
  public items!: ImportReceiptItem[]

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
