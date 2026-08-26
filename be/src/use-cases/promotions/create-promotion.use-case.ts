import { Inject, Injectable } from '@nestjs/common'

import { PromotionEntity } from '@domain/entities/promotion.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  IPromotionRepositoryInterface,
  PROMOTION_REPOSITORY,
} from '@domain/repositories/promotion.repository.interface'

@Injectable()
export class CreatePromotionUseCase {
  constructor(
    @Inject(PROMOTION_REPOSITORY)
    private readonly promotionRepository: IPromotionRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(
    props: Partial<PromotionEntity>,
    userId: number,
  ): Promise<PromotionEntity> {
    this.validateBusinessRules(props)
    await this.validatePromotionCodeUniqueness(props.code!)
    props.providerId = userId
    props.usedCount = 0
    const promotion = await this.promotionRepository.createPromotion(props)
    return promotion
  }
  private validateBusinessRules(props: Partial<PromotionEntity>) {
    if (new Date(props.startDate!) > new Date(props.endDate!)) {
      throw this.exceptionsService.badRequestException({
        type: 'PromotionStartDateException',
        message: `Promotion start date  is greater than end date`,
      })
    }

    if (props.usageLimit! < 0) {
      throw this.exceptionsService.badRequestException({
        type: 'PromotionUsageLimitException',
        message: `Promotion usage limit must be greater than 0`,
      })
    }
  }
  private async validatePromotionCodeUniqueness(code: string): Promise<void> {
    const existingPromotion =
      await this.promotionRepository.findPromotionByCode(code)

    if (existingPromotion) {
      throw this.exceptionsService.badRequestException({
        type: 'PromotionCodeAlreadyExistsException',
        message: `Promotion with code ${code} already exists`,
      })
    }
  }
}
