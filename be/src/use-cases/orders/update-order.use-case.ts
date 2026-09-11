import { Inject, Injectable } from '@nestjs/common'

import { BookstoreOrderEntity } from '@domain/entities/bookstore-order.entity'
import { OrderStatusEnum } from '@domain/entities/order-enums.entity'
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
export class UpdateBookstoreOrderUseCase {
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
    identifier: string | number,
    dto: {
      customerName?: string
      customerPhone?: string
      customerAddress?: string
      provinceId?: number
      districtId?: number
      wardCode?: string
      shippingFee?: number
      discount?: number
      note?: string
    },
    options?: {
      actor?: string
      actorRole?: string
    },
  ): Promise<BookstoreOrderEntity> {
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

    if (
      order.status !== OrderStatusEnum.Pending &&
      order.status !== 'PENDING'
    ) {
      throw this.exceptionsService.badRequestException({
        type: 'OrderUpdateForbiddenException',
        message:
          'Chỉ có thể chỉnh sửa đơn hàng ở trạng thái Chờ xử lý (PENDING)',
      })
    }

    const patch: Partial<BookstoreOrderEntity> = {}
    const changedFields: string[] = []

    if (
      dto.customerName !== undefined &&
      dto.customerName !== order.customerName
    ) {
      patch.customerName = dto.customerName
      changedFields.push(`Tên khách: "${dto.customerName}"`)
    }
    if (
      dto.customerPhone !== undefined &&
      dto.customerPhone !== order.customerPhone
    ) {
      patch.customerPhone = dto.customerPhone
      changedFields.push(`SĐT: "${dto.customerPhone}"`)
    }
    if (
      dto.customerAddress !== undefined &&
      dto.customerAddress !== order.customerAddress
    ) {
      patch.customerAddress = dto.customerAddress
      changedFields.push(`Địa chỉ: "${dto.customerAddress}"`)
    }
    if (dto.provinceId !== undefined) patch.provinceId = dto.provinceId
    if (dto.districtId !== undefined) patch.districtId = dto.districtId
    if (dto.wardCode !== undefined) patch.wardCode = dto.wardCode
    if (dto.note !== undefined && dto.note !== order.note) {
      patch.note = dto.note
      changedFields.push(`Ghi chú: "${dto.note}"`)
    }

    if (dto.shippingFee !== undefined || dto.discount !== undefined) {
      const shippingFee =
        dto.shippingFee !== undefined ? dto.shippingFee : order.shippingFee
      const discount =
        dto.discount !== undefined ? dto.discount : order.discount
      patch.shippingFee = shippingFee
      patch.discount = discount
      patch.total = Math.max(0, order.subtotal - discount + shippingFee)
      changedFields.push(
        `Tổng tiền mới: ${patch.total.toLocaleString('vi-VN')}đ`,
      )
    }

    await this.orderRepository.updateOrder({ id: order.id }, patch)
    await this.redisService.delPattern('orders:*')

    const updated = await this.orderRepository.findOrderById(order.id)

    // Save Order History
    await this.historyRepository.createHistory({
      orderId: order.id,
      orderCode: order.orderCode,
      action: 'UPDATED_INFO',
      fromStatus: String(order.status),
      toStatus: String(order.status),
      fromPayment: String(order.payment),
      toPayment: String(order.payment),
      title: 'Chỉnh sửa thông tin đơn hàng',
      note:
        changedFields.length > 0
          ? `Đã cập nhật: ${changedFields.join(', ')}`
          : 'Cập nhật lại thông tin đơn hàng.',
      actor: options?.actor || 'Staff/Admin',
      actorRole: options?.actorRole,
      metadata: {
        patch,
        changedFields,
      },
    })

    return updated!
  }
}
