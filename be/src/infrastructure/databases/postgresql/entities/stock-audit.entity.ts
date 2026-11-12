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

import { StockAuditItemEntity } from '@domain/entities/stock-audit.entity'

import { User } from './user.entity'

@Entity('stock_audits')
@Index('IDX_stock_audits_audited_by_id', ['auditedById'])
export class StockAudit {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    primaryKeyConstraintName: 'PK_stock_audits_id',
  })
  public readonly id!: number

  @Column({ type: 'varchar', length: 50, name: 'audit_code', unique: true })
  public auditCode!: string

  @Column({ type: 'varchar', length: 255, default: 'Phiếu kiểm kê kho' })
  public title!: string

  @Column({ type: 'varchar', length: 50, name: 'audit_date' })
  public auditDate!: string

  @Column({ type: 'varchar', length: 20, default: 'DRAFT' })
  public status!: 'DRAFT' | 'BALANCED'

  @Column({ type: 'jsonb', default: [] })
  public items!: StockAuditItemEntity[]

  @Column({ type: 'int', name: 'total_system_stock', default: 0 })
  public totalSystemStock!: number

  @Column({ type: 'int', name: 'total_actual_stock', default: 0 })
  public totalActualStock!: number

  @Column({ type: 'int', name: 'total_diff', default: 0 })
  public totalDiff!: number

  @Column({ type: 'text', nullable: true })
  public note?: string

  @Column({
    type: 'varchar',
    length: 100,
    name: 'audited_by',
    default: 'Admin',
  })
  public auditedBy!: string

  @Column({ type: 'bigint', nullable: true, name: 'audited_by_id' })
  public auditedById?: number

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'audited_by_id' })
  public auditor?: User

  @Column({ type: 'timestamp', name: 'balanced_at', nullable: true })
  public balancedAt?: Date

  @CreateDateColumn({ name: 'created_at' })
  public readonly createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  public readonly updatedAt!: Date
}
