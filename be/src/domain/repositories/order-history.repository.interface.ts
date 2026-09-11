import {
  OrderHistoryAction,
  OrderHistoryEntity,
} from '@domain/entities/order-history.entity'
import { IPaginationParams } from '@domain/entities/search.entity'

export interface ISearchOrderHistoryParams {
  size?: number
  page?: number
  orderId?: number
  orderCode?: string
  action?: OrderHistoryAction | string
  search?: string
  actor?: string
  startDate?: Date
  endDate?: Date
}

export const ORDER_HISTORY_REPOSITORY = 'ORDER_HISTORY_REPOSITORY_INTERFACE'

export interface IOrderHistoryRepositoryInterface {
  findByOrderId(orderId: number): Promise<OrderHistoryEntity[]>
  findByOrderCode(orderCode: string): Promise<OrderHistoryEntity[]>
  findHistories(params: ISearchOrderHistoryParams): Promise<{
    data: OrderHistoryEntity[]
    pagination: IPaginationParams
  }>
  createHistory(
    history: Partial<OrderHistoryEntity>,
  ): Promise<OrderHistoryEntity>
}
