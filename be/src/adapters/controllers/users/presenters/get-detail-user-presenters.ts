import { ApiProperty } from '@nestjs/swagger'

import { IsOptional } from 'class-validator'

import { UserRoleEnum } from '@domain/entities/role.entity'
import { UserStatusEnum } from '@domain/entities/status.entity'

export class SimpleUserPresenter {
  @ApiProperty()
  id!: number

  @ApiProperty()
  username!: string

  @ApiProperty()
  email!: string

  @ApiProperty({ enum: UserRoleEnum })
  role!: UserRoleEnum

  @ApiProperty({
    enum: UserStatusEnum,
  })
  status!: UserStatusEnum
  @ApiProperty()
  lastLogin?: Date
  @ApiProperty()
  emailVerified?: boolean

  @ApiProperty()
  phone?: string

  @ApiProperty()
  @IsOptional()
  avatarUrl?: string
  @ApiProperty()
  avatarPublicId?: string
  @ApiProperty()
  addressProvince?: string
  @ApiProperty()
  addressDistrict?: string
  @ApiProperty()
  addressWard?: string
  @ApiProperty()
  addressDetail?: string

  @ApiProperty()
  isProvider?: boolean

  constructor(partial: SimpleUserPresenter) {
    this.id = partial.id
    this.username = partial.username
    this.email = partial.email
    this.role = partial.role
    this.status = partial.status
    this.lastLogin = partial.lastLogin
    this.emailVerified = partial.emailVerified
    this.phone = partial.phone
    this.avatarUrl = partial.avatarUrl
    this.avatarPublicId = partial.avatarPublicId
    this.addressProvince = partial.addressProvince
    this.addressDistrict = partial.addressDistrict
    this.addressWard = partial.addressWard
    this.addressDetail = partial.addressDetail
    this.isProvider = partial.isProvider
  }
}
