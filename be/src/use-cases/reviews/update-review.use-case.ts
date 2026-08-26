import { Inject, Injectable } from '@nestjs/common'

import { ReviewEntity } from '@domain/entities/review.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  IReviewRepositoryInterface,
  REVIEW_REPOSITORY,
} from '@domain/repositories/review.repository.interface'

@Injectable()
export class UpdateReviewUseCase {
  constructor(
    @Inject(REVIEW_REPOSITORY)
    private readonly reviewRepository: IReviewRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(
    params: { id: number },
    updatedReview: Partial<ReviewEntity>,
  ): Promise<boolean> {
    await this.checkReviewExists(params)
    return await this.reviewRepository.updateReview(params, updatedReview)
  }

  private async checkReviewExists(params: { id: number }) {
    const review = await this.reviewRepository.findReviewById(params.id)
    if (!review) {
      throw this.exceptionsService.notFoundException({
        type: 'ReviewNotFoundException',
        message: 'Review not found',
      })
    }
  }
}
