import { IPaginationParams } from '@domain/entities/search.entity'

import { DiscountTypeEnum, PromotionEntity } from '../entities/promotion.entity'

export interface ISearchPromotionParams {
  search?: string
  id?: number
  size?: number
  page?: number
  code?: string
  name?: string
  price?: number
  description?: string
  discountType?: DiscountTypeEnum
  discountValue?: number
  minAmount?: number
  maxDiscount?: number
  usageLimit?: number
  usedCount?: number
  startDate?: Date
  endDate?: Date
  providerId?: number
}

export const PROMOTION_REPOSITORY = 'PROMOTION_REPOSITORY_INTERFACE'
export interface IPromotionRepositoryInterface {
  createPromotion(entity: Partial<PromotionEntity>): Promise<PromotionEntity>
  getListPromotion(
    props: ISearchPromotionParams,
  ): Promise<{ data: PromotionEntity[]; pagination: IPaginationParams }>
  findOnePromotion(params: {
    id: number
    userId: number
  }): Promise<PromotionEntity | null>
  findPromotionById(id: number): Promise<PromotionEntity | null>
  findPromotionByCode(code: string): Promise<PromotionEntity | null>
  updatePromotion(
    params: { id: number; userId: number },
    entity: Partial<PromotionEntity>,
  ): Promise<boolean>
  deletePromotion(id: number): Promise<boolean>
}
