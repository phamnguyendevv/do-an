import { Inject, Injectable } from '@nestjs/common'

import { OrderStatusEnum, PaymentStatusEnum } from '@domain/entities/order-enums.entity'
import {
  BOOKSTORE_ORDER_REPOSITORY,
  IBookstoreOrderRepositoryInterface,
} from '@domain/repositories/bookstore-order.repository.interface'

export interface GetSepayOrderStatusResult {
  success: boolean
  found: boolean
  orderCode?: string
  payment: string
  status: string
  total?: number
}

@Injectable()
export class GetSepayOrderStatusUseCase {
  constructor(
    @Inject(BOOKSTORE_ORDER_REPOSITORY)
    private readonly orderRepository: IBookstoreOrderRepositoryInterface,
  ) {}

  async execute(orderCode: string): Promise<GetSepayOrderStatusResult> {
    const cleanCode = (orderCode || '').trim().toUpperCase()
    const digits = cleanCode.replace(/\D/g, '')
    const variants = [
      cleanCode,
      `DH-${digits}`,
      `ORD-${digits}`,
      `DH${digits}`,
      `ORD${digits}`,
    ].filter(Boolean)

    const order = await this.orderRepository.findOrderByCodeVariants(variants, digits)

    if (!order) {
      return {
        success: false,
        found: false,
        payment: PaymentStatusEnum.Unpaid,
        status: OrderStatusEnum.Pending,
      }
    }

    return {
      success: true,
      found: true,
      orderCode: order.orderCode,
      payment: String(order.payment),
      status: String(order.status),
      total: Number(order.total),
    }
  }
}
