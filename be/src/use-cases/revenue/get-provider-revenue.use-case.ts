import { Inject, Injectable } from '@nestjs/common'

import { OrderEntity } from '@domain/entities/order.entity'
import { IPaginationParams } from '@domain/entities/search.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  IOrderRepositoryInterface,
  ISearchOrderParams,
  ORDER_REPOSITORY,
} from '@domain/repositories/order.repository.interface'

@Injectable()
export class GetProviderRevenueUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepositoryInterface,

    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(
    queryParams: ISearchOrderParams,
  ): Promise<{ data: OrderEntity[]; pagination: IPaginationParams }> {
    const orders = await this.checkOrdersExits(queryParams)
    return orders
  }
  private async checkOrdersExits(queryParams: ISearchOrderParams) {
    const orders =
      await this.orderRepository.findOrdersByProviderId(queryParams)
    if (!orders) {
      throw this.exceptionsService.notFoundException({
        type: 'OrderNotFoundException',
        message: 'Order not found',
      })
    }
    return orders
  }
}
