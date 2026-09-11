import { Inject, Injectable } from '@nestjs/common'

import { DataSource } from 'typeorm'

import { BookstoreOrderEntity } from '@domain/entities/bookstore-order.entity'
import { CreateOrderInput } from '@domain/entities/bookstore-order.entity'
import {
  BookStatusEnum,
  OrderStatusEnum,
  PaymentStatusEnum,
  PromotionDiscountTypeEnum,
} from '@domain/entities/order-enums.entity'
import { OrderHistoryActionEnum } from '@domain/entities/order-history.entity'
import { StockMovementTypeEnum } from '@domain/entities/stock-movement.entity'
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

import { ActivityLog } from '@infrastructure/databases/postgresql/entities/activity-log.entity'
import { Book } from '@infrastructure/databases/postgresql/entities/book.entity'
import { BookstoreOrder } from '@infrastructure/databases/postgresql/entities/bookstore-order.entity'
import { Customer } from '@infrastructure/databases/postgresql/entities/customer.entity'
import { OrderHistory } from '@infrastructure/databases/postgresql/entities/order-history.entity'
import { Promotion } from '@infrastructure/databases/postgresql/entities/promotion.entity'
import { StockMovement } from '@infrastructure/databases/postgresql/entities/stock-movement.entity'

export { CreateOrderInput }

@Injectable()
export class CreateBookstoreOrderUseCase {
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

