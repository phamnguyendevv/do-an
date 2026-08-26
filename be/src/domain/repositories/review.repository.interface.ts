import { ReviewEntity } from '@domain/entities/review.entity'
import { IPaginationParams } from '@domain/entities/search.entity'

export interface ISearchReviewParams {
  size?: number
  search?: string
  page?: number
  clientId?: number
  providerId?: number
  serviceId?: number
  rating?: number
}

export const REVIEW_REPOSITORY = 'REVIEW_REPOSITORY_INTERFACE'

export interface IReviewRepositoryInterface {
  findReviews(queryParams: ISearchReviewParams): Promise<{
    data: ReviewEntity[]
    pagination: IPaginationParams
  }>
  createReview(review: Partial<ReviewEntity>): Promise<ReviewEntity>
  updateReview(
    params: {
      id: number
    },
    review: Partial<ReviewEntity>,
  ): Promise<boolean>
  deleteReview(params: { id: number }): Promise<boolean>
  findReviewById(id: number): Promise<ReviewEntity | null>
}
