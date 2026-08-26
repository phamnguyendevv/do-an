import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { Service } from './service.entity'

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    primaryKeyConstraintName: 'PK_categories_id',
  })
  public readonly id!: number

  @Column({ type: 'varchar', length: 255 })
  name!: string

  @Column({ type: 'text', nullable: true })
  description!: string

  @CreateDateColumn({ name: 'created_at' })
  public readonly createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  public readonly updatedAt!: Date


  @Column({ type: 'boolean', default: false })
  isDeleted!: boolean

  // Relations
  @OneToMany(() => Service, (service) => service.category)
  public services!: Service[]
}
