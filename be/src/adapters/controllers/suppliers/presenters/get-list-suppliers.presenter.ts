import { ApiProperty } from '@nestjs/swagger'

import { IPaginationParams } from '@domain/entities/search.entity'
import { SupplierEntity } from '@domain/entities/supplier.entity'

import { SupplierPresenter } from './supplier.presenter'

class PaginationPresenter {
  @ApiProperty()
  total: number

  @ApiProperty()
  page: number

  @ApiProperty()
  size: number

  constructor(pagination: IPaginationParams) {
    this.total = pagination.total
    this.page = pagination.page
    this.size = pagination.size
  }
}

export class GetListSuppliersPresenter {
  @ApiProperty({ type: [SupplierPresenter] })
  data: SupplierPresenter[]

  @ApiProperty()
  pagination: PaginationPresenter

  constructor(data: SupplierEntity[], pagination: IPaginationParams) {
    this.data = data.map((item) => new SupplierPresenter(item))
    this.pagination = new PaginationPresenter(pagination)
  }
}
