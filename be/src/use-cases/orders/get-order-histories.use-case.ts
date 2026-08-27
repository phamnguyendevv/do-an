import { Inject, Injectable } from '@nestjs/common'

import { OrderHistoryEntity } from '@domain/entities/order-history.entity'
import {
  BOOKSTORE_ORDER_REPOSITORY,
  IBookstoreOrderRepositoryInterface,
} from '@domain/repositories/bookstore-order.repository.interface'
import {
  IOrderHistoryRepositoryInterface,
  ORDER_HISTORY_REPOSITORY,
} from '@domain/repositories/order-history.repository.interface'

@Injectable()
export class GetOrderHistoriesUseCase {
  constructor(
    @Inject(ORDER_HISTORY_REPOSITORY)
    private readonly historyRepository: IOrderHistoryRepositoryInterface,
    @Inject(BOOKSTORE_ORDER_REPOSITORY)
    private readonly orderRepository: IBookstoreOrderRepositoryInterface,
  ) {}

  async execute(identifier: string | number): Promise<OrderHistoryEntity[]> {
    const idNum =
      typeof identifier === 'number' ? identifier : parseInt(String(identifier), 10)

    let order = null
    if (!isNaN(idNum)) {
      order = await this.orderRepository.findOrderById(idNum)
    }

    if (!order && typeof identifier === 'string') {
      order = await this.orderRepository.findOrderByCode(identifier)
    }

    if (order) {
      // Find by orderId and orderCode
      const [byOrderId, byOrderCode] = await Promise.all([
        this.historyRepository.findByOrderId(order.id),
        order.orderCode
          ? this.historyRepository.findByOrderCode(order.orderCode)
          : Promise.resolve([]),
      ])

      const map = new Map<number, OrderHistoryEntity>()
      for (const h of [...byOrderId, ...byOrderCode]) {
        map.set(h.id, h)
      }

      return Array.from(map.values()).sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    }

    // Fallback: search directly by ID or code
    if (!isNaN(idNum)) {
      return await this.historyRepository.findByOrderId(idNum)
    }
    return await this.historyRepository.findByOrderCode(String(identifier))
  }
}
