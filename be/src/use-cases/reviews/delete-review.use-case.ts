import { Inject, Injectable } from '@nestjs/common'

import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  IReviewRepositoryInterface,
  REVIEW_REPOSITORY,
} from '@domain/repositories/review.repository.interface'

@Injectable()
export class DeleteReviewUseCase {
  constructor(
    @Inject(REVIEW_REPOSITORY)
    private readonly reviewRepository: IReviewRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(params: { id: number }): Promise<boolean> {
    const review = await this.reviewRepository.findReviewById(params.id)
    if (!review) {
      throw this.exceptionsService.notFoundException({
        type: 'ReviewNotFoundException',
        message: 'Review not found',
      })
    }

    const isDeleted = await this.reviewRepository.deleteReview(params)
    if (!isDeleted) {
      throw this.exceptionsService.badRequestException({
        type: 'DeleteReviewException',
        message: 'Delete review failed',
      })
    }

    return true
  }
}
