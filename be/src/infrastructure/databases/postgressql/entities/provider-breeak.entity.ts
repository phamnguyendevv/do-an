import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'

import { User } from './user.entity'

@Entity('provider_breaks')
export class ProviderBreak {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    primaryKeyConstraintName: 'PK_provider_breaks_id',
  })
  public readonly id!: number

  @Column({ type: 'int', name: 'provider_id' })
  public providerId!: number

  @Column({ type: 'date', name: 'break_date' })
  public breakDate!: Date

  @Column({ type: 'time', name: 'start_time' })
  public startTime!: string

  @Column({ type: 'time', name: 'end_time' })
  public endTime!: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  public reason!: string

  @CreateDateColumn({ name: 'created_at' })
  public readonly createdAt!: Date

  // Relations
  @ManyToOne(() => User, (user) => user.breaks)
  @JoinColumn({ name: 'provider_id' })
  public provider!: User
}
