import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('books')
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

  @Column({ type: 'varchar', length: 255 })
  category!: string

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  purchasePrice!: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  sellingPrice!: number

  @Column({ type: 'int', default: 0 })
  stock!: number

  @Column({ type: 'int', default: 0 })
  minStock!: number

  @Column({ type: 'varchar', length: 50, default: 'IN_STOCK' })
  status!: string

  @CreateDateColumn({ name: 'created_at' })
  public readonly createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  public readonly updatedAt!: Date
}
