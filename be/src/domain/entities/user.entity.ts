import { ProviderProfileEntity } from './provider-profile.entity'
import { UserRoleEnum } from './role.entity'
import { UserStatusEnum } from './status.entity'

export class UserEntity {
  public readonly id!: number
  public username!: string
  public email!: string
  password?: string
  public role!: UserRoleEnum
  public status!: UserStatusEnum
  public lastLogin?: Date
  public emailVerified?: boolean
  public phone?: string
  public avatarUrl?: string
  public avatarPublicId?: string
  public addressProvince?: string
  public addressDistrict?: string
  public addressWard?: string
  public addressDetail?: string
  public isProvider?: boolean
  public providerProfile?: ProviderProfileEntity

  public readonly createdAt?: Date
  public readonly updatedAt?: Date
}

export class UserWithProfileEntity extends UserEntity {
  public businessName?: string
  public businessDescription?: string
  public bankAccountInfo?: object
  public commissionRate?: number
}
