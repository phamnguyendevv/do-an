import { Inject, Injectable } from '@nestjs/common'

import { ReviewEntity } from '@domain/entities/review.entity'
import {
  IReviewRepositoryInterface,
  REVIEW_REPOSITORY,
} from '@domain/repositories/review.repository.interface'

@Injectable()
export class CreateReviewUseCase {
  constructor(
    @Inject(REVIEW_REPOSITORY)
    private readonly reviewRepository: IReviewRepositoryInterface,
  ) {}

  async execute(
    queryParams: Partial<ReviewEntity>,
    userId: number,
  ): Promise<ReviewEntity> {
    queryParams.clientId = userId

    await this.checkReview(queryParams.serviceId!, userId)
    const review = await this.reviewRepository.createReview(queryParams)

    return review
  }
  private async checkReview(serviceId: number, userId: number): Promise<void> {
    const existingReview = await this.reviewRepository.findReviews({
      serviceId,
      clientId: userId,
    })

    if (existingReview.data.length > 0) {
      throw new Error('You have already reviewed this service.')
    }
  }
}
