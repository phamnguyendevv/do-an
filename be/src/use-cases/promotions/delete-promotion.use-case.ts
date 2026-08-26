import { Inject, Injectable } from '@nestjs/common'

import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  IPromotionRepositoryInterface,
  PROMOTION_REPOSITORY,
} from '@domain/repositories/promotion.repository.interface'

@Injectable()
export class DeletePromotionUseCase {
  constructor(
    @Inject(PROMOTION_REPOSITORY)
    private readonly promotionRepository: IPromotionRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(id: number): Promise<boolean> {
    const promotion = await this.promotionRepository.findPromotionById(id)
    if (!promotion) {
      throw this.exceptionsService.notFoundException({
        type: 'PromotionNotFoundException',
        message: `Promotion with id ${id} not found`,
      })
    }
    const isDelete = await this.promotionRepository.deletePromotion(id)
    return isDelete
  }
}
