import { ApiProperty } from '@nestjs/swagger'

import { PromotionEntity } from '@domain/entities/promotion.entity'

export class GetDetailPromotionPresenter {
  @ApiProperty()
  id: number

  @ApiProperty()
  name!: string

  @ApiProperty()
  code!: string

  @ApiProperty()
  description?: string

  @ApiProperty()
  discountValue!: number

  @ApiProperty()
  startDate!: Date

  @ApiProperty()
  endDate!: Date

  @ApiProperty()
  maxDiscount!: number

  @ApiProperty()
  usageLimit!: number

  @ApiProperty()
  usedCount!: number

  @ApiProperty()
  providerId!: number

  constructor(data: PromotionEntity) {
    this.id = data.id
    this.code = data.code
    this.name = data.name
    this.discountValue = data.discountValue
    this.description = data.description
    this.providerId = data.providerId
    this.maxDiscount = data.maxDiscount
    this.usageLimit = data.usageLimit
    this.usedCount = data.usedCount
    this.startDate = data.startDate
    this.endDate = data.endDate
  }
}
