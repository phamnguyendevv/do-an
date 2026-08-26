import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'

import { Repository } from 'typeorm'

import { ReviewEntity } from '@domain/entities/review.entity'
import { IPaginationParams } from '@domain/entities/search.entity'
import {
  IReviewRepositoryInterface,
  ISearchReviewParams,
} from '@domain/repositories/review.repository.interface'

import { Review } from '../entities/review.entity'

const DEFAULT_SELECT_FIELDS: (keyof Review)[] = [
  'id',
  'clientId',
  'providerId',
  'serviceId',
  'rating',
  'comment',
  'createdAt',
  'updatedAt',
]

@Injectable()
export class ReviewRepository implements IReviewRepositoryInterface {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) {}

  async findReviews({
    search,
    size,
    page,
    clientId,
    providerId,
    serviceId,
    rating,
  }: ISearchReviewParams): Promise<{
    data: ReviewEntity[]
    pagination: IPaginationParams
  }> {
    size = size || 100
    page = page || 1
    const query = this.reviewRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.client', 'client')
      .leftJoinAndSelect('review.provider', 'provider')
      .leftJoinAndSelect('review.service', 'service')
      .take(size)
      .skip((page - 1) * size)

    if (search) {
      query.where('review.comment ILIKE :comment', { comment: `%${search}%` })
    }

    if (clientId) {
      query.andWhere('review.clientId = :clientId', { clientId })
    }

    if (providerId) {
      query.andWhere('review.providerId = :providerId', { providerId })
    }

    if (serviceId) {
      query.andWhere('review.serviceId = :serviceId', { serviceId })
    }

    if (rating) {
      query.andWhere('review.rating = :rating', { rating })
    }

    query.andWhere('review.isDeleted = :isDeleted', { isDeleted: false })
    const [data, total] = await query.getManyAndCount()
    const pagination: IPaginationParams = {
      total,
      page,
      size,
    }
    return { data, pagination }
  }

  async createReview(review: Partial<Review>): Promise<Review> {
    const newReview = this.reviewRepository.create(review)
    await this.reviewRepository.save(newReview)
    return newReview
  }

  async updateReview(
    params: {
      id: number
    },
    review: Partial<ReviewEntity>,
  ): Promise<boolean> {
    const updateReview = await this.reviewRepository.update(
      { id: params.id, isDeleted: false },
      review,
    )
    if (updateReview.affected === 0) return false
    return true
  }

  async deleteReview(params: { id: number }): Promise<boolean> {
    try {
      const deleteReview = await this.reviewRepository.update(
        {
          id: params.id,
        },
        { isDeleted: true },
      )
      if (deleteReview.affected === 0) return false
      return true
    } catch {
      return false
    }
  }

  async findReviewById(id: number): Promise<ReviewEntity | null> {
    const review = await this.reviewRepository.findOne({
      where: { id, isDeleted: false },
      select: DEFAULT_SELECT_FIELDS,
      relations: ['client', 'provider', 'service'],
    })
    return review ? review : null
  }
}
