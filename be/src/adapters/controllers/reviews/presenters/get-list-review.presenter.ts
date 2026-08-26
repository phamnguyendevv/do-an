import { ApiProperty } from '@nestjs/swagger'

import { ReviewEntity } from '@domain/entities/review.entity'

import { Pagination } from '@adapters/controllers/categories/presenters/get-list-category.presenter'

export class ReviewsPresenter {
  @ApiProperty()
  id?: number

  @ApiProperty()
  clientId!: number

  @ApiProperty()
  providerId!: number

  @ApiProperty()
  serviceId!: number

  @ApiProperty()
  rating!: number

  @ApiProperty({ required: false })
  comment?: string

  @ApiProperty({ required: false })
  user?: {
    id: number
    name?: string
    avatarUrl?: string
    avatarPublicId?: string
  }

  @ApiProperty()
  createdAt!: Date

  @ApiProperty()
  updatedAt!: Date

  constructor(partial: ReviewEntity) {
    this.id = partial.id
    this.providerId = partial.providerId
    this.serviceId = partial.serviceId
    this.rating = partial.rating
    this.comment = partial.comment
    this.createdAt = partial.createdAt
    this.updatedAt = partial.updatedAt
    if (partial.client) {
      this.user = {
        id: partial.client.id,
        name: partial.client.username,
        avatarUrl: partial.client.avatarUrl,
        avatarPublicId: partial.client.avatarPublicId,
      }
    }
  }
}

export class GetListReviewsPresenter {
  @ApiProperty({ type: [ReviewsPresenter] })
  data!: ReviewsPresenter[]

  @ApiProperty()
  pagination!: Pagination

  constructor(data: ReviewsPresenter[], pagination: Pagination) {
    this.data = data
    this.pagination = pagination
  }
}
