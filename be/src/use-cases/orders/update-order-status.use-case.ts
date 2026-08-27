import { Inject, Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'

import { BookstoreOrderEntity } from '@domain/entities/bookstore-order.entity'
import {
  BookStatusEnum,
  OrderStatusEnum,
  PaymentStatusEnum,
} from '@domain/entities/order-enums.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  BOOK_REPOSITORY,
  IBookRepositoryInterface,
} from '@domain/repositories/book.repository.interface'
import {
  BOOKSTORE_ORDER_REPOSITORY,
  IBookstoreOrderRepositoryInterface,
} from '@domain/repositories/bookstore-order.repository.interface'
import {
  IRedisCacheService,
  REDIS_SERVICE,
} from '@domain/services/redis.interface'

import { Book } from '@infrastructure/databases/postgresql/entities/book.entity'
import { BookstoreOrder } from '@infrastructure/databases/postgresql/entities/bookstore-order.entity'
import { OrderHistory } from '@infrastructure/databases/postgresql/entities/order-history.entity'
import { StockMovement } from '@infrastructure/databases/postgresql/entities/stock-movement.entity'

const RESTOCK_STATUSES: string[] = [OrderStatusEnum.Cancelled, OrderStatusEnum.Returned]

@Injectable()
export class UpdateBookstoreOrderStatusUseCase {
  constructor(
    @Inject(BOOKSTORE_ORDER_REPOSITORY)
    private readonly orderRepository: IBookstoreOrderRepositoryInterface,
    @Inject(BOOK_REPOSITORY)
    private readonly bookRepository: IBookRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
    @Inject(REDIS_SERVICE)
    private readonly redisService: IRedisCacheService,
    private readonly dataSource: DataSource,
  ) {}

  async execute(
    id: number,
    nextStatus: OrderStatusEnum | string,
    options?: {
      actor?: string
      actorRole?: string
      note?: string
    },
  ): Promise<BookstoreOrderEntity> {
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const order = await queryRunner.manager.findOne(BookstoreOrder, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      })

      if (!order) {
        throw this.exceptionsService.notFoundException({
          type: 'OrderNotFoundException',
          message: 'Không tìm thấy đơn hàng',
        })
      }

      const previousStatus = String(order.status)
      const previousPayment = String(order.payment)
      const targetStatus = String(nextStatus)
      const shouldRestock =
        RESTOCK_STATUSES.includes(targetStatus) && !RESTOCK_STATUSES.includes(previousStatus)

      let nextPayment = order.payment
      if (
        (targetStatus === OrderStatusEnum.Delivered || targetStatus === 'DELIVERED') &&
        (order.payment === PaymentStatusEnum.Unpaid || order.payment === 'UNPAID')
      ) {
        nextPayment = PaymentStatusEnum.Paid
      } else if (
        (targetStatus === OrderStatusEnum.Returned || targetStatus === 'RETURNED') &&
        (order.payment === PaymentStatusEnum.Paid || order.payment === 'PAID')
      ) {
        nextPayment = PaymentStatusEnum.Refunded
      }

      // 1. Restock books if cancelled or returned
      if (shouldRestock && order.items && Array.isArray(order.items)) {
        for (const item of order.items) {
          const bookIdNum =
            typeof item.bookId === 'number' ? item.bookId : parseInt(String(item.bookId), 10)
          if (!isNaN(bookIdNum)) {
            const book = await queryRunner.manager.findOne(Book, {
              where: { id: bookIdNum },
              lock: { mode: 'pessimistic_write' },
            })
            if (book) {
              const beforeStock = Number(book.stock)
              const afterStock = beforeStock + item.quantity
              const newStatus =
                afterStock === 0
                  ? BookStatusEnum.OutOfStock
                  : afterStock <= book.minStock
                    ? BookStatusEnum.LowStock
                    : BookStatusEnum.InStock

              book.stock = afterStock
              book.status = newStatus
              await queryRunner.manager.save(Book, book)

              // Record stock movement
              const movement = queryRunner.manager.create(StockMovement, {
                bookId: book.id,
                bookTitle: book.title,
                type: 'RESTOCK',
                quantity: item.quantity,
                beforeStock,
                afterStock,
                referenceCode: order.orderCode,
                note: `Hoàn kho do ${targetStatus === OrderStatusEnum.Cancelled ? 'hủy đơn' : 'trả hàng'}: ${order.orderCode}`,
                createdBy: options?.actor || 'System/Order',
              })
              await queryRunner.manager.save(StockMovement, movement)
            }
          }
        }
      }

      // 2. Update order in database
      order.status = nextStatus
      order.payment = nextPayment
      const updatedOrder = await queryRunner.manager.save(BookstoreOrder, order)

      // 3. Record Order History
      const isCancelled = targetStatus === OrderStatusEnum.Cancelled || targetStatus === 'CANCELLED'
      const action = isCancelled ? 'CANCELLED' : 'STATUS_CHANGE'
      const title = isCancelled
        ? `Hủy đơn hàng: ${previousStatus} → CANCELLED`
        : `Chuyển trạng thái: ${previousStatus} → ${targetStatus}`

      const history = queryRunner.manager.create(OrderHistory, {
        orderId: order.id,
        orderCode: order.orderCode,
        action,
        fromStatus: previousStatus,
        toStatus: targetStatus,
        fromPayment: previousPayment,
        toPayment: String(nextPayment),
        title,
        note:
          options?.note ||
          (shouldRestock
            ? `Trạng thái chuyển sang ${targetStatus}. Đã tự động hoàn trả ${order.items?.length || 0} mục sách về tồn kho.`
            : `Cập nhật trạng thái đơn hàng thành công sang ${targetStatus}.`),
        actor: options?.actor || 'Staff/Admin',
        actorRole: options?.actorRole,
        metadata: {
          previousStatus,
          targetStatus,
          previousPayment,
          nextPayment: String(nextPayment),
          restocked: shouldRestock,
        },
      })
      await queryRunner.manager.save(OrderHistory, history)

      await queryRunner.commitTransaction()

      await this.redisService.delPattern('orders:*')
      if (shouldRestock) {
        await this.redisService.delPattern('books:*')
      }

      return updatedOrder
    } catch (err) {
      await queryRunner.rollbackTransaction()
      throw err
    } finally {
      await queryRunner.release()
    }
  }
}

