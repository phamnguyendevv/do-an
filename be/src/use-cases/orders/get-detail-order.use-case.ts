import { Inject, Injectable } from '@nestjs/common'

import { BookstoreOrderEntity } from '@domain/entities/bookstore-order.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  BOOKSTORE_ORDER_REPOSITORY,
  IBookstoreOrderRepositoryInterface,
} from '@domain/repositories/bookstore-order.repository.interface'
import {
  IRedisCacheService,
  REDIS_SERVICE,
} from '@domain/services/redis.interface'

@Injectable()
export class GetDetailBookstoreOrderUseCase {
  constructor(
    @Inject(BOOKSTORE_ORDER_REPOSITORY)
    private readonly orderRepository: IBookstoreOrderRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
    @Inject(REDIS_SERVICE)
    private readonly redisService: IRedisCacheService,
  ) {}

  async execute(identifier: string | number): Promise<BookstoreOrderEntity> {
    const cacheKey = `orders:detail:${identifier}`

    const cached =
      await this.redisService.getValue<BookstoreOrderEntity>(cacheKey)
    if (cached) {
      return cached
    }

    const idNum =
      typeof identifier === 'number' ? identifier : parseInt(identifier, 10)
    let order: BookstoreOrderEntity | null = null

    if (!isNaN(idNum)) {
      order = await this.orderRepository.findOrderById(idNum)
    }

    if (!order && typeof identifier === 'string') {
      order = await this.orderRepository.findOrderByCode(identifier)
    }

    if (!order) {
      throw this.exceptionsService.notFoundException({
        type: 'OrderNotFoundException',
        message: 'Không tìm thấy đơn hàng',
      })
    }

    await this.redisService.setValue(cacheKey, order, 120)
    if (order.id) {
      await this.redisService.setValue(`orders:detail:${order.id}`, order, 120)
    }
    if (order.orderCode) {
      await this.redisService.setValue(
        `orders:detail:${order.orderCode}`,
        order,
        120,
      )
    }

    return order
  }
}
