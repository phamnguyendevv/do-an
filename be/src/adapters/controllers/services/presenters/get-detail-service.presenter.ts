import { ApiProperty } from '@nestjs/swagger'

import { ServiceEntity } from '@domain/entities/service.entity'

import { GetDetailCategoryPresenter } from '@adapters/controllers/categories/presenters/get-detail-category.presenter'
import { GetDetailProviderPresenter } from '@adapters/controllers/users/presenters/get-provider-detail-presenter'

export class GetDetailServicePresenter {
  @ApiProperty()
  id!: number

  @ApiProperty()
  name!: string

  @ApiProperty({ required: false })
  description?: string

  @ApiProperty({ required: true })
  price!: number

  @ApiProperty({ required: true })
  duration!: number

  @ApiProperty({ required: false })
  imageUrl?: string

  @ApiProperty({ required: false })
  imagePublicId?: string

  @ApiProperty({ required: false })
  isActive?: boolean

  @ApiProperty({ required: false })
  rating?: number

  @ApiProperty({ required: false })
  reviewCount?: number

  @ApiProperty({ required: true })
  categoryId!: number

  @ApiProperty({ required: true })
  providerId!: number

  @ApiProperty({ required: false })
  provider!: GetDetailProviderPresenter

  @ApiProperty({ required: false })
  category!: GetDetailCategoryPresenter

  constructor(partial: ServiceEntity) {
    const reviewCount = partial.review?.length ?? 0
    const totalRating =
      partial.review?.reduce((acc, review) => acc + review.rating, 0) ?? 0
    const averageReview = reviewCount > 0 ? totalRating / reviewCount : 0

    this.id = partial.id
    this.name = partial.name
    this.categoryId = partial.category?.id
    this.providerId = partial.provider?.id
    this.description = partial.description
    this.price = partial.price
    this.imageUrl = partial.imageUrl
    this.imagePublicId = partial.imagePublicId
    this.duration = partial.duration
    this.isActive = partial.isActive
    this.rating = averageReview
    this.reviewCount = reviewCount
    this.provider = {
      id: partial.provider?.id,
      username: partial.provider?.username,
      email: partial.provider?.email,
      avatarUrl: partial.provider?.avatarUrl,
      avatarPublicId: partial.provider?.avatarPublicId,
      addressProvince: partial.provider?.addressProvince,
      addressDistrict: partial.provider?.addressDistrict,
      addressWard: partial.provider?.addressWard,
      addressDetail: partial.provider?.addressDetail,
      role: partial.provider.role,
      status: partial.provider?.status,
      businessName: partial.provider?.businessName,
      businessDescription: partial.provider?.businessDescription,
      commissionRate: partial.provider?.commissionRate,
    }
    this.category = {
      id: partial.category?.id,
      name: partial.category?.name,
      description: partial.category?.description,
    }
  }
}
