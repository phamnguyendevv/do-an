import { Inject, Injectable } from '@nestjs/common'

import { PromotionEntity } from '@domain/entities/promotion.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  IPromotionRepositoryInterface,
  PROMOTION_REPOSITORY,
} from '@domain/repositories/promotion.repository.interface'

@Injectable()
export class UpdatePromotionUseCase {
  constructor(
    @Inject(PROMOTION_REPOSITORY)
    private readonly promotionRepository: IPromotionRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(
    params: { id: number; userId: number },
    props: Partial<PromotionEntity>,
  ): Promise<boolean> {
    await this.checkPromotion(params)

    this.checkUpdatePromotion(props)

    const promotion = await this.promotionRepository.updatePromotion(
      params,
      props,
    )

    return promotion
  }

  private async checkPromotion(params: { id: number; userId: number }) {
    const promotion = await this.promotionRepository.findOnePromotion(params)
    if (!promotion) {
      throw this.exceptionsService.notFoundException({
        type: 'PromotionNotFoundException',
        message: `Promotion not found or not belong to provider`,
      })
    }
  }
  private checkUpdatePromotion(props: Partial<PromotionEntity>) {
    if (props.startDate && props.endDate) {
      if (props.startDate > props.endDate) {
        throw this.exceptionsService.badRequestException({
          type: 'PromotionStartDateException',
          message: `Promotion start date is greater than end date`,
        })
      }
    }

    if (props.usageLimit && props.usedCount) {
      if (props.usageLimit < props.usedCount) {
        throw this.exceptionsService.badRequestException({
          type: 'PromotionUsageLimitException',
          message: `Promotion usage limit is less than used count`,
        })
      }
    }
  }
}
