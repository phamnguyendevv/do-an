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
  public readonly createdAt?: Date
  public readonly updatedAt?: Date
}