  async execute(dto: CreateOrderInput): Promise<BookstoreOrderEntity> {
    if (!dto.customerName || !dto.customerPhone) {
      throw this.exceptionsService.badRequestException({
        type: 'OrderValidationException',
        message: 'Tên và số điện thoại khách hàng là bắt buộc',
      })
    }

    if (!dto.items || dto.items.length === 0) {
      throw this.exceptionsService.badRequestException({
        type: 'OrderValidationException',
        message: 'Đơn hàng phải có ít nhất 1 sản phẩm',
      })
    }

    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      // 1. Check stock with pessimistic lock and prepare update
      for (const item of dto.items) {
        const bookIdNum =
          typeof item.bookId === 'number'
            ? item.bookId
            : parseInt(String(item.bookId), 10)
        if (isNaN(bookIdNum)) {
          throw this.exceptionsService.badRequestException({
            type: 'OrderValidationException',
            message: `Mã sách không hợp lệ: ${item.bookId}`,
          })
        }

        const book = await queryRunner.manager.findOne(Book, {
          where: { id: bookIdNum },
          lock: { mode: 'pessimistic_write' },
        })

        if (!book) {
          throw this.exceptionsService.notFoundException({
            type: 'BookNotFoundException',
            message: `Không tìm thấy sách với ID: ${bookIdNum}`,
          })
        }

        if (Number(book.stock) < item.quantity) {
          throw this.exceptionsService.badRequestException({
            type: 'OrderStockShortageException',
            message: `Sách "${book.title}" chỉ còn ${book.stock} cuốn trong kho, không đủ số lượng ${item.quantity}`,
          })
        }
      }

      // 2. Generate or use provided order code
      let orderCode = dto.orderCode?.trim()
      if (orderCode) {
        const existing = await queryRunner.manager.findOne(BookstoreOrder, {
          where: { orderCode },
        })
        if (existing) {
          const orderCount = await queryRunner.manager.count(BookstoreOrder)
          orderCode = `${orderCode}-${orderCount + 1}`
        }
      } else {
        const orderCount = await queryRunner.manager.count(BookstoreOrder)
        orderCode = `ORD-${2025000 + orderCount + 1}`
      }

      // 3. Decrement stock & record movements
      for (const item of dto.items) {
        const bookIdNum =
          typeof item.bookId === 'number'
            ? item.bookId
            : parseInt(String(item.bookId), 10)
        const book = await queryRunner.manager.findOne(Book, {
          where: { id: bookIdNum },
        })

        if (book) {
          const beforeStock = Number(book.stock)
          const afterStock = Math.max(0, beforeStock - item.quantity)
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
            type: StockMovementTypeEnum.Sale,
            quantity: -item.quantity,
            beforeStock,
            afterStock,
            referenceCode: orderCode,
            note: `Bán theo đơn: ${orderCode} (Khách: ${dto.customerName})`,
            createdBy: dto.actor || 'System/Order',
          })
          await queryRunner.manager.save(StockMovement, movement)
        }
      }

      const customer = dto.customerId
        ? await queryRunner.manager.findOne(Customer, {
            where: { id: dto.customerId },
          })
        : await queryRunner.manager.findOne(Customer, {
            where: { phone: dto.customerPhone },
          })
      const savedCustomer =
        customer ||
        (await queryRunner.manager.save(
          Customer,
          queryRunner.manager.create(Customer, {
            name: dto.customerName,
            phone: dto.customerPhone,
            address: dto.customerAddress,
          }),
        ))

      let promotion: Promotion | null = null
      if (dto.promotionCode) {
        promotion = await queryRunner.manager.findOne(Promotion, {
          where: { code: dto.promotionCode.toUpperCase(), isActive: true },
        })
        const now = new Date()
        if (
          !promotion ||
          promotion.startsAt > now ||
          promotion.endsAt < now ||
          (promotion.usageLimit !== null &&
            promotion.usageLimit !== undefined &&
            promotion.usedCount >= promotion.usageLimit)
        ) {
          throw this.exceptionsService.badRequestException({
            type: 'PromotionValidationException',
            message: 'Mã khuyến mãi không hợp lệ hoặc đã hết hạn',
          })
        }
      }

      // 4. Financial totals
      const subtotal = dto.items.reduce(
        (s, it) => s + it.price * it.quantity,
        0,
      )
      let discount = dto.discount || 0
      if (promotion && subtotal >= Number(promotion.minOrderValue)) {
        const promotionDiscount =
          promotion.discountType === PromotionDiscountTypeEnum.Percentage
            ? (subtotal * Number(promotion.discountValue)) / 100
            : Number(promotion.discountValue)
        discount +=
          promotion.maxDiscount !== null && promotion.maxDiscount !== undefined
            ? Math.min(promotionDiscount, Number(promotion.maxDiscount))
            : promotionDiscount
        promotion.usedCount += 1
        await queryRunner.manager.save(Promotion, promotion)
      }
      const shippingFee = dto.shippingFee || 0
      const total = Math.max(0, subtotal - discount + shippingFee)

      // 5. Determine status and payment:
      // When ordered at counter / POS, status defaults to 'DELIVERED' and payment to 'PAID'
      const isPos =
        dto.shippingMethod?.includes('POS') ||
        dto.shippingMethod?.includes('quầy') ||
        dto.status === OrderStatusEnum.Delivered

      const status =
        dto.status ||
        (isPos ? OrderStatusEnum.Delivered : OrderStatusEnum.Pending)
      const payment =
        dto.payment ||
        (isPos ? PaymentStatusEnum.Paid : PaymentStatusEnum.Unpaid)

      // 6. Save order
      const order = queryRunner.manager.create(BookstoreOrder, {
        orderCode,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerId: savedCustomer.id,
        customerAddress: dto.customerAddress,
        provinceId: dto.provinceId,
        districtId: dto.districtId,
        wardCode: dto.wardCode,
        items: dto.items,
        subtotal,
        discount,
        promotionId: promotion?.id,
        promotionCode: promotion?.code,
        shippingFee,
        total,
        payment,
        shippingMethod: dto.shippingMethod || 'Giao Hàng Nhanh (GHN)',
        trackingCode: dto.trackingCode,
        status,
        note: dto.note,
      })

      const savedOrder = await queryRunner.manager.save(BookstoreOrder, order)

      // 7. Save Order History
      const history = queryRunner.manager.create(OrderHistory, {
        orderId: savedOrder.id,
        orderCode: savedOrder.orderCode,
        action: OrderHistoryActionEnum.Created,
        toStatus: String(savedOrder.status),
        toPayment: String(savedOrder.payment),
        title: isPos ? 'Tạo đơn hàng tại quầy (POS)' : 'Tạo đơn hàng mới',
        note:
          dto.note ||
          `Đơn hàng mới tạo gồm ${dto.items.length} sản phẩm, tổng tiền: ${Number(savedOrder.total).toLocaleString('vi-VN')}đ`,
        actor: dto.actor || (isPos ? 'Bán tại quầy (POS)' : 'Staff/Admin'),
        actorRole: dto.actorRole,
        metadata: {
          itemsCount: dto.items.length,
          subtotal: Number(savedOrder.subtotal),
          discount: Number(savedOrder.discount),
          shippingFee: Number(savedOrder.shippingFee),
          total: Number(savedOrder.total),
          shippingMethod: savedOrder.shippingMethod,
          items: dto.items.map((i) => ({
            title: i.title,
            quantity: i.quantity,
            price: i.price,
          })),
        },
      })
      await queryRunner.manager.save(OrderHistory, history)

      savedCustomer.totalOrders += 1
      savedCustomer.totalSpent =
        Number(savedCustomer.totalSpent) + Number(savedOrder.total)
      savedCustomer.lastOrderAt = new Date()
      await queryRunner.manager.save(Customer, savedCustomer)
      await queryRunner.manager.save(
        ActivityLog,
        queryRunner.manager.create(ActivityLog, {
          actorName:
            dto.actor || (isPos ? 'Bán tại quầy (POS)' : 'Staff/Admin'),
          actorRole: dto.actorRole,
          action: 'CREATE',
          resourceType: 'BookstoreOrder',
          resourceId: String(savedOrder.id),
          description: `Tạo đơn hàng ${savedOrder.orderCode}`,
          metadata: {
            total: Number(savedOrder.total),
            customerId: savedCustomer.id,
          },
        }),
      )

      await queryRunner.commitTransaction()

      await this.redisService.delPattern('orders:*')
      await this.redisService.delPattern('books:*')

      return savedOrder
    } catch (err) {
      await queryRunner.rollbackTransaction()
      throw err
    } finally {
      await queryRunner.release()
    }
  }
}
