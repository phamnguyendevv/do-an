import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { UserRoleEnum } from '@domain/entities/role.entity'
import { UserStatusEnum } from '@domain/entities/status.entity'
import { UserEntity } from '@domain/entities/user.entity'

@Entity('users')
@Index('IDX_users_email', ['email'], { unique: true })
export class User implements UserEntity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    primaryKeyConstraintName: 'PK_users_id',
  })
  public readonly id!: number

  @Column('varchar', { length: 255 })
  public username!: string

  @Column('varchar', { length: 255 })
  public email!: string

  @Column('text')
  password!: string

  @Column('varchar', { length: 255, nullable: true })
  public phone!: string

  @Column('varchar', { length: 255, nullable: true })
  public avatarUrl?: string

  @Column('text', {
    name: 'avatar_public_id',
    nullable: true,
  })
  public avatarPublicId?: string

  @Column('varchar', { name: 'address_province', length: 255, nullable: true })
  public addressProvince?: string

  @Column('varchar', { name: 'address_district', length: 255, nullable: true })
  public addressDistrict?: string

  @Column('varchar', { name: 'address_ward', length: 255, nullable: true })
  public addressWard?: string

  @Column('varchar', { name: 'address_detail', length: 255, nullable: true })
  public addressDetail?: string

  @Column('smallint', { default: UserRoleEnum.Staff })
  public role!: UserRoleEnum

  @Column('smallint', { default: UserStatusEnum.Active })
  public status!: UserStatusEnum

  @Column('boolean', { name: 'email_verified', default: true })
  public emailVerified!: boolean

  @Column('timestamp', { name: 'last_login', nullable: true })
  public lastLogin?: Date

  @CreateDateColumn({ name: 'created_at' })
  public readonly createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  public readonly updatedAt!: Date
}
