import { ApiProperty } from '@nestjs/swagger'

import { PromotionEntity } from '@domain/entities/promotion.entity'

import { Pagination } from '@adapters/controllers/categories/presenters/get-list-category.presenter'

import { GetDetailPromotionPresenter } from './get-list-promotion.presenter'

export class GetListPromotionsPresenter {
  @ApiProperty({
    type: GetDetailPromotionPresenter,
    isArray: true,
  })
  data: GetDetailPromotionPresenter[]

  @ApiProperty()
  pagination!: Pagination

  constructor(data: PromotionEntity[], pagination: Pagination) {
    this.data = data.map((item) => new GetDetailPromotionPresenter(item))
    this.pagination = pagination
  }
}
