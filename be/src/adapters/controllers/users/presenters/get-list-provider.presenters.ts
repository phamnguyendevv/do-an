// provider-profile.presenter.ts
import { ApiProperty } from '@nestjs/swagger'

import { Pagination } from './get-list-users.presenter'
import { GetDetailProviderPresenter } from './get-provider-detail-presenter'

export class GetListProviderPresenter {
  @ApiProperty({ type: [GetDetailProviderPresenter] })
  data!: GetDetailProviderPresenter[]

  @ApiProperty()
  pagination!: Pagination

  constructor(data: GetDetailProviderPresenter[], pagination: Pagination) {
    this.data = data.map((item) => new GetDetailProviderPresenter(item))
    this.pagination = pagination
  }
}
