import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm'

import { StockMovementType } from '@domain/entities/stock-movement.entity'

@Entity('stock_movements')
@Index('IDX_stock_movements_book_id', ['bookId'])
@Index('IDX_stock_movements_created_at', ['createdAt'])
export class StockMovement {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    primaryKeyConstraintName: 'PK_stock_movements_id',
  })
  public readonly id!: number

  @Column({ type: 'bigint', name: 'book_id' })
  public bookId!: number

  @Column({ type: 'varchar', length: 255, name: 'book_title' })
  public bookTitle!: string

  @Column({ type: 'varchar', length: 50 })
  public type!: StockMovementType

  @Column({ type: 'int' })
  public quantity!: number

  @Column({ type: 'int', name: 'before_stock', default: 0 })
  public beforeStock!: number

  @Column({ type: 'int', name: 'after_stock', default: 0 })
  public afterStock!: number

  @Column({
    type: 'varchar',
    length: 100,
    name: 'reference_code',
    nullable: true,
  })
  public referenceCode?: string

  @Column({ type: 'text', nullable: true })
  public note?: string

  @Column({ type: 'varchar', length: 255, name: 'created_by', nullable: true })
  public createdBy?: string

  @CreateDateColumn({ name: 'created_at' })
  public readonly createdAt!: Date
}
