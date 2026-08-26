import { Inject, Injectable } from '@nestjs/common'

import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  IOrderRepositoryInterface,
  ISearchOrderParams,
  ORDER_REPOSITORY,
} from '@domain/repositories/order.repository.interface'

@Injectable()
export class GetDailyRevenueUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepositoryInterface,

    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(queryParams: ISearchOrderParams & { userId: number }) {
    const { date } = queryParams
    const targetDate = new Date(date ?? new Date())

    queryParams.startDate = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      0,
      0,
      0,
      0,
    )
    queryParams.endDate = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      23,
      59,
      59,
      999,
    )

    const orders = await this.checkOrdersExits(queryParams)
    return orders
  }

  private async checkOrdersExits(
    queryParams: ISearchOrderParams & { userId: number },
  ) {
    const orders = await this.orderRepository.findOrders(queryParams)
    if (!orders) {
      throw this.exceptionsService.notFoundException({
        type: 'OrderNotFoundException',
        message: 'Order not found',
      })
    }
    return orders
  }
}
