import { Inject, Injectable } from '@nestjs/common'

import { PromotionEntity } from '@domain/entities/promotion.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  IPromotionRepositoryInterface,
  PROMOTION_REPOSITORY,
} from '@domain/repositories/promotion.repository.interface'

@Injectable()
export class GetPromotionUseCase {
  constructor(
    @Inject(PROMOTION_REPOSITORY)
    private readonly promotionRepository: IPromotionRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(id: number, userId: number): Promise<PromotionEntity> {
    const promotion = await this.promotionRepository.findOnePromotion({
      id,
      userId,
    })

    if (!promotion) {
      throw this.exceptionsService.notFoundException({
        type: 'PromotionNotFoundException',
        message: `Promotion not found`,
      })
    }
    return promotion
  }
}
