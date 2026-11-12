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

import { BookStatusEnum } from '@domain/entities/order-enums.entity'

import { Category } from './category.entity'

@Entity('books')
@Index('IDX_books_status', ['status'])
@Index('IDX_books_category', ['category'])
export class Book {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    primaryKeyConstraintName: 'PK_books_id',
  })
  public readonly id!: number

  @Column({ type: 'varchar', length: 255, nullable: true })
  isbn?: string

  @Column({ type: 'varchar', length: 255 })
  title!: string

  @Column({ type: 'varchar', length: 255 })
  author!: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  publisher?: string

  /**
   * Tên thể loại (string) — giữ nguyên để backward compatibility.
   * Dùng categoryId (FK) để JOIN với bảng categories.
   */
  @Column({ type: 'varchar', length: 255 })
  category!: string

  /**
   * FK tới categories(id) — được thêm bởi migration CleanupAndRefactorSchema.
   * Constraint: FK_books_category_id ON DELETE SET NULL.
   */
  @Column({ type: 'bigint', nullable: true, name: 'category_id' })
  categoryId?: number

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  categoryRelation?: Category

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  purchasePrice!: number

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  sellingPrice!: number

  @Column({ type: 'int', default: 0 })
  stock!: number

  @Column({ type: 'int', default: 0 })
  minStock!: number

  @Column({
    type: 'varchar',
    length: 50,
    default: BookStatusEnum.InStock,
  })
  public status!: BookStatusEnum | string

  @CreateDateColumn({ name: 'created_at' })
  public readonly createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  public readonly updatedAt!: Date
}
