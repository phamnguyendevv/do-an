import { Inject, Injectable } from '@nestjs/common'

import { OrderHistoryEntity } from '@domain/entities/order-history.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  BOOKSTORE_ORDER_REPOSITORY,
  IBookstoreOrderRepositoryInterface,
} from '@domain/repositories/bookstore-order.repository.interface'
import {
  IOrderHistoryRepositoryInterface,
  ORDER_HISTORY_REPOSITORY,
} from '@domain/repositories/order-history.repository.interface'

@Injectable()
export class AddOrderHistoryNoteUseCase {
  constructor(
    @Inject(ORDER_HISTORY_REPOSITORY)
    private readonly historyRepository: IOrderHistoryRepositoryInterface,
    @Inject(BOOKSTORE_ORDER_REPOSITORY)
    private readonly orderRepository: IBookstoreOrderRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(
    identifier: string | number,
    note: string,
    actor: string = 'Staff',
    actorRole?: string,
  ): Promise<OrderHistoryEntity> {
    if (!note || !note.trim()) {
      throw this.exceptionsService.badRequestException({
        type: 'InvalidNoteException',
        message: 'Nội dung ghi chú không được để trống',
      })
    }

    const idNum =
      typeof identifier === 'number'
        ? identifier
        : parseInt(String(identifier), 10)

    let order = null
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

    return await this.historyRepository.createHistory({
      orderId: order.id,
      orderCode: order.orderCode,
      action: 'NOTE_ADDED',
      fromStatus: String(order.status),
      toStatus: String(order.status),
      fromPayment: String(order.payment),
      toPayment: String(order.payment),
      title: 'Thêm ghi chú xử lý nội bộ',
      note: note.trim(),
      actor,
      actorRole,
    })
  }
}
