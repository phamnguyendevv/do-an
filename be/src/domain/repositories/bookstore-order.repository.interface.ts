import { BookstoreOrderEntity } from '@domain/entities/bookstore-order.entity'
import { IPaginationParams } from '@domain/entities/search.entity'

export interface ISearchBookstoreOrdersParams {
  size?: number
  search?: string
  page?: number
  status?: string
  payment?: string
  startDate?: string
  endDate?: string
  minTotal?: number
  maxTotal?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

export const BOOKSTORE_ORDER_REPOSITORY = 'BOOKSTORE_ORDER_REPOSITORY_INTERFACE'

export interface IBookstoreOrderRepositoryInterface {
  findOrders(queryParams: ISearchBookstoreOrdersParams): Promise<{
    data: BookstoreOrderEntity[]
    pagination: IPaginationParams
  }>
  createOrder(order: Partial<BookstoreOrderEntity>): Promise<BookstoreOrderEntity>
  updateOrder(
    params: {
      id: number
    },
    order: Partial<BookstoreOrderEntity>,
  ): Promise<boolean>
  findOrderById(id: number): Promise<BookstoreOrderEntity | null>
  findOrderByCode(orderCode: string): Promise<BookstoreOrderEntity | null>
  findOrderByCodeVariants(variants: string[], digits?: string): Promise<BookstoreOrderEntity | null>
  findUnpaidOrderByAmount(amount: number): Promise<BookstoreOrderEntity | null>
  count(): Promise<number>
}

