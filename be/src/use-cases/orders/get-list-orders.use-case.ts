import { Inject, Injectable } from '@nestjs/common'

import { BookstoreOrderEntity } from '@domain/entities/bookstore-order.entity'
import { IPaginationParams } from '@domain/entities/search.entity'
import {
  BOOKSTORE_ORDER_REPOSITORY,
  IBookstoreOrderRepositoryInterface,
  ISearchBookstoreOrdersParams,
} from '@domain/repositories/bookstore-order.repository.interface'
import {
  IRedisCacheService,
  REDIS_SERVICE,
} from '@domain/services/redis.interface'

@Injectable()
export class GetListBookstoreOrdersUseCase {
  constructor(
    @Inject(BOOKSTORE_ORDER_REPOSITORY)
    private readonly orderRepository: IBookstoreOrderRepositoryInterface,
    @Inject(REDIS_SERVICE)
    private readonly redisService: IRedisCacheService,
  ) {}

  async execute(queryParams: ISearchBookstoreOrdersParams): Promise<{
    data: BookstoreOrderEntity[]
    pagination: IPaginationParams
  }> {
    const cacheKey = `orders:list:p=${queryParams.page || 1}:s=${queryParams.size || 50}:q=${queryParams.search || ''}:st=${queryParams.status || ''}:pm=${queryParams.payment || ''}:sd=${queryParams.startDate || ''}:ed=${queryParams.endDate || ''}`

    const cached = await this.redisService.getValue<{
      data: BookstoreOrderEntity[]
      pagination: IPaginationParams
    }>(cacheKey)

    if (cached) {
      return cached
    }

    const result = await this.orderRepository.findOrders(queryParams)

    await this.redisService.setValue(cacheKey, result, 60)

    return result
  }
}

