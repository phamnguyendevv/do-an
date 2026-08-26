import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm'

import { User } from './user.entity'

@Entity('provider_availability')
@Unique(['providerId', 'dayOfWeek'])
export class ProviderAvailability {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    primaryKeyConstraintName: 'PK_provider_availability_id',
  })
  public readonly id!: number

  @Column({ type: 'int', name: 'provider_id' })
  public providerId!: number

  @Column({ type: 'smallint', name: 'day_of_week' })
  public dayOfWeek!: number

  @Column({ type: 'time', name: 'start_time' })
  public startTime!: string

  @Column({ type: 'time', name: 'end_time' })
  public endTime!: string

  @Column({ type: 'boolean', default: true, name: 'is_available' })
  public isAvailable!: boolean

  @CreateDateColumn({ name: 'created_at' })
  public readonly createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  public readonly updatedAt!: Date

  // Relations
  @ManyToOne(() => User, (user) => user.availability)
  @JoinColumn({ name: 'provider_id' })
  public provider!: User
}
