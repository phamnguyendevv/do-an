import { UserRoleEnum } from './role.entity'
import { ProviderStatusEnum, UserStatusEnum } from './status.entity'

export class ProviderProfileEntity {
  public readonly id!: number
  public userId?: number
  public businessName?: string
  public businessDescription?: string
  public bankAccountInfo?: object
  public commissionRate?: number
  public status?: ProviderStatusEnum

  public readonly createdAt?: Date
  public readonly updatedAt?: Date
}
export class ProviderProfileUserEntity {
  public readonly id!: number
  public userId?: number
  public email!: string
  public phone?: string
  public username!: string
  public avatarUrl?: string
  public avatarPublicId?: string
  public addressProvince?: string
  public addressDistrict?: string
  public addressWard?: string
  public addressDetail?: string
  public role!: UserRoleEnum
  public status!: UserStatusEnum
  public businessName?: string
  public businessDescription?: string
  public bankAccountInfo?: object
  public commissionRate?: number
  public readonly createdAt?: Date
  public readonly updatedAt?: Date
}
