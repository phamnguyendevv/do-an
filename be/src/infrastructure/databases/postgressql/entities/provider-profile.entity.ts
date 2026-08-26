import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { ProviderStatusEnum } from '@domain/entities/status.entity'

import { User } from './user.entity'

@Entity('provider_profiles')
export class ProviderProfile {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    primaryKeyConstraintName: 'PK_provider_profiles_id',
  })
  public readonly id!: number

  @Column({ type: 'int', name: 'user_id' })
  public userId!: number

  @Column({ type: 'varchar', length: 255, name: 'business_name' })
  public businessName!: string

  @Column({ type: 'text', nullable: true, name: 'business_description' })
  public businessDescription!: string

  @Column({ type: 'jsonb', nullable: true, name: 'bank_account_info' })
  public bankAccountInfo!: object

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 10.0,
    name: 'commission_rate',
  })
  public commissionRate!: number

  @Column({
    type: 'smallint',
    default: ProviderStatusEnum.InActive,
  })
  public status!: ProviderStatusEnum

  @CreateDateColumn({ name: 'created_at' })
  public readonly createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  public readonly updatedAt!: Date

  // Relations
  @OneToOne(() => User, (user) => user.providerProfile)
  @JoinColumn({ name: 'user_id' })
  public user!: User
}
