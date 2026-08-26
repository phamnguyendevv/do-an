import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { Appointment } from './appointment.entity'
import { Service } from './service.entity'
import { User } from './user.entity'

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    primaryKeyConstraintName: 'PK_reviews_id',
  })
  public readonly id!: number

  @Column({ type: 'int', name: 'client_id' })
  public clientId!: number

  @Column({ type: 'int', name: 'provider_id' })
  public providerId!: number

  @Column({ type: 'int', name: 'service_id' })
  public serviceId!: number

  @Column({ type: 'int' })
  public rating!: number

  @Column({ type: 'text', nullable: true })
  public comment!: string

  @Column({ type: 'boolean', default: false, name: 'is_deleted' })
  public isDeleted!: boolean

  @CreateDateColumn({ name: 'created_at' })
  public readonly createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  public readonly updatedAt!: Date

  @ManyToOne(() => User, (user) => user.clientReviews)
  @JoinColumn({ name: 'client_id' })
  public client!: User

  @ManyToOne(() => User, (user) => user.providerReviews)
  @JoinColumn({ name: 'provider_id' })
  public provider!: User

  @ManyToOne(() => Service, (service) => service.reviews)
  @JoinColumn({ name: 'service_id' })
  public service!: Service
}
