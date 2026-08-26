export enum DiscountTypeEnum {
  Percentage = 1,
  FixedAmount = 2,
}

export class PromotionEntity {
  public readonly id!: number
  public providerId!: number
  public code!: string
  public name!: string
  public description?: string
  public discountValue!: number
  public maxDiscount!: number
  public usageLimit!: number
  public usedCount!: number
  public startDate!: Date
  public endDate!: Date
  public isActive!: boolean
  public isDeleted!: boolean
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}
