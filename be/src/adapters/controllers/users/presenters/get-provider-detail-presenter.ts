import { ApiProperty } from '@nestjs/swagger'

import { UserRoleEnum } from '@domain/entities/role.entity'
import { UserStatusEnum } from '@domain/entities/status.entity'
import { UserEntity } from '@domain/entities/user.entity'

export class GetDetailProviderPresenter {
  @ApiProperty()
  id!: number
  @ApiProperty()
  username!: string
  @ApiProperty()
  email!: string
  @ApiProperty()
  phone?: string
  @ApiProperty()
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
  role!: UserRoleEnum
  @ApiProperty()
  status!: UserStatusEnum
  @ApiProperty()
  businessName?: string
  @ApiProperty()
  businessDescription?: string
  @ApiProperty()
  bankAccountInfo?: object
  @ApiProperty()
  commissionRate?: number

  constructor(partial: UserEntity) {
    this.id = partial.id
    this.username = partial.username
    this.email = partial.email
    this.phone = partial.phone
    this.avatarUrl = partial.avatarUrl
    this.avatarPublicId = partial.avatarPublicId
    this.addressProvince = partial.addressProvince
    this.addressDistrict = partial.addressDistrict
    this.addressWard = partial.addressWard
    this.addressDetail = partial.addressDetail
    this.role = partial.role
    this.status = partial.status
    this.businessName = partial.providerProfile?.businessName
    this.businessDescription = partial.providerProfile?.businessDescription
    this.bankAccountInfo = partial.providerProfile?.bankAccountInfo
    this.commissionRate = partial.providerProfile?.commissionRate
  }
}
