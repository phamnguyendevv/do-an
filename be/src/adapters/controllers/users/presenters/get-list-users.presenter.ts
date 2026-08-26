import { ApiProperty } from '@nestjs/swagger'

import { UserRoleEnum } from '@domain/entities/role.entity'
import { UserStatusEnum } from '@domain/entities/status.entity'

export class ListUse {
  @ApiProperty()
  id!: number

  @ApiProperty()
  username!: string
  @ApiProperty()
  email!: string

  @ApiProperty()
  lastLogin?: Date

  @ApiProperty({
    required: true,
    enum: UserRoleEnum,
    description: '1: admin , 2: provider, 3: client',
  })
  role!: UserRoleEnum

  @ApiProperty({
    required: true,
    enum: UserRoleEnum,
    description: '1: active , 2: inactive, 3: peding, 4: banned',
  })
  status!: UserStatusEnum

  constructor(partial: Partial<ListUse>) {
    Object.assign(this, partial)
  }
}
export class Pagination {
  @ApiProperty({ example: 100 })
  total!: number

  @ApiProperty({ example: 2 })
  page!: number

  @ApiProperty({ example: 10 })
  size!: number
}

export class GetListUserPresenter {
  @ApiProperty({ type: [ListUse] })
  data!: ListUse[]

  @ApiProperty()
  pagination!: Pagination

  constructor(data: ListUse[], pagination: Pagination) {
    this.data = data.map((item) => new ListUse(item))
    this.pagination = pagination
  }
}
