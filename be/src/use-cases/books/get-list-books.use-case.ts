import { Inject, Injectable } from '@nestjs/common'

import { BookEntity } from '@domain/entities/book.entity'
import { IPaginationParams } from '@domain/entities/search.entity'
import {
  BOOK_REPOSITORY,
  IBookRepositoryInterface,
  ISearchBooksParams,
} from '@domain/repositories/book.repository.interface'
import {
  IRedisCacheService,
  REDIS_SERVICE,
} from '@domain/services/redis.interface'

@Injectable()
export class GetListBooksUseCase {
  constructor(
    @Inject(BOOK_REPOSITORY)
    private readonly bookRepository: IBookRepositoryInterface,
    @Inject(REDIS_SERVICE)
    private readonly redisService: IRedisCacheService,
  ) {}

  async execute(
    queryParams: ISearchBooksParams,
  ): Promise<{ data: BookEntity[]; pagination: IPaginationParams }> {
    const cacheKey = [
      `books:list`,
      `p=${queryParams.page || 1}`,
      `s=${queryParams.size || 100}`,
      `q=${queryParams.search || ''}`,
      `c=${queryParams.category || ''}`,
      `st=${queryParams.status || ''}`,
      `minP=${queryParams.minPrice ?? ''}`,
      `maxP=${queryParams.maxPrice ?? ''}`,
      `from=${queryParams.startDate || ''}`,
      `to=${queryParams.endDate || ''}`,
      `sort=${queryParams.sortBy || ''}:${queryParams.sortOrder || ''}`,
    ].join(':')

    const cached = await this.redisService.getValue<{
      data: BookEntity[]
      pagination: IPaginationParams
    }>(cacheKey)

    if (cached) {
      return cached
    }

    const result = await this.bookRepository.findBooks(queryParams)

    await this.redisService.setValue(cacheKey, result, 120)

    return result
  }
}
