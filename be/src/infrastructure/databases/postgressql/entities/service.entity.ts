import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { Appointment } from './appointment.entity'
import { Category } from './category.entity'
import { FavoriteService } from './favorite-service.entity'
import { Review } from './review.entity'
import { User } from './user.entity'

@Entity('services')
export class Service {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    primaryKeyConstraintName: 'PK_services_id',
  })
  public readonly id!: number

  @Column({ type: 'int', name: 'provider_id' })
  providerId!: number

  @Column({ type: 'int', name: 'category_id' })
  categoryId!: number

  @Column({ type: 'varchar', length: 255 })
  name!: string

  @Column({ type: 'text', nullable: true })
  description!: string

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price!: number

  @Column({ type: 'int' })
  duration!: number

  @Column({ type: 'text', nullable: true, name: 'image_url' })
  imageUrl!: string

  @Column({ type: 'text', nullable: true, name: 'image_public_id' })
  imagePublicId!: string

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean

  @CreateDateColumn({ name: 'created_at' })
  public readonly createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  public readonly updatedAt!: Date
  @Column({ type: 'boolean', default: false, name: 'is_deleted' })
  public isDeleted!: boolean

  // Relations
  @ManyToOne(() => User, (user) => user.services)
  @JoinColumn({ name: 'provider_id' })
  public provider!: User

  @ManyToOne(() => Category, (category) => category.services)
  @JoinColumn({ name: 'category_id' })
  public category!: Category

  @OneToMany(() => Appointment, (appointment) => appointment.service)
  public appointments!: Appointment[]

  @OneToMany(() => Review, (review) => review.service)
  public reviews!: Review[]

  @OneToMany(() => FavoriteService, (favorite) => favorite.service)
  public favorites!: FavoriteService[]
}
