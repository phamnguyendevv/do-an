import { ApiProperty } from '@nestjs/swagger'

import { UserRoleEnum } from '@domain/entities/role.entity'
import { UserStatusEnum } from '@domain/entities/status.entity'

export class GetMePresenter {
  @ApiProperty({ required: true })
  id!: number

  @ApiProperty({ required: true })
  username!: string

  @ApiProperty({ required: true })
  email!: string

  @ApiProperty({ required: true })
  role!: UserRoleEnum

  @ApiProperty({ required: true })
  status!: UserStatusEnum

  @ApiProperty({ required: true })
  emailVerified?: boolean

  @ApiProperty({ required: true })
  lastLogin?: Date

  constructor({
    id,
    username,
    email,
    status,
    role,
    lastLogin,
    emailVerified,
  }: GetMePresenter) {
    this.id = id
    this.username = username
    this.status = status
    this.email = email
    this.role = role
    this.lastLogin = lastLogin
    this.emailVerified = emailVerified
  }
}
