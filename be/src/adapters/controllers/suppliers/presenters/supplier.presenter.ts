import { ApiProperty } from '@nestjs/swagger'
import { SupplierEntity } from '@domain/entities/supplier.entity'

export class SupplierPresenter {
  @ApiProperty()
  id: number

  @ApiProperty()
  name: string

  @ApiProperty({ required: false })
  contactName?: string

  @ApiProperty({ required: false })
  phone?: string

  @ApiProperty({ required: false })
  email?: string

  @ApiProperty({ required: false })
  address?: string

  @ApiProperty({ required: false })
  note?: string

  @ApiProperty({ required: false })
  createdAt?: Date

  @ApiProperty({ required: false })
  updatedAt?: Date

  constructor(supplier: SupplierEntity) {
    this.id = supplier.id
    this.name = supplier.name
    this.contactName = supplier.contactName
    this.phone = supplier.phone
    this.email = supplier.email
    this.address = supplier.address
    this.note = supplier.note
    this.createdAt = supplier.createdAt
    this.updatedAt = supplier.updatedAt
  }
}
