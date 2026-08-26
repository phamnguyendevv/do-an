import { ApiProperty } from '@nestjs/swagger'

import { GetDetailServicePresenter } from './get-detail-service.presenter'

export class Pagination {
  @ApiProperty({ example: 100 })
  total!: number

  @ApiProperty({ example: 2 })
  page!: number

  @ApiProperty({ example: 10 })
  size!: number
}

export class GetListServicesPresenter {
  @ApiProperty({ type: [GetDetailServicePresenter] })
  data!: GetDetailServicePresenter[]

  @ApiProperty()
  pagination!: Pagination

  constructor(data: GetDetailServicePresenter[], pagination: Pagination) {
    this.data = data.map((service) => new GetDetailServicePresenter(service))
    this.pagination = pagination
  }
}
