import { OrderEntity } from '@domain/entities/order.entity'
import { PaymentStatusEnum } from '@domain/entities/payment.entity'
import { IPaginationParams } from '@domain/entities/search.entity'

export const ORDER_REPOSITORY = 'ORDER_REPOSITORY_INTERFACE'

export interface ISearchOrderParams {
  date?: string
  serviceId?: number
  serviceName?: string
  size?: number
  page?: number
  paymentStatus?: PaymentStatusEnum
  providerId?: number
  userId?: number
  startDate?: Date
  endDate?: Date
  month?: number
  year?: number
}

export interface IOrderRepositoryInterface {
  createOrder(order: Partial<OrderEntity>): Promise<OrderEntity>
  findOrderById(id: number): Promise<OrderEntity | null>
  findOrders(
    params: ISearchOrderParams & { userId: number },
  ): Promise<OrderEntity[]>
  findOrdersByProviderId(
    params: ISearchOrderParams,
  ): Promise<{ data: OrderEntity[]; pagination: IPaginationParams }>
  updateOrder(id: number, order: Partial<OrderEntity>): Promise<boolean>
}
