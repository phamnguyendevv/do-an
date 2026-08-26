import { Inject, Injectable } from '@nestjs/common'

import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  IReviewRepositoryInterface,
  REVIEW_REPOSITORY,
} from '@domain/repositories/review.repository.interface'

@Injectable()
export class GetDetailReviewUseCase {
  constructor(
    @Inject(REVIEW_REPOSITORY)
    private readonly reviewRepository: IReviewRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(payload: { id: number }) {
    const review = await this.reviewRepository.findReviewById(payload.id)

    if (!review) {
      throw this.exceptionsService.notFoundException({
        type: 'ReviewNotFoundException',
        message: 'Review not found',
      })
    }

    return review
  }
}
