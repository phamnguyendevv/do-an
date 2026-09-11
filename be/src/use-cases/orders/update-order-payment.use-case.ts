import { Inject, Injectable } from '@nestjs/common'

import { BookstoreOrderEntity } from '@domain/entities/bookstore-order.entity'
import { PaymentStatusEnum } from '@domain/entities/order-enums.entity'
import { OrderHistoryActionEnum } from '@domain/entities/order-history.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  BOOKSTORE_ORDER_REPOSITORY,
  IBookstoreOrderRepositoryInterface,
} from '@domain/repositories/bookstore-order.repository.interface'
import {
  IOrderHistoryRepositoryInterface,
  ORDER_HISTORY_REPOSITORY,
} from '@domain/repositories/order-history.repository.interface'
import {
  IRedisCacheService,
  REDIS_SERVICE,
} from '@domain/services/redis.interface'

@Injectable()
export class UpdateBookstoreOrderPaymentUseCase {
  constructor(
    @Inject(BOOKSTORE_ORDER_REPOSITORY)
    private readonly orderRepository: IBookstoreOrderRepositoryInterface,
    @Inject(ORDER_HISTORY_REPOSITORY)
    private readonly historyRepository: IOrderHistoryRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
    @Inject(REDIS_SERVICE)
    private readonly redisService: IRedisCacheService,
  ) {}

  async execute(
    id: number,
    payment: PaymentStatusEnum | string,
    options?: {
      actor?: string
      actorRole?: string
      note?: string
    },
  ): Promise<BookstoreOrderEntity> {
    const order = await this.orderRepository.findOrderById(id)
    if (!order) {
      throw this.exceptionsService.notFoundException({
        type: 'OrderNotFoundException',
        message: 'Không tìm thấy đơn hàng',
      })
    }

    const previousPayment = String(order.payment)
    await this.orderRepository.updateOrder({ id }, { payment })
    await this.redisService.delPattern('orders:*')

    const updated = await this.orderRepository.findOrderById(id)

    // Save Order History
    await this.historyRepository.createHistory({
      orderId: order.id,
      orderCode: order.orderCode,
      action: OrderHistoryActionEnum.PaymentChange,
      fromStatus: String(order.status),
      toStatus: String(order.status),
      fromPayment: previousPayment,
      toPayment: String(payment),
      title: `Cập nhật thanh toán: ${previousPayment} → ${payment}`,
      note:
        options?.note ||
        `Thanh toán đơn hàng chuyển sang ${payment} (${payment === PaymentStatusEnum.Paid ? 'Đã thanh toán' : payment === PaymentStatusEnum.Refunded ? 'Đã hoàn tiền' : 'Chưa thanh toán'}).`,
      actor: options?.actor || 'Staff/Admin',
      actorRole: options?.actorRole,
      metadata: {
        previousPayment,
        targetPayment: String(payment),
        total: Number(order.total),
      },
    })

    return updated!
  }
}


