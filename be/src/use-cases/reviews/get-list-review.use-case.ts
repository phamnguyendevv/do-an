import { Inject, Injectable } from '@nestjs/common'

import { ReviewEntity } from '@domain/entities/review.entity'
import { IPaginationParams } from '@domain/entities/search.entity'
import {
  IReviewRepositoryInterface,
  ISearchReviewParams,
  REVIEW_REPOSITORY,
} from '@domain/repositories/review.repository.interface'

@Injectable()
export class GetListReviewUseCase {
  constructor(
    @Inject(REVIEW_REPOSITORY)
    private readonly reviewRepository: IReviewRepositoryInterface,
  ) {}

  async execute(queryParams: ISearchReviewParams): Promise<{
    data: ReviewEntity[]
    pagination: IPaginationParams
  }> {
    return await this.reviewRepository.findReviews(queryParams)
  }
}
